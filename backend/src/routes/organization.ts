import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const updateOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
  settings: z.object({
    // Project settings
    allowProjectCreation: z.boolean().optional(),
    maxProjectMembers: z.number().min(1).max(100).optional(),
    
    // Task settings
    defaultTaskPriority: z.enum(['Low', 'Medium', 'High']).optional(),
    requireTaskDescription: z.boolean().optional(),
    
    // Legacy settings (for future use)
    timezone: z.string().optional(),
    dateFormat: z.string().optional(),
    workingDays: z.array(z.number().min(0).max(6)).optional(),
    workingHours: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    notifications: z.object({
      emailEnabled: z.boolean().optional(),
      digestFrequency: z.enum(['daily', 'weekly', 'never']).optional(),
      mentionNotifications: z.boolean().optional(),
      deadlineReminders: z.boolean().optional(),
    }).optional(),
    security: z.object({
      passwordMinLength: z.number().min(6).max(50).optional(),
      sessionTimeout: z.number().min(15).max(1440).optional(), // minutes
      requirePasswordChange: z.boolean().optional(),
    }).optional(),
  }).optional(),
})

/**
 * GET /organization
 * Get current organization details and settings
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user!.orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: { where: { isActive: true } },
            projects: { where: { status: 'Active' } },
          }
        }
      },
    })

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    // Get additional stats
    const stats = await prisma.user.groupBy({
      by: ['role'],
      where: { 
        orgId: req.user!.orgId,
        isActive: true 
      },
      _count: { role: true },
    })

    const roleStats = {
      Admin: 0,
      Manager: 0,
      Team: 0,
    }

    stats.forEach(stat => {
      roleStats[stat.role as keyof typeof roleStats] = stat._count.role
    })

    res.json({
      organization: {
        ...organization,
        stats: {
          totalUsers: organization._count.users,
          activeProjects: organization._count.projects,
          roleDistribution: roleStats,
        }
      }
    })
  } catch (error) {
    console.error('Get organization error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /organization
 * Update organization settings (Admin only)
 */
router.put('/', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const updates = updateOrgSchema.parse(req.body)

    // If updating settings, merge with existing settings
    let settingsUpdate = updates.settings
    if (settingsUpdate) {
      const currentOrg = await prisma.organization.findUnique({
        where: { id: req.user!.orgId },
        select: { settings: true }
      })

      if (currentOrg?.settings) {
        // Deep merge existing settings with new settings
        settingsUpdate = {
          ...currentOrg.settings as any,
          ...settingsUpdate,
        }
      }
    }

    const organization = await prisma.organization.update({
      where: { id: req.user!.orgId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(settingsUpdate && { settings: settingsUpdate }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        updatedAt: true,
      },
    })

    // Log organization settings update
    await AuditLogger.logOrgAction(
      req,
      req.user!.userId,
      req.user!.orgId,
      AUDIT_ACTIONS.ORG_SETTINGS_UPDATED,
      { updatedFields: Object.keys(updates) }
    )

    res.json({ organization })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update organization error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /organization/usage
 * Get organization usage statistics (Admin only)
 */
router.get('/usage', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId

    // Get counts for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalUsers,
      activeUsers,
      totalProjects,
      totalTasks,
      recentTasks,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count({
        where: { orgId, isActive: true }
      }),
      prisma.user.count({
        where: { 
          orgId, 
          isActive: true,
          lastLoginAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.project.count({
        where: { orgId }
      }),
      prisma.task.count({
        where: { project: { orgId } }
      }),
      prisma.task.count({
        where: { 
          project: { orgId },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.project.count({
        where: { 
          orgId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
    ])

    // Get task status distribution
    const taskStatusStats = await prisma.task.groupBy({
      by: ['status'],
      where: { project: { orgId } },
      _count: { status: true },
    })

    const taskStatusDistribution = taskStatusStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    // Get project status distribution
    const projectStatusStats = await prisma.project.groupBy({
      by: ['status'],
      where: { orgId },
      _count: { status: true },
    })

    const projectStatusDistribution = projectStatusStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    res.json({
      usage: {
        totalUsers,
        activeProjects: projectStatusDistribution.Active || 0,
        totalProjects,
        openTasks: (taskStatusDistribution.Todo || 0) + (taskStatusDistribution['In Progress'] || 0),
        totalTasks,
        
        // Additional details
        users: {
          total: totalUsers,
          active: activeUsers,
          activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        },
        projects: {
          total: totalProjects,
          recent: recentProjects,
          statusDistribution: projectStatusDistribution,
        },
        tasks: {
          total: totalTasks,
          recent: recentTasks,
          statusDistribution: taskStatusDistribution,
        },
        period: {
          days: 30,
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString(),
        }
      }
    })
  } catch (error) {
    console.error('Get organization usage error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /organization/invite
 * Generate organization invite link (Admin only)
 */
router.post('/invite', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { expiresInDays = 7 } = req.body

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // In a real app, you'd generate a secure token and store it
    // For now, we'll just return a mock invite link
    const inviteToken = `org_invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    res.json({
      inviteLink: `${process.env.APP_BASE_URL}/invite/${inviteToken}`,
      expiresAt: expiresAt.toISOString(),
      expiresInDays,
    })
  } catch (error) {
    console.error('Generate invite error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as organizationRouter }
