import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role, ProjectStatus, ProjectPriority, ProjectMemberRole, NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'
import { NotificationService } from '../services/NotificationService.js'

const router = Router()
const notificationService = NotificationService.getInstance()

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(), // Frontend sends endDate
  dueDate: z.string().datetime().optional(), // Keep for backward compatibility
  budget: z.number().min(0, 'Budget must be positive').optional(),
  settings: z.record(z.any()).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(ProjectPriority).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(), // Frontend sends endDate
  dueDate: z.string().datetime().optional(), // Keep for backward compatibility
  budget: z.number().min(0, 'Budget must be positive').optional(),
  settings: z.record(z.any()).optional(),
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional().transform(val => val === '' ? undefined : val), // Handle empty search
  status: z.string().optional(), // Accept frontend enum strings
  priority: z.string().optional(), // Accept frontend enum strings  
  ownerId: z.string().optional(),
})

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.nativeEnum(ProjectMemberRole).optional().default('Member'),
})

const updateMemberSchema = z.object({
  role: z.nativeEnum(ProjectMemberRole),
})

// Transform functions for frontend compatibility
const mapProjectStatusToFrontend = (status: ProjectStatus): string => {
  const statusMap = {
    [ProjectStatus.Active]: 'IN_PROGRESS',
    [ProjectStatus.Completed]: 'COMPLETED', 
    [ProjectStatus.Archived]: 'CANCELLED',
    [ProjectStatus.OnHold]: 'ON_HOLD'
  }
  return statusMap[status] || status
}

const mapProjectPriorityToFrontend = (priority: ProjectPriority): string => {
  return priority.toUpperCase()
}

const transformProjectForFrontend = (project: any) => ({
  ...project,
  status: mapProjectStatusToFrontend(project.status),
  priority: mapProjectPriorityToFrontend(project.priority),
  endDate: project.dueDate, // Map dueDate to endDate for frontend
})

// Reverse transformation for frontend to backend
const mapFrontendStatusToBackend = (status: string): ProjectStatus => {
  const statusMap: Record<string, ProjectStatus> = {
    'PLANNING': ProjectStatus.Active,
    'IN_PROGRESS': ProjectStatus.Active, 
    'ON_HOLD': ProjectStatus.OnHold,
    'COMPLETED': ProjectStatus.Completed,
    'CANCELLED': ProjectStatus.Archived,
    // Handle direct backend enum values as well
    'Active': ProjectStatus.Active,
    'Completed': ProjectStatus.Completed,
    'Archived': ProjectStatus.Archived,
    'OnHold': ProjectStatus.OnHold
  }
  return statusMap[status] || ProjectStatus.Active
}

const mapFrontendPriorityToBackend = (priority: string): ProjectPriority => {
  const priorityMap: Record<string, ProjectPriority> = {
    'LOW': ProjectPriority.Low,
    'MEDIUM': ProjectPriority.Medium,
    'HIGH': ProjectPriority.High,
    'CRITICAL': ProjectPriority.Critical,
    // Handle direct backend enum values as well
    'Low': ProjectPriority.Low,
    'Medium': ProjectPriority.Medium,
    'High': ProjectPriority.High,
    'Critical': ProjectPriority.Critical
  }
  return priorityMap[priority] || ProjectPriority.Medium
}

// Helper function to check if user has access to project
async function checkProjectAccess(
  userId: string, 
  orgId: string, 
  projectId: string, 
  requiredAccess: 'read' | 'write' | 'admin'
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user) throw new Error('User not found')

  // Admin has full access to all org projects
  if (user.role === Role.Admin) return true

  // Get project with membership info
  const project = await prisma.project.findUnique({
    where: { 
      id: projectId,
      orgId: orgId 
    },
    include: {
      members: {
        where: { userId: userId },
        select: { role: true }
      }
    }
  })

  if (!project) return false

  // Project owner has full access
  if (project.ownerId === userId) return true

  // Check membership access
  const membership = project.members[0]
  if (!membership) return false

  // Read access: any member can read
  if (requiredAccess === 'read') return true

  // Write access: Manager role users + project managers/owners
  if (requiredAccess === 'write') {
    return user.role === Role.Manager || membership.role === ProjectMemberRole.Manager
  }

  // Admin access: only project owners (admins already handled above)
  if (requiredAccess === 'admin') {
    return project.ownerId === userId
  }

  return false
}

/**
 * GET /projects
 * List projects with pagination, search, and filtering
 * Role access: All authenticated users see projects they have access to
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status, priority, ownerId } = querySchema.parse(req.query)
    const skip = (page - 1) * limit

    // Build where clause based on user role
    const userId = req.user!.userId
    const orgId = req.user!.orgId
    const userRole = req.user!.role

    let where: any = {
      orgId: orgId,
    }

    // Admin sees all org projects
    // Manager and Team see projects they own or are members of
    if (userRole !== Role.Admin) {
      where.OR = [
        { ownerId: userId }, // Projects they own
        { 
          members: {
            some: { userId: userId }
          }
        }, // Projects they're members of
      ]
    }

    // Apply filters
    if (search) {
      const searchCondition = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }
      
      where = where.OR ? {
        AND: [where, searchCondition]
      } : {
        ...where,
        ...searchCondition
      }
    }

    if (status) {
      // Transform frontend status to backend status
      where.status = mapFrontendStatusToBackend(status)
    }

    if (priority) {
      // Transform frontend priority to backend priority
      where.priority = mapFrontendPriorityToBackend(priority)
    }

    if (ownerId) {
      where.ownerId = ownerId
    }

    // Get projects and total count
    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          priority: true,
          startDate: true,
          dueDate: true,
          budget: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
          members: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                }
              }
            }
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Transform projects for frontend compatibility
    const transformedProjects = projects.map(transformProjectForFrontend)

    res.json({
      projects: transformedProjects,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('List projects error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /projects/:id
 * Get a specific project by ID
 * Role access: Users with read access to the project
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check access
    const hasAccess = await checkProjectAccess(userId, orgId, id, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const project = await prisma.project.findUnique({
      where: { 
        id,
        orgId: orgId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignee: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            dueDate: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { updatedAt: 'desc' }
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          }
        }
      },
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const transformedProject = transformProjectForFrontend(project)
    res.json({ project: transformedProject })
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /projects
 * Create a new project
 * Role access: Admin (any project), Manager (can create projects they'll own)
 */
router.post('/', authenticate, requireRole(['Admin', 'Manager', 'Team']), async (req: Request, res: Response) => {
  try {
    // Transform frontend data to backend format
    const transformedBody = {
      ...req.body,
      status: req.body.status ? mapFrontendStatusToBackend(req.body.status) : undefined,
      priority: req.body.priority ? mapFrontendPriorityToBackend(req.body.priority) : undefined,
      startDate: req.body.startDate ? `${req.body.startDate}T00:00:00.000Z` : undefined,
      endDate: req.body.endDate ? `${req.body.endDate}T23:59:59.999Z` : undefined
    }
    
    const data = createProjectSchema.parse(transformedBody)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Destructure to exclude fields that need special handling
    const { endDate, dueDate, startDate, ...restData } = data
    
    const project = await prisma.project.create({
      data: {
        ...restData,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: (endDate || dueDate) ? new Date(endDate || dueDate!) : null,
        ownerId: userId,
        orgId: orgId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          }
        }
      },
    })

    // Log project creation
    await AuditLogger.logProjectAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.PROJECT_CREATED,
      project.id,
      { projectName: project.name, projectStatus: project.status }
    )

    // Send project creation notifications
    try {
      // Get all organization members (excluding project creator)
      const orgMembers = await prisma.user.findMany({
        where: {
          orgId,
          id: { not: userId },
          role: { in: [Role.Admin, Role.Manager] } // Only notify managers and admins about new projects
        },
        select: { id: true }
      })

      // Notify organization managers and admins about new project
      for (const member of orgMembers) {
        await notificationService.createNotification({
          userId: member.id,
          orgId,
          type: NotificationType.PROJECT_CREATED,
          category: NotificationCategory.PROJECT,
          title: `New project created: ${project.name}`,
          message: `${project.owner.name} created a new project "${project.name}"`,
          data: {
            projectId: project.id,
            ownerId: project.ownerId,
            priority: project.priority,
            dueDate: project.dueDate
          },
          entityType: 'Project',
          entityId: project.id,
          priority: project.priority === 'Critical' ? NotificationPriority.Medium : NotificationPriority.Low
        })
      }
    } catch (notificationError) {
      console.error('Failed to send project creation notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    const transformedProject = transformProjectForFrontend(project)
    res.status(201).json({ project: transformedProject })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Project validation failed:', error.errors)
      console.error('Request body was:', req.body)
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /projects/:id
 * Update a project
 * Role access: Admin (any project), Project owner, Project managers
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Transform frontend data to backend format
    const transformedBody = {
      ...req.body,
      status: req.body.status ? mapFrontendStatusToBackend(req.body.status) : undefined,
      priority: req.body.priority ? mapFrontendPriorityToBackend(req.body.priority) : undefined,
      startDate: req.body.startDate ? `${req.body.startDate}T00:00:00.000Z` : undefined,
      endDate: req.body.endDate ? `${req.body.endDate}T23:59:59.999Z` : undefined
    }
    
    const updates = updateProjectSchema.parse(transformedBody)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check write access
    const hasAccess = await checkProjectAccess(userId, orgId, id, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to update this project' })
    }

    // Get existing project for audit logging
    const existingProject = await prisma.project.findUnique({
      where: { id, orgId: orgId },
    })

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Destructure to exclude fields that need special handling
    const { endDate, dueDate, startDate, ...restUpdates } = updates
    
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...restUpdates,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: (endDate || dueDate) ? new Date(endDate || dueDate!) : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          }
        }
      },
    })

    // Log specific changes
    if (updates.status && updates.status !== existingProject.status) {
      await AuditLogger.logProjectAction(
        req,
        userId,
        orgId,
        AUDIT_ACTIONS.PROJECT_STATUS_CHANGED,
        id,
        { previousStatus: existingProject.status, newStatus: updates.status }
      )
    }

    // General update log if other fields changed
    const otherUpdates = Object.keys(updates).filter(key => key !== 'status')
    if (otherUpdates.length > 0) {
      await AuditLogger.logProjectAction(
        req,
        userId,
        orgId,
        AUDIT_ACTIONS.PROJECT_UPDATED,
        id,
        { updatedFields: otherUpdates, projectName: project.name }
      )
    }

    // Send project update notifications
    try {
      // Get all project members (excluding updater)
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId: id,
          userId: { not: userId }
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      })

      // Notify project members about important updates
      if (updates.status || updates.endDate || updates.dueDate || updates.priority) {
        const updateTypes = []
        if (updates.status) updateTypes.push(`status to ${mapProjectStatusToFrontend(updates.status)}`)
        if (updates.endDate || updates.dueDate) updateTypes.push('due date')
        if (updates.priority) updateTypes.push(`priority to ${mapProjectPriorityToFrontend(updates.priority)}`)
        
        const updateMessage = `Project ${updateTypes.join(', ')} updated`
        
        for (const member of projectMembers) {
          await notificationService.createNotification({
            userId: member.userId,
            orgId,
            type: updates.status === 'Completed' ? NotificationType.PROJECT_UPDATED : NotificationType.PROJECT_UPDATED,
            category: NotificationCategory.PROJECT,
            title: `Project updated: ${project.name}`,
            message: `${updateMessage} by ${project.owner.name}`,
            data: {
              projectId: project.id,
              updatedFields: Object.keys(updates),
              oldStatus: existingProject.status,
              newStatus: updates.status
            },
            entityType: 'Project',
            entityId: project.id,
            priority: updates.status === 'Completed' ? NotificationPriority.Medium : NotificationPriority.Low
          })
        }
      }
    } catch (notificationError) {
      console.error('Failed to send project update notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    const transformedProject = transformProjectForFrontend(project)
    res.json({ project: transformedProject })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /projects/:id
 * Archive a project (set status to Archived)
 * Role access: Admin (any project), Project owner
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check admin access (only owners and admins can archive)
    const hasAccess = await checkProjectAccess(userId, orgId, id, 'admin')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to archive this project' })
    }

    const project = await prisma.project.findUnique({
      where: { id, orgId: orgId },
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Archive the project instead of deleting
    const archivedProject = await prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.Archived },
    })

    // Log project archival
    await AuditLogger.logProjectAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.PROJECT_STATUS_CHANGED,
      id,
      { 
        action: 'archived', 
        previousStatus: project.status, 
        newStatus: ProjectStatus.Archived,
        projectName: project.name 
      }
    )

    res.json({ message: 'Project archived successfully' })
  } catch (error) {
    console.error('Archive project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /projects/:id/members
 * Get project members
 * Role access: Users with read access to the project
 */
router.get('/:id/members', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check read access
    const hasAccess = await checkProjectAccess(userId, orgId, id, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const members = await prisma.projectMember.findMany({
      where: { 
        projectId: id,
        project: { orgId: orgId }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            isActive: true,
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    })

    res.json({ members })
  } catch (error) {
    console.error('Get project members error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /projects/:id/members
 * Add a member to a project
 * Role access: Admin (any project), Project owner, Project managers
 */
router.post('/:id/members', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { userId: memberUserId, role } = addMemberSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check write access
    const hasAccess = await checkProjectAccess(userId, orgId, id, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to manage this project' })
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id, orgId: orgId },
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Check if user exists in the same org
    const memberUser = await prisma.user.findUnique({
      where: { id: memberUserId, orgId: orgId },
      select: { id: true, name: true, email: true, avatar: true, role: true }
    })

    if (!memberUser) {
      return res.status(404).json({ error: 'User not found in organization' })
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: { 
        projectId_userId: { 
          projectId: id, 
          userId: memberUserId 
        }
      }
    })

    if (existingMember) {
      return res.status(409).json({ error: 'User is already a member of this project' })
    }

    // Add member
    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: memberUserId,
        role: role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          }
        }
      }
    })

    // Log member addition
    await AuditLogger.logProjectAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.PROJECT_MEMBER_ADDED,
      id,
      { 
        addedUserId: memberUserId, 
        addedUserName: memberUser.name,
        memberRole: role,
        projectName: project.name 
      }
    )

    // Send member addition notifications
    try {
      // Notify the new member
      await notificationService.createNotification({
        userId: memberUserId,
        orgId,
        type: NotificationType.PROJECT_CREATED,
        category: NotificationCategory.PROJECT,
        title: `Added to project: ${project.name}`,
        message: `You have been added to the project "${project.name}" as a ${role}`,
        data: {
          projectId: id,
          role,
          addedBy: userId
        },
        entityType: 'Project',
        entityId: id,
        priority: NotificationPriority.Medium
      })

      // Notify other project members about new member
      const otherMembers = await prisma.projectMember.findMany({
        where: {
          projectId: id,
          userId: { notIn: [userId, memberUserId] }
        },
        select: { userId: true }
      })

      for (const otherMember of otherMembers) {
        await notificationService.createNotification({
          userId: otherMember.userId,
          orgId,
          type: NotificationType.PROJECT_UPDATED,
          category: NotificationCategory.PROJECT,
          title: `New member in ${project.name}`,
          message: `${memberUser.name} was added to the project as a ${role}`,
          data: {
            projectId: id,
            newMemberId: memberUserId,
            newMemberRole: role
          },
          entityType: 'Project',
          entityId: id,
          priority: NotificationPriority.Low
        })
      }
    } catch (notificationError) {
      console.error('Failed to send member addition notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    res.status(201).json({ member })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Add project member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /projects/:id/members/:userId
 * Update a member's role in a project
 * Role access: Admin (any project), Project owner, Project managers
 */
router.put('/:id/members/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { id, userId: memberUserId } = req.params
    const { role } = updateMemberSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check write access
    const hasAccess = await checkProjectAccess(userId, orgId, id, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to manage this project' })
    }

    // Get existing member
    const existingMember = await prisma.projectMember.findUnique({
      where: { 
        projectId_userId: { 
          projectId: id, 
          userId: memberUserId 
        },
        project: { orgId: orgId }
      },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } }
      }
    })

    if (!existingMember) {
      return res.status(404).json({ error: 'Project member not found' })
    }

    // Update member role
    const member = await prisma.projectMember.update({
      where: { 
        projectId_userId: { 
          projectId: id, 
          userId: memberUserId 
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          }
        }
      }
    })

    // Log member role change
    await AuditLogger.logProjectAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.PROJECT_MEMBER_ADDED, // Could add PROJECT_MEMBER_ROLE_CHANGED
      id,
      { 
        memberUserId,
        memberUserName: existingMember.user.name,
        previousRole: existingMember.role,
        newRole: role,
        projectName: existingMember.project.name
      }
    )

    res.json({ member })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update project member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /projects/:id/members/:userId
 * Remove a member from a project
 * Role access: Admin (any project), Project owner, Project managers, or the user themselves
 */
router.delete('/:id/members/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { id, userId: memberUserId } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Users can remove themselves, or those with write access can remove others
    const isSelfRemoval = userId === memberUserId
    const hasAccess = isSelfRemoval || await checkProjectAccess(userId, orgId, id, 'write')
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to manage this project' })
    }

    // Get existing member for logging
    const existingMember = await prisma.projectMember.findUnique({
      where: { 
        projectId_userId: { 
          projectId: id, 
          userId: memberUserId 
        },
        project: { orgId: orgId }
      },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true, ownerId: true } }
      }
    })

    if (!existingMember) {
      return res.status(404).json({ error: 'Project member not found' })
    }

    // Prevent removing project owner
    if (existingMember.project.ownerId === memberUserId) {
      return res.status(400).json({ error: 'Cannot remove project owner from project' })
    }

    // Remove member
    await prisma.projectMember.delete({
      where: { 
        projectId_userId: { 
          projectId: id, 
          userId: memberUserId 
        }
      }
    })

    // Log member removal
    await AuditLogger.logProjectAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.PROJECT_MEMBER_REMOVED,
      id,
      { 
        removedUserId: memberUserId,
        removedUserName: existingMember.user.name,
        memberRole: existingMember.role,
        projectName: existingMember.project.name,
        isSelfRemoval
      }
    )

    res.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Remove project member error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as projectsRouter }
