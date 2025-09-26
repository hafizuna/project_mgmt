import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock the database module
const mockPrisma = {
  $queryRaw: vi.fn(),
  user: {
    count: vi.fn(),
  },
  organization: {
    count: vi.fn(),
  },
}

vi.mock('../../lib/database.js', () => ({
  prisma: mockPrisma,
}))

describe('Health Routes', () => {
  let app: express.Application

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset modules to ensure clean import
    vi.resetModules()
    
    // Setup Express app with health routes
    app = express()
    
    // Import health router after mocking
    const { healthRouter } = await import('../health.js')
    app.use('/health', healthRouter)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      })

      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
      expect(response.body.uptime).toBeGreaterThan(0)
    })
  })

  describe('GET /health/detailed', () => {
    it('should return detailed health status when database is healthy', async () => {
      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ health_check: 1 }])

      const response = await request(app)
        .get('/health/detailed')
        .timeout(10000)
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        services: {
          database: {
            status: 'healthy',
            responseTime: expect.any(Number),
            error: null,
          },
          memory: {
            used: expect.any(String),
            total: expect.any(String),
            external: expect.any(String),
          },
          cpu: {
            usage: expect.any(Object),
          },
        },
        responseTime: expect.any(Number),
      })

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1 as health_check'])
      
      // CPU loadAverage should be either null or an array
      const loadAverage = response.body.services.cpu.loadAverage
      expect(loadAverage === null || Array.isArray(loadAverage)).toBe(true)
    })

    it('should return degraded status when database is unhealthy', async () => {
      // Mock database error
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await request(app)
        .get('/health/detailed')
        .timeout(10000)
        .expect(503)

      expect(response.body).toMatchObject({
        status: 'degraded',
        services: {
          database: {
            status: 'unhealthy',
            responseTime: expect.any(Number),
            error: 'Database connection failed',
          },
        },
      })
    })
  })

  describe('GET /health/database', () => {
    it('should return healthy database status', async () => {
      // Mock successful database queries
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ connectivity_check: 1 }])
      mockPrisma.user.count.mockResolvedValueOnce(5)
      mockPrisma.organization.count.mockResolvedValueOnce(2)

      const response = await request(app)
        .get('/health/database')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        database: {
          connectivity: 'ok',
          responseTime: expect.any(Number),
          stats: {
            users: 5,
            organizations: 2,
          },
        },
      })

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1 as connectivity_check'])
      expect(mockPrisma.user.count).toHaveBeenCalled()
      expect(mockPrisma.organization.count).toHaveBeenCalled()
    })

    it('should return unhealthy status when database query fails', async () => {
      // Mock database error
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection timeout'))

      const response = await request(app)
        .get('/health/database')
        .expect(503)

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        database: {
          connectivity: 'failed',
          responseTime: expect.any(Number),
          error: 'Connection timeout',
        },
      })
    })
  })

  describe('GET /health/ready', () => {
    it('should return ready status when database is accessible', async () => {
      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }])

      const response = await request(app)
        .get('/health/ready')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String),
      })

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(['SELECT 1'])
    })

    it('should return not ready status when database is not accessible', async () => {
      // Mock database error
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database not available'))

      const response = await request(app)
        .get('/health/ready')
        .expect(503)

      expect(response.body).toMatchObject({
        status: 'not ready',
        timestamp: expect.any(String),
        error: 'Database not available',
      })
    })
  })

  describe('GET /health/live', () => {
    it('should always return alive status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      })

      // Should not call database at all for liveness check
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
    })
  })

  describe('Response times', () => {
    it('should measure and return response times', async () => {
      // Mock a slow database response
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ health_check: 1 }]), 50))
      )

      const response = await request(app)
        .get('/health/detailed')
        .timeout(10000)
        .expect(200)

      expect(response.body.services.database.responseTime).toBeGreaterThan(40)
      expect(response.body.responseTime).toBeGreaterThan(40)
    })
  })
})