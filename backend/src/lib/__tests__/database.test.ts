import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PrismaClient before importing
const mockPrismaClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
}

// Mock the PrismaClient constructor
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}))

describe('Database Service', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Clear module cache to ensure fresh imports
    vi.resetModules()
    
    // Clear any global instance
    if (globalThis.__prisma) {
      delete globalThis.__prisma
    }
  })

  afterEach(() => {
    // Clean up any global instances
    if (globalThis.__prisma) {
      delete globalThis.__prisma
    }
  })

  it('should create a singleton PrismaClient instance', async () => {
    const { prisma } = await import('../database.js')
    const { prisma: prisma2 } = await import('../database.js')

    expect(prisma).toBe(prisma2)
    expect(prisma).toBeDefined()
  })

  it('should create only one PrismaClient instance across multiple imports', async () => {
    const { PrismaClient } = await import('@prisma/client')
    
    // Import multiple times
    await import('../database.js')
    await import('../database.js')
    await import('../database.js')

    // PrismaClient constructor should only be called once
    expect(PrismaClient).toHaveBeenCalledTimes(1)
  })

  it('should connect to database on first access', async () => {
    const { prisma } = await import('../database.js')
    
    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1)
  })

  it('should reuse the same instance in development mode with global storage', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    try {
      // First import creates instance and stores it globally
      const { prisma: firstPrisma } = await import('../database.js')
      
      // Simulate what would happen with hot reload - set global instance
      globalThis.__prisma = firstPrisma
      
      // Clear module cache to simulate hot reload
      vi.resetModules()
      
      // Second import should reuse global instance
      const { prisma: secondPrisma } = await import('../database.js')
      
      expect(firstPrisma).toBe(secondPrisma)
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('should not store global instance in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    try {
      await import('../database.js')
      
      // In production, should not store global instance
      expect(globalThis.__prisma).toBeUndefined()
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('should configure PrismaClient with correct options', async () => {
    const { PrismaClient } = await import('@prisma/client')
    
    await import('../database.js')
    
    expect(PrismaClient).toHaveBeenCalledWith({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn']
        : ['error'],
      errorFormat: 'pretty',
    })
  })

  it('should provide DatabaseService methods', async () => {
    const { DatabaseService } = await import('../database.js')
    
    expect(DatabaseService.getInstance).toBeDefined()
    expect(DatabaseService.disconnect).toBeDefined()
    expect(DatabaseService.reset).toBeDefined()
  })

  it('should disconnect database when calling DatabaseService.disconnect()', async () => {
    const { DatabaseService } = await import('../database.js')
    
    await DatabaseService.disconnect()
    
    expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1)
  })

  it('should reset instance when calling DatabaseService.reset()', async () => {
    const { DatabaseService, prisma } = await import('../database.js')
    
    // Verify we have an instance
    expect(prisma).toBeDefined()
    
    // Reset the instance
    DatabaseService.reset()
    
    // Clear modules to force new import
    vi.resetModules()
    
    // Import again should create a new instance
    const { PrismaClient } = await import('@prisma/client')
    await import('../database.js')
    
    // Should have been called twice now (once before reset, once after)
    expect(PrismaClient).toHaveBeenCalledTimes(2)
  })

  it('should not add process handlers in test environment', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    
    const mockOn = vi.spyOn(process, 'on')
    
    try {
      // Import the database service in test environment
      await import('../database.js')
      
      // Should not add signal handlers in test environment
      const sigintHandler = mockOn.mock.calls.find(call => call[0] === 'SIGINT')
      const sigtermHandler = mockOn.mock.calls.find(call => call[0] === 'SIGTERM')
      const beforeExitHandler = mockOn.mock.calls.find(call => call[0] === 'beforeExit')
      
      expect(sigintHandler).toBeUndefined()
      expect(sigtermHandler).toBeUndefined()
      expect(beforeExitHandler).toBeUndefined()
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      mockOn.mockRestore()
    }
  })

  it('should add process handlers in non-test environment', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    const mockOn = vi.spyOn(process, 'on')
    
    try {
      // Import the database service in production environment
      await import('../database.js')
      
      // Should add signal handlers in non-test environment
      const sigintHandler = mockOn.mock.calls.find(call => call[0] === 'SIGINT')?.[1]
      const sigtermHandler = mockOn.mock.calls.find(call => call[0] === 'SIGTERM')?.[1]
      const beforeExitHandler = mockOn.mock.calls.find(call => call[0] === 'beforeExit')?.[1]
      
      expect(sigintHandler).toBeDefined()
      expect(sigtermHandler).toBeDefined()
      expect(beforeExitHandler).toBeDefined()
      
      // Test beforeExit handler
      if (beforeExitHandler) {
        await beforeExitHandler()
        expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
      }
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      mockExit.mockRestore()
      mockOn.mockRestore()
    }
  })
})