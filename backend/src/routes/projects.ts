import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient, Role, ProjectStatus, ProjectMemberRole } from '@prisma/client'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  settings: z.record(z.any()).optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  settings: z.record(z.any()).optional(),
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.string().optional(),
})

const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.nativeEnum(ProjectMemberRole).optional().default('Member'),
})

const updateMemberSchema = z.object({
  role: z.nativeEnum(ProjectMemberRole),
})

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
    const { page, limit, search, status, ownerId } = querySchema.parse(req.query)
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
      where.status = status
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
          startDate: true,
          dueDate: true,
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

    res.json({
      projects,
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

    res.json({ project })
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
router.post('/', authenticate, requireRole(['Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const data = createProjectSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    const project = await prisma.project.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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

    res.status(201).json({ project })
  } catch (error) {
    if (error instanceof z.ZodError) {
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
    const updates = updateProjectSchema.parse(req.body)
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

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...updates,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
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

    res.json({ project })
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
