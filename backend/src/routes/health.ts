import { Router, Request, Response } from 'express'
import { prisma } from '../lib/database.js'

export const healthRouter = Router()

// Basic health check
healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Detailed health check with database connectivity
healthRouter.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now()
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: {
        status: 'unknown',
        responseTime: 0,
        error: null as string | null,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + 'MB',
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' && typeof process.loadavg === 'function' ? process.loadavg() : null,
      },
    },
  }

  // Database connectivity check
  try {
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1 as health_check`
    const dbEndTime = Date.now()
    
    healthCheck.services.database = {
      status: 'healthy',
      responseTime: dbEndTime - dbStartTime,
      error: null,
    }
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
    healthCheck.status = 'degraded'
  }

  const responseTime = Date.now() - startTime
  
  // Set appropriate HTTP status code
  const statusCode = healthCheck.status === 'ok' ? 200 : 
                    healthCheck.status === 'degraded' ? 503 : 500

  res.status(statusCode).json({
    ...healthCheck,
    responseTime,
  })
})

// Database-only health check
healthRouter.get('/database', async (req: Request, res: Response) => {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1 as connectivity_check`
    
    // Test a simple query with actual data
    const userCount = await prisma.user.count()
    const orgCount = await prisma.organization.count()
    
    const responseTime = Date.now() - startTime
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connectivity: 'ok',
        responseTime,
        stats: {
          users: userCount,
          organizations: orgCount,
        },
      },
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connectivity: 'failed',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
    })
  }
})

// Readiness check (for Kubernetes/Docker health checks)
healthRouter.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service not ready',
    })
  }
})

// Liveness check (for Kubernetes/Docker health checks)
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

