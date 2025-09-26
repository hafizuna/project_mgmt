import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role, ActionItemStatus, TaskStatus, TaskPriority } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { authenticate } from '../middleware/auth.js'
import { AuditLogger } from '../utils/auditLogger.js'

const router = Router()

// Validation schemas
const createActionItemSchema = z.object({
  description: z.string().min(1, 'Action item description is required'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  dueDate: z.string().datetime('Invalid due date').optional(),
  projectId: z.string().uuid('Invalid project ID').optional()
})

const updateActionItemSchema = z.object({
  description: z.string().min(1, 'Action item description is required').optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  dueDate: z.string().datetime('Invalid due date').optional(),
  status: z.nativeEnum(ActionItemStatus).optional(),
  projectId: z.string().uuid('Invalid project ID').optional()
})

const convertToTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  projectId: z.string().uuid('Project ID is required for task conversion')
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

  if (!user) return false

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
    return user.role === Role.Manager || membership.role === 'Manager'
  }

  return false
}

/**
 * GET /api/meetings/:meetingId/action-items
 * List action items for a meeting
 * Role access: Meeting creator, attendees, or Admin
 */
router.get('/meetings/:meetingId/action-items', authenticate, async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params
    const { status } = req.query
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check meeting access
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { 
        orgId: true, 
        createdById: true,
        attendees: {
          where: { userId: userId },
          select: { userId: true }
        }
      }
    })

    if (!meeting || meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    // Check access: Admin, meeting creator, or attendee
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const isAttendee = meeting.attendees.length > 0
    const canAccess = user?.role === Role.Admin || 
                      meeting.createdById === userId || 
                      isAttendee

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied to this meeting' })
    }

    let whereClause: any = { meetingId: meetingId }

    // Filter by status if specified
    if (status && typeof status === 'string') {
      whereClause.status = status
    }

    const actionItems = await prisma.meetingActionItem.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ actionItems })
  } catch (error) {
    console.error('List action items error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/meetings/:meetingId/action-items
 * Create action item for a meeting
 * Role access: Meeting creator, attendees, or Admin
 */
router.post('/meetings/:meetingId/action-items', authenticate, async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params
    const data = createActionItemSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check meeting access
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { 
        orgId: true, 
        createdById: true,
        title: true,
        attendees: {
          where: { userId: userId },
          select: { userId: true }
        }
      }
    })

    if (!meeting || meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    // Check access: Admin, meeting creator, or attendee
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const isAttendee = meeting.attendees.length > 0
    const canCreate = user?.role === Role.Admin || 
                      meeting.createdById === userId || 
                      isAttendee

    if (!canCreate) {
      return res.status(403).json({ error: 'Access denied to create action items for this meeting' })
    }

    // Validate assignee if provided
    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { orgId: true }
      })

      if (!assignee || assignee.orgId !== orgId) {
        return res.status(400).json({ error: 'Invalid assignee - must be organization member' })
      }
    }

    // Validate project if provided
    if (data.projectId) {
      const hasProjectAccess = await checkProjectAccess(userId, orgId, data.projectId, 'read')
      if (!hasProjectAccess) {
        return res.status(403).json({ error: 'Access denied to this project' })
      }
    }

    const actionItem = await prisma.meetingActionItem.create({
      data: {
        meetingId: meetingId,
        description: data.description,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId: data.projectId,
        status: ActionItemStatus.Open
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Log action item creation
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'action_item.created',
      { 
        actionItemId: actionItem.id,
        meetingId: meetingId,
        meetingTitle: meeting.title,
        assigneeId: data.assigneeId,
        projectId: data.projectId
      }
    )

    res.status(201).json({ actionItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create action item error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/action-items/:id
 * Update an action item
 * Role access: Action item assignee, meeting creator, or Admin
 */
router.put('/action-items/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = updateActionItemSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Get action item with meeting info
    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id },
      include: {
        meeting: {
          select: { orgId: true, createdById: true }
        }
      }
    })

    if (!actionItem || actionItem.meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Action item not found' })
    }

    // Check permissions: Admin, assignee, or meeting creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canUpdate = user?.role === Role.Admin ||
                      actionItem.assigneeId === userId ||
                      actionItem.meeting.createdById === userId

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied to update this action item' })
    }

    // Validate assignee if being changed
    if (updates.assigneeId && updates.assigneeId !== actionItem.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: updates.assigneeId },
        select: { orgId: true }
      })

      if (!assignee || assignee.orgId !== orgId) {
        return res.status(400).json({ error: 'Invalid assignee - must be organization member' })
      }
    }

    // Validate project if being changed
    if (updates.projectId) {
      const hasProjectAccess = await checkProjectAccess(userId, orgId, updates.projectId, 'read')
      if (!hasProjectAccess) {
        return res.status(403).json({ error: 'Access denied to this project' })
      }
    }

    const updatedActionItem = await prisma.meetingActionItem.update({
      where: { id },
      data: {
        ...updates,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    res.json({ actionItem: updatedActionItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update action item error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/action-items/:id
 * Delete an action item
 * Role access: Meeting creator or Admin
 */
router.delete('/action-items/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Get action item with meeting info
    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id },
      include: {
        meeting: {
          select: { orgId: true, createdById: true, title: true }
        }
      }
    })

    if (!actionItem || actionItem.meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Action item not found' })
    }

    // Check permissions: Admin or meeting creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canDelete = user?.role === Role.Admin || actionItem.meeting.createdById === userId
    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied to delete this action item' })
    }

    await prisma.meetingActionItem.delete({
      where: { id }
    })

    // Log action item deletion
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'action_item.deleted',
      { 
        actionItemId: id,
        meetingId: actionItem.meetingId,
        meetingTitle: actionItem.meeting.title
      }
    )

    res.json({ message: 'Action item deleted successfully' })
  } catch (error) {
    console.error('Delete action item error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/action-items/:id/convert-to-task
 * Convert action item to task
 * Role access: Action item assignee, meeting creator, or Admin
 */
router.post('/action-items/:id/convert-to-task', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = convertToTaskSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Get action item with meeting info
    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id },
      include: {
        meeting: {
          select: { orgId: true, createdById: true, title: true }
        }
      }
    })

    if (!actionItem || actionItem.meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Action item not found' })
    }

    // Check if already converted
    if (actionItem.taskId) {
      return res.status(400).json({ error: 'Action item is already converted to a task' })
    }

    // Check permissions: Admin, assignee, or meeting creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canConvert = user?.role === Role.Admin ||
                       actionItem.assigneeId === userId ||
                       actionItem.meeting.createdById === userId

    if (!canConvert) {
      return res.status(403).json({ error: 'Access denied to convert this action item' })
    }

    // Check project access
    const hasProjectAccess = await checkProjectAccess(userId, orgId, data.projectId, 'write')
    if (!hasProjectAccess) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    // Create task from action item
    const task = await prisma.task.create({
      data: {
        title: data.title || actionItem.description,
        description: `Converted from meeting action item: ${actionItem.description}`,
        projectId: data.projectId,
        assigneeId: actionItem.assigneeId || userId,
        priority: data.priority || TaskPriority.Medium,
        status: TaskStatus.Todo,
        dueDate: actionItem.dueDate,
        orgId: orgId,
        createdById: userId
      }
    })

    // Update action item to link to task and mark as converted
    const updatedActionItem = await prisma.meetingActionItem.update({
      where: { id },
      data: {
        taskId: task.id,
        status: ActionItemStatus.Completed,
        projectId: data.projectId // Update project association if needed
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Log conversion
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'action_item.converted_to_task',
      { 
        actionItemId: id,
        taskId: task.id,
        meetingId: actionItem.meetingId,
        meetingTitle: actionItem.meeting.title,
        projectId: data.projectId
      }
    )

    res.status(201).json({ 
      actionItem: updatedActionItem, 
      task: {
        id: task.id,
        title: task.title,
        status: task.status
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Convert action item to task error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as actionItemsRouter }