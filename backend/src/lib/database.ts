import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

class DatabaseService {
  private static instance: PrismaClient

  public static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      // In development, use global variable to prevent hot reload issues
      if (process.env.NODE_ENV === 'development' && globalThis.__prisma) {
        DatabaseService.instance = globalThis.__prisma
      } else {
        DatabaseService.instance = new PrismaClient({
          log: process.env.NODE_ENV === 'development' 
            ? ['query', 'error', 'warn']
            : ['error'],
          errorFormat: 'pretty',
        })

        // Enable connection pooling optimizations
        DatabaseService.instance.$connect()

        // Store in global for development hot reload
        if (process.env.NODE_ENV === 'development') {
          globalThis.__prisma = DatabaseService.instance
        }

        // Graceful shutdown - only add handlers if not in test environment
        if (process.env.NODE_ENV !== 'test') {
          process.on('beforeExit', async () => {
            await DatabaseService.instance.$disconnect()
          })

          process.on('SIGINT', async () => {
            await DatabaseService.instance.$disconnect()
            process.exit(0)
          })

          process.on('SIGTERM', async () => {
            await DatabaseService.instance.$disconnect()
            process.exit(0)
          })
        }
      }
    }

    return DatabaseService.instance
  }

  /**
   * Disconnect from database
   * Mainly used for testing cleanup
   */
  public static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect()
    }
  }

  /**
   * Reset the instance (mainly for testing)
   */
  public static reset(): void {
    DatabaseService.instance = null as any
    if (globalThis.__prisma) {
      globalThis.__prisma = undefined
    }
  }
}

// Export the singleton instance getter
export const prisma = DatabaseService.getInstance()

// Export the class for testing purposes
export { DatabaseService }