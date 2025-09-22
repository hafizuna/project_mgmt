import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { z } from 'zod'

const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Missing or invalid JWT secrets:', parsed.error.flatten())
  process.exit(1)
}
const { JWT_SECRET, JWT_REFRESH_SECRET } = parsed.data

const SALT_ROUNDS = 12
const ACCESS_TOKEN_EXPIRES_IN = '24h' // Increased from 15m for better development experience
const REFRESH_TOKEN_EXPIRES_IN = '30d' // Increased from 7d for longer sessions

export interface JwtPayload {
  userId: string
  orgId: string
  role: string
  email: string
}

export class AuthUtils {
  // Password hashing
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // JWT tokens
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN })
  }

  static generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  }

  static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string }
  }

  // Utility to get token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  // Generate expiration date for refresh token
  static getRefreshTokenExpiration(): Date {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days from now
    return expiresAt
  }

  // Device info from request
  static getDeviceInfo(userAgent?: string): object {
    return {
      userAgent: userAgent || 'Unknown',
      timestamp: new Date().toISOString(),
    }
  }
}
