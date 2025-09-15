import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient, Role, TaskStatus, TaskPriority, ProjectMemberRole } from '@prisma/client'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  estimate: z.number().min(0, 'Estimate must be positive').optional(),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string()).optional(),
  position: z.number().int().optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  estimate: z.number().min(0, 'Estimate must be positive').optional(),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string()).optional(),
  position: z.number().int().optional(),
})

const taskQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().optional(),
  sortBy: z.enum(['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

const assignTaskSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
})

// Transform functions for frontend compatibility
const mapTaskStatusToFrontend = (status: TaskStatus): string => {
  const statusMap = {
    [TaskStatus.Todo]: 'TODO',
    [TaskStatus.InProgress]: 'IN_PROGRESS', 
    [TaskStatus.Review]: 'REVIEW',
    [TaskStatus.Done]: 'DONE'
  }
  return statusMap[status] || status
}

const mapTaskPriorityToFrontend = (priority: TaskPriority): string => {
  return priority.toUpperCase()
}

const transformTaskForFrontend = (task: any) => ({
  ...task,
  status: mapTaskStatusToFrontend(task.status),
  priority: mapTaskPriorityToFrontend(task.priority),
})

// Reverse transformation for frontend to backend
const mapFrontendStatusToBackend = (status: string): TaskStatus => {
  const statusMap: Record<string, TaskStatus> = {
    'TODO': TaskStatus.Todo,
    'IN_PROGRESS': TaskStatus.InProgress,
    'REVIEW': TaskStatus.Review,
    'DONE': TaskStatus.Done
  }
  return statusMap[status] || TaskStatus.Todo
}

const mapFrontendPriorityToBackend = (priority: string): TaskPriority => {
  const priorityMap: Record<string, TaskPriority> = {
    'LOW': TaskPriority.Low,
    'MEDIUM': TaskPriority.Medium,
    'HIGH': TaskPriority.High,
    'CRITICAL': TaskPriority.Critical
  }
  return priorityMap[priority] || TaskPriority.Medium
}

// Helper function to check if user has access to project (reuse project logic)
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

// Helper function to check task-specific access
async function checkTaskAccess(
  userId: string,
  orgId: string, 
  taskId: string,
  requiredAccess: 'read' | 'write' | 'admin'
) {
  // Get task with project info
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          orgId: true,
          ownerId: true,
        }
      }
    }
  })

  if (!task || task.project.orgId !== orgId) return false

  // Check project access first
  const hasProjectAccess = await checkProjectAccess(userId, orgId, task.project.id, requiredAccess)
  if (!hasProjectAccess) return false

  // For write access, also check if user is assignee or reporter
  if (requiredAccess === 'write') {
    if (task.assigneeId === userId || task.reporterId === userId) {
      return true
    }
  }

  return hasProjectAccess
}

/**
 * GET /projects/:projectId/tasks
 * List tasks for a specific project
 * Role access: Project members (read access to project)
 */
router.get('/projects/:projectId/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { page, limit, search, status, priority, assigneeId, sortBy, sortOrder } = taskQuerySchema.parse(req.query)
    const skip = (page - 1) * limit

    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check project access
    const hasAccess = await checkProjectAccess(userId, orgId, projectId, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    // Build where clause
    let where: any = {
      projectId: projectId,
      project: { orgId: orgId }
    }

    // Apply filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    // Get tasks and total count
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          estimate: true,
          dueDate: true,
          labels: true,
          position: true,
          createdAt: true,
          updatedAt: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Transform tasks for frontend compatibility
    const transformedTasks = tasks.map(transformTaskForFrontend)

    res.json({
      tasks: transformedTasks,
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
    console.error('List project tasks error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /tasks/:id
 * Get a specific task by ID
 * Role access: Users with read access to the task's project
 */
router.get('/tasks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task access
    const hasAccess = await checkTaskAccess(userId, orgId, id, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this task' })
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      },
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const transformedTask = transformTaskForFrontend(task)
    res.json({ task: transformedTask })
  } catch (error) {
    console.error('Get task error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /projects/:projectId/tasks
 * Create a new task in a project
 * Role access: Project members (write access to project)
 */
router.post('/projects/:projectId/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    // Transform status and priority if provided
    const rawData = req.body
    const transformedData = {
      ...rawData,
      status: rawData.status ? mapFrontendStatusToBackend(rawData.status) : undefined,
      priority: rawData.priority ? mapFrontendPriorityToBackend(rawData.priority) : undefined,
    }
    const data = createTaskSchema.parse(transformedData)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check project write access
    const hasAccess = await checkProjectAccess(userId, orgId, projectId, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to create tasks in this project' })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId, orgId: orgId },
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // If assigneeId is provided, verify they have access to the project
    if (data.assigneeId) {
      const assigneeHasAccess = await checkProjectAccess(data.assigneeId, orgId, projectId, 'read')
      if (!assigneeHasAccess) {
        return res.status(400).json({ error: 'Assignee does not have access to this project' })
      }
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId,
        reporterId: userId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    })

    // Log task creation
    await AuditLogger.logTaskAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.TASK_CREATED,
      task.id,
      { 
        taskTitle: task.title, 
        projectId: task.projectId,
        projectName: task.project.name,
        assigneeId: task.assigneeId 
      }
    )

    const transformedTask = transformTaskForFrontend(task)
    res.status(201).json({ task: transformedTask })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /tasks/:id
 * Update a task
 * Role access: Task assignee, reporter, or users with write access to project
 */
router.put('/tasks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    // Transform status and priority if provided
    const rawUpdates = req.body
    const transformedUpdates = {
      ...rawUpdates,
      status: rawUpdates.status ? mapFrontendStatusToBackend(rawUpdates.status) : undefined,
      priority: rawUpdates.priority ? mapFrontendPriorityToBackend(rawUpdates.priority) : undefined,
    }
    const updates = updateTaskSchema.parse(transformedUpdates)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task write access
    const hasAccess = await checkTaskAccess(userId, orgId, id, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to update this task' })
    }

    // Get existing task for audit logging
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { orgId: true, id: true }
        }
      }
    })

    if (!existingTask || existingTask.project.orgId !== orgId) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // If assigneeId is being updated, verify they have access to the project
    if (updates.assigneeId !== undefined && updates.assigneeId !== null) {
      const assigneeHasAccess = await checkProjectAccess(updates.assigneeId, orgId, existingTask.projectId, 'read')
      if (!assigneeHasAccess) {
        return res.status(400).json({ error: 'Assignee does not have access to this project' })
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...updates,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    })

    // Log specific changes
    if (updates.status && updates.status !== existingTask.status) {
      await AuditLogger.logTaskAction(
        req,
        userId,
        orgId,
        AUDIT_ACTIONS.TASK_STATUS_CHANGED,
        id,
        { 
          previousStatus: existingTask.status, 
          newStatus: updates.status,
          taskTitle: task.title 
        }
      )
    }

    if (updates.assigneeId !== undefined && updates.assigneeId !== existingTask.assigneeId) {
      if (updates.assigneeId) {
        await AuditLogger.logTaskAction(
          req,
          userId,
          orgId,
          AUDIT_ACTIONS.TASK_ASSIGNED,
          id,
          { 
            assigneeId: updates.assigneeId,
            previousAssigneeId: existingTask.assigneeId,
            taskTitle: task.title 
          }
        )
      } else {
        await AuditLogger.logTaskAction(
          req,
          userId,
          orgId,
          AUDIT_ACTIONS.TASK_UNASSIGNED,
          id,
          { 
            previousAssigneeId: existingTask.assigneeId,
            taskTitle: task.title 
          }
        )
      }
    }

    // General update log if other fields changed
    const otherUpdates = Object.keys(updates).filter(key => key !== 'status' && key !== 'assigneeId')
    if (otherUpdates.length > 0) {
      await AuditLogger.logTaskAction(
        req,
        userId,
        orgId,
        AUDIT_ACTIONS.TASK_UPDATED,
        id,
        { updatedFields: otherUpdates, taskTitle: task.title }
      )
    }

    const transformedTask = transformTaskForFrontend(task)
    res.json({ task: transformedTask })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /tasks/:id
 * Delete a task
 * Role access: Users with admin access to project (project managers and above)
 */
router.delete('/tasks/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task admin access (only managers and above can delete)
    const hasAccess = await checkTaskAccess(userId, orgId, id, 'admin')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to delete this task' })
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { orgId: true, name: true }
        }
      }
    })

    if (!task || task.project.orgId !== orgId) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Delete the task
    await prisma.task.delete({
      where: { id }
    })

    // Log task deletion
    await AuditLogger.logTaskAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.TASK_DELETED,
      id,
      { 
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: task.project.name
      }
    )

    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /tasks/:id/assign
 * Assign or unassign a task
 * Role access: Users with write access to project
 */
router.put('/tasks/:id/assign', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { assigneeId } = assignTaskSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task write access
    const hasAccess = await checkTaskAccess(userId, orgId, id, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to assign this task' })
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { orgId: true, id: true }
        }
      }
    })

    if (!existingTask || existingTask.project.orgId !== orgId) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // If assigneeId is provided, verify they have access to the project
    if (assigneeId) {
      const assigneeHasAccess = await checkProjectAccess(assigneeId, orgId, existingTask.projectId, 'read')
      if (!assigneeHasAccess) {
        return res.status(400).json({ error: 'Assignee does not have access to this project' })
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        }
      },
    })

    // Log assignment change
    if (assigneeId) {
      await AuditLogger.logTaskAction(
        req,
        userId,
        orgId,
        AUDIT_ACTIONS.TASK_ASSIGNED,
        id,
        { 
          assigneeId,
          previousAssigneeId: existingTask.assigneeId,
          taskTitle: task.title 
        }
      )
    } else {
      await AuditLogger.logTaskAction(
        req,
        userId,
        orgId,
        AUDIT_ACTIONS.TASK_UNASSIGNED,
        id,
        { 
          previousAssigneeId: existingTask.assigneeId,
          taskTitle: task.title 
        }
      )
    }

    const transformedTask = transformTaskForFrontend(task)
    res.json({ task: transformedTask })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Assign task error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as tasksRouter }