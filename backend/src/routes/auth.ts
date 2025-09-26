import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { AuthUtils } from '../lib/auth.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role).optional().default('Team'),
  orgId: z.string().uuid('Invalid organization ID'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

/**
 * POST /auth/login
 * Authenticate user and return access + refresh tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { org: { select: { id: true, name: true } } }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' })
    }

    // Verify password
    const isValidPassword = await AuthUtils.verifyPassword(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate tokens
    const jwtPayload = {
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
    }

    const accessToken = AuthUtils.generateAccessToken(jwtPayload)
    const refreshToken = AuthUtils.generateRefreshToken({ userId: user.id })

    // Store refresh token in database
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: AuthUtils.getDeviceInfo(req.headers['user-agent']),
        expiresAt: AuthUtils.getRefreshTokenExpiration(),
      }
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Log login action
    await AuditLogger.logAuthAction(req, user.id, user.orgId, AUDIT_ACTIONS.USER_LOGIN)

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        org: user.org,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /auth/register
 * Register a new user (Admin only for invites)
 */
router.post('/register', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { email, name, password, role, orgId } = registerSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org) {
      return res.status(400).json({ error: 'Organization not found' })
    }

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        org: { select: { id: true, name: true } }
      }
    })

    // Log user creation
    await AuditLogger.logUserAction(
      req, 
      req.user!.userId, 
      req.user!.orgId, 
      AUDIT_ACTIONS.USER_CREATED, 
      user.id,
      { createdUserRole: user.role }
    )

    res.status(201).json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)

    // Verify refresh token
    const payload = AuthUtils.verifyRefreshToken(refreshToken)

    // Check if session exists and is valid
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            orgId: true,
            isActive: true,
          }
        }
      }
    })

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    // Generate new access token
    const jwtPayload = {
      userId: session.user.id,
      orgId: session.user.orgId,
      role: session.user.role,
      email: session.user.email,
    }

    const accessToken = AuthUtils.generateAccessToken(jwtPayload)

    res.json({ accessToken })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Token refresh error:', error)
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

/**
 * POST /auth/logout
 * Invalidate refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)

    // Get user info before deleting session for audit log
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: { select: { id: true, orgId: true } } }
    })

    // Delete the session
    await prisma.userSession.deleteMany({
      where: { refreshToken }
    })

    // Log logout action if session was found
    if (session) {
      await AuditLogger.logAuthAction(
        req, 
        session.user.id, 
        session.user.orgId, 
        AUDIT_ACTIONS.USER_LOGOUT
      )
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        org: { select: { id: true, name: true, slug: true } }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /auth/me
 * Update current user profile
 */
router.put('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').optional(),
      avatar: z.string().url('Invalid avatar URL').or(z.literal('')).optional(),
    })

    const updates = updateSchema.parse(req.body)
    
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        org: { select: { id: true, name: true, slug: true } }
      }
    })

    res.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as authRouter }
