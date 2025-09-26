import { Request, Response, NextFunction } from 'express'
import { AuthUtils, JwtPayload } from '../lib/auth.js'
import { prisma } from '../lib/database.js'

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Middleware to verify JWT token and attach user info to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization)
    
    if (!token) {
      throw new AuthError('No token provided')
    }

    // Verify the JWT token
    const payload = AuthUtils.verifyAccessToken(token)
    
    // Optional: Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, role: true }
    })

    if (!user || !user.isActive) {
      throw new AuthError('User not found or inactive')
    }

    // Attach user info to request
    req.user = payload
    next()
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    
    // JWT verification errors
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Middleware to check if user has required role(s)
 * Usage: requireRole(['Admin', 'Manager'])
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      })
    }

    next()
  }
}

/**
 * Optional middleware - attaches user if token is present, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization)
    
    if (token) {
      const payload = AuthUtils.verifyAccessToken(token)
      req.user = payload
    }
  } catch (error) {
    // Silently ignore errors for optional auth
  }
  
  next()
}
