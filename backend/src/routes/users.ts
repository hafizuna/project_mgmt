import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { AuthUtils } from '../lib/auth.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role),
})

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
})

/**
 * GET /users
 * List users with pagination, search, and filtering
 */
router.get('/', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    console.log('GET /users - req.query:', req.query)
    console.log('GET /users - req.user.orgId:', req.user!.orgId)
    
    const { page, limit, search, role, isActive } = querySchema.parse(req.query)
    const skip = (page - 1) * limit
    
    console.log('Parsed filters:', { page, limit, search, role, isActive })

    // Build where clause for filtering
    const where: any = {
      orgId: req.user!.orgId, // Only users from same organization
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    console.log('Final where clause:', JSON.stringify(where, null, 2))

    // Get users and total count
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          avatar: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('List users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /users/organization
 * Get all users in the current user's organization (for adding to projects, etc.)
 * Available to all authenticated users
 */
router.get('/organization', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('🔍 GET /users/organization called by user:', req.user?.userId, 'orgId:', req.user?.orgId, 'role:', req.user?.role)
    
    const users = await prisma.user.findMany({
      where: {
        orgId: req.user!.orgId,
        isActive: true // Only active users
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
      orderBy: { name: 'asc' },
    })

    console.log('📄 Found', users.length, 'organization users:', users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })))
    res.json({ users })
  } catch (error) {
    console.error('Get organization users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /users/:id
 * Get a specific user by ID
 */
router.get('/:id', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { 
        id,
        orgId: req.user!.orgId, // Ensure same organization
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        org: { select: { id: true, name: true, slug: true } },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          where: { status: 'Active' },
          take: 5,
        },
        sessions: {
          select: {
            id: true,
            deviceInfo: true,
            createdAt: true,
            expiresAt: true,
          },
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
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
 * POST /users
 * Create a new user (Admin only)
 */
router.post('/', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { email, name, password, role } = createUserSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(password)

    // Create user in the same organization as the admin
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        orgId: req.user!.orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        org: { select: { id: true, name: true } },
      },
    })

    // Log user creation
    await AuditLogger.logUserAction(
      req, 
      req.user!.userId, 
      req.user!.orgId, 
      AUDIT_ACTIONS.USER_CREATED, 
      user.id,
      { createdUserRole: user.role, createdUserEmail: user.email }
    )

    res.status(201).json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /users/:id
 * Update a user (Admin only)
 */
router.put('/:id', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = updateUserSchema.parse(req.body)

    // Check if user exists in same organization
    const existingUser = await prisma.user.findUnique({
      where: { 
        id,
        orgId: req.user!.orgId,
      },
    })

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent admin from deactivating themselves
    if (id === req.user!.userId && updates.isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' })
    }

    // Check email uniqueness if email is being updated
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: updates.email } })
      if (emailExists) {
        return res.status(409).json({ error: 'Email is already in use' })
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        org: { select: { id: true, name: true } },
      },
    })

    // Log audit events for specific changes
    if (updates.role && updates.role !== existingUser.role) {
      await AuditLogger.logUserAction(
        req, 
        req.user!.userId, 
        req.user!.orgId, 
        AUDIT_ACTIONS.USER_ROLE_CHANGED, 
        user.id,
        { previousRole: existingUser.role, newRole: updates.role }
      )
    }
    
    if (updates.isActive !== undefined && updates.isActive !== existingUser.isActive) {
      await AuditLogger.logUserAction(
        req, 
        req.user!.userId, 
        req.user!.orgId, 
        AUDIT_ACTIONS.USER_STATUS_CHANGED, 
        user.id,
        { previousStatus: existingUser.isActive, newStatus: updates.isActive }
      )
    }
    
    // General update log if other fields changed
    if (updates.name || updates.email) {
      await AuditLogger.logUserAction(
        req, 
        req.user!.userId, 
        req.user!.orgId, 
        AUDIT_ACTIONS.USER_UPDATED, 
        user.id,
        { updatedFields: Object.keys(updates) }
      )
    }

    res.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /users/:id
 * Deactivate a user (Admin only) - We don't actually delete, just deactivate
 */
router.delete('/:id', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if user exists in same organization
    const existingUser = await prisma.user.findUnique({
      where: { 
        id,
        orgId: req.user!.orgId,
      },
    })

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent admin from deactivating themselves
    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' })
    }

    // Deactivate user and invalidate all their sessions
    await Promise.all([
      prisma.user.update({
        where: { id },
        data: { isActive: false },
      }),
      prisma.userSession.deleteMany({
        where: { userId: id },
      }),
    ])

    // Log user deactivation
    await AuditLogger.logUserAction(
      req, 
      req.user!.userId, 
      req.user!.orgId, 
      AUDIT_ACTIONS.USER_STATUS_CHANGED, 
      id,
      { action: 'deactivated', reason: 'admin_action' }
    )

    res.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Deactivate user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /users/:id/reactivate
 * Reactivate a deactivated user (Admin only)
 */
router.post('/:id/reactivate', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.user.update({
      where: { 
        id,
        orgId: req.user!.orgId,
      },
      data: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        updatedAt: true,
      },
    })

    // Log user reactivation
    await AuditLogger.logUserAction(
      req, 
      req.user!.userId, 
      req.user!.orgId, 
      AUDIT_ACTIONS.USER_STATUS_CHANGED, 
      id,
      { action: 'reactivated', reason: 'admin_action' }
    )

    res.json({ user, message: 'User reactivated successfully' })
  } catch (error) {
    console.error('Reactivate user error:', error)
    res.status(404).json({ error: 'User not found' })
  }
})

export { router as usersRouter }
