import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role, TaskStatus, TaskPriority, ProjectMemberRole, NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'
import { TaskHistoryLogger } from '../utils/taskHistory.js'
import { NotificationService } from '../services/NotificationService.js'

const router = Router()
const notificationService = NotificationService.getInstance()

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
  search: z.string().optional().transform(val => val === '' ? undefined : val), // Handle empty search
  status: z.string().optional(), // Accept frontend enum strings
  priority: z.string().optional(), // Accept frontend enum strings
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
    [TaskStatus.Done]: 'DONE',
    [TaskStatus.OnHold]: 'ON_HOLD'
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
    'DONE': TaskStatus.Done,
    'ON_HOLD': TaskStatus.OnHold
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
  // Get task with project info and user info
  const [task, user] = await Promise.all([
    prisma.task.findUnique({
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
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
  ])

  if (!task || task.project.orgId !== orgId || !user) return false

  // Admin has access to all tasks in their organization
  if (user.role === Role.Admin) return true

  // Check if user is project owner
  if (task.project.ownerId === userId) return true

  // Check project membership
  const projectMembership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: task.project.id,
        userId: userId
      }
    },
    select: { role: true }
  })

  if (!projectMembership) return false

  // Role-based task access logic
  if (user.role === Role.Manager || projectMembership.role === ProjectMemberRole.Manager) {
    // Managers can access all tasks in their projects
    return true
  }

  if (user.role === Role.Team) {
    // Team members can only access tasks assigned to them or tasks they created
    if (requiredAccess === 'read') {
      return task.assigneeId === userId || task.reporterId === userId
    }
    
    if (requiredAccess === 'write') {
      return task.assigneeId === userId || task.reporterId === userId
    }
  }

  return false
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
    const userRole = req.user!.role

    // Check project access
    const hasAccess = await checkProjectAccess(userId, orgId, projectId, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    // Build where clause with role-based filtering
    let where: any = {
      projectId: projectId,
      project: { orgId: orgId }
    }

    // Apply role-based task filtering
    if (userRole === Role.Team) {
      // Team members can only see tasks assigned to them OR tasks they created
      where.OR = [
        { assigneeId: userId },
        { reporterId: userId }
      ]
    }
    // Admin and Manager can see all tasks in projects they have access to

    // Apply search filter (combine with role filtering if needed)
    if (search) {
      const searchCondition = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }
      
      if (userRole === Role.Team) {
        // Combine role filtering with search filtering
        where.AND = [
          {
            OR: [
              { assigneeId: userId },
              { reporterId: userId }
            ]
          },
          searchCondition
        ]
        // Remove the role OR from the main where clause
        delete where.OR
      } else {
        // For Admin/Manager, just apply search
        where = { ...where, ...searchCondition }
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
    // Transform status, priority, and date if provided
    const rawData = req.body
    const transformedData = {
      ...rawData,
      status: rawData.status ? mapFrontendStatusToBackend(rawData.status) : undefined,
      priority: rawData.priority ? mapFrontendPriorityToBackend(rawData.priority) : undefined,
      dueDate: rawData.dueDate ? `${rawData.dueDate}T23:59:59.999Z` : undefined,
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

    // Add to task history
    await TaskHistoryLogger.logTaskCreation(task.id, userId)

    // Send notifications
    try {
      // Notify assignee if task is assigned
      if (task.assigneeId && task.assigneeId !== userId) {
        await notificationService.createNotification({
          userId: task.assigneeId,
          orgId,
          type: NotificationType.TASK_ASSIGNED,
          category: NotificationCategory.TASK,
          title: `New task assigned: ${task.title}`,
          message: `You have been assigned a new task "${task.title}" in project ${task.project.name}`,
          data: {
            taskId: task.id,
            projectId: task.projectId,
            reporterId: task.reporterId,
            dueDate: task.dueDate,
            priority: task.priority
          },
          entityType: 'Task',
          entityId: task.id,
          priority: task.priority === 'Critical' ? NotificationPriority.High : NotificationPriority.Medium
        })
      }

      // Notify project members (excluding reporter and assignee) about new task
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId,
          userId: {
            notIn: [userId, task.assigneeId].filter(Boolean) as string[]
          }
        },
        select: { userId: true }
      })

      for (const member of projectMembers) {
        await notificationService.createNotification({
          userId: member.userId,
          orgId,
          type: NotificationType.PROJECT_UPDATED,
          category: NotificationCategory.PROJECT,
          title: `New task in ${task.project.name}`,
          message: `${task.reporter?.name} created a new task "${task.title}"`,
          data: {
            taskId: task.id,
            projectId: task.projectId,
            reporterId: task.reporterId
          },
          entityType: 'Task',
          entityId: task.id,
          priority: NotificationPriority.Low
        })
      }
    } catch (notificationError) {
      console.error('Failed to send task creation notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    const transformedTask = transformTaskForFrontend(task)
    res.status(201).json({ task: transformedTask })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Task validation failed:', error.errors)
      console.error('Request body was:', req.body)
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
    // Transform status, priority, and date if provided
    const rawUpdates = req.body
    const transformedUpdates = {
      ...rawUpdates,
      status: rawUpdates.status ? mapFrontendStatusToBackend(rawUpdates.status) : undefined,
      priority: rawUpdates.priority ? mapFrontendPriorityToBackend(rawUpdates.priority) : undefined,
      dueDate: rawUpdates.dueDate ? `${rawUpdates.dueDate}T23:59:59.999Z` : undefined,
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

    // Track changes in task history
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (existingTask as any)[field]
      
      // Only log if the value actually changed
      if (oldValue !== newValue) {
        await TaskHistoryLogger.logFieldChange(id, userId, field, oldValue, newValue)
      }
    }

    // Keep existing audit logging for compliance
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

    // Send notifications for changes
    try {
      // Notify on status change
      if (updates.status && updates.status !== existingTask.status) {
        const statusNotifications = []
        
        // Notify assignee about status change
        if (task.assigneeId && task.assigneeId !== userId) {
          statusNotifications.push({
            userId: task.assigneeId,
            type: updates.status === 'Done' ? NotificationType.TASK_STATUS_CHANGED : NotificationType.TASK_ASSIGNED,
            title: `Task status updated: ${task.title}`,
            message: `Task status changed from ${mapTaskStatusToFrontend(existingTask.status)} to ${mapTaskStatusToFrontend(updates.status)}`
          })
        }
        
        // Notify reporter about status change
        if (task.reporterId && task.reporterId !== userId && task.reporterId !== task.assigneeId) {
          statusNotifications.push({
            userId: task.reporterId,
            type: updates.status === 'Done' ? NotificationType.TASK_STATUS_CHANGED : NotificationType.TASK_ASSIGNED,
            title: `Task status updated: ${task.title}`,
            message: `Task status changed from ${mapTaskStatusToFrontend(existingTask.status)} to ${mapTaskStatusToFrontend(updates.status)}`
          })
        }

        // Send status notifications
        for (const notification of statusNotifications) {
          await notificationService.createNotification({
            userId: notification.userId,
            orgId,
            type: notification.type,
            category: NotificationCategory.TASK,
            title: notification.title,
            message: notification.message,
            data: {
              taskId: task.id,
              projectId: task.projectId,
              oldStatus: existingTask.status,
              newStatus: updates.status
            },
            entityType: 'Task',
            entityId: task.id,
            priority: updates.status === 'Done' ? NotificationPriority.Medium : NotificationPriority.Low
          })
        }
      }

      // Notify on assignment change
      if (updates.assigneeId !== undefined && updates.assigneeId !== existingTask.assigneeId) {
        // Notify new assignee
        if (updates.assigneeId && updates.assigneeId !== userId) {
          await notificationService.createNotification({
            userId: updates.assigneeId,
            orgId,
            type: NotificationType.TASK_ASSIGNED,
            category: NotificationCategory.TASK,
            title: `Task assigned to you: ${task.title}`,
            message: `You have been assigned to task "${task.title}" in project ${task.project.name}`,
            data: {
              taskId: task.id,
              projectId: task.projectId,
              reporterId: task.reporterId,
              dueDate: task.dueDate
            },
            entityType: 'Task',
            entityId: task.id,
            priority: task.priority === 'Critical' ? NotificationPriority.High : NotificationPriority.Medium
          })
        }

        // Notify old assignee if task was reassigned
        if (existingTask.assigneeId && existingTask.assigneeId !== userId && existingTask.assigneeId !== updates.assigneeId) {
          await notificationService.createNotification({
            userId: existingTask.assigneeId,
            orgId,
            type: NotificationType.TASK_ASSIGNED,
            category: NotificationCategory.TASK,
            title: `Task reassigned: ${task.title}`,
            message: `Task "${task.title}" has been reassigned to ${task.assignee?.name || 'someone else'}`,
            data: {
              taskId: task.id,
              projectId: task.projectId,
              newAssigneeId: updates.assigneeId
            },
            entityType: 'Task',
            entityId: task.id,
            priority: NotificationPriority.Low
          })
        }
      }
    } catch (notificationError) {
      console.error('Failed to send task update notifications:', notificationError)
      // Don't fail the request if notifications fail
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

/**
 * PUT /tasks/bulk-status-update
 * Update multiple task statuses and positions in one request
 * Role access: Users with write access to tasks
 */
router.put('/tasks/bulk-status-update', authenticate, async (req: Request, res: Response) => {
  try {
    const bulkUpdateSchema = z.object({
      updates: z.array(z.object({
        taskId: z.string().uuid('Invalid task ID'),
        status: z.string(),
        position: z.number().int().optional()
      }))
    })
    
    const { updates } = bulkUpdateSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Convert frontend status to backend status for all updates
    const backendUpdates = updates.map(update => ({
      ...update,
      status: mapFrontendStatusToBackend(update.status)
    }))

    // Validate access to all tasks before making any changes
    for (const update of backendUpdates) {
      const hasAccess = await checkTaskAccess(userId, orgId, update.taskId, 'write')
      if (!hasAccess) {
        return res.status(403).json({ 
          error: `Access denied to update task ${update.taskId}` 
        })
      }
    }

    // Get existing tasks for history logging
    const existingTasks = await prisma.task.findMany({
      where: {
        id: { in: backendUpdates.map(u => u.taskId) }
      },
      select: {
        id: true,
        status: true,
        position: true,
        title: true,
        projectId: true
      }
    })

    // Update all tasks in a transaction
    const results = await prisma.$transaction(
      backendUpdates.map(update => {
        const updateData: any = { status: update.status }
        if (update.position !== undefined) {
          updateData.position = update.position
        }
        
        return prisma.task.update({
          where: { id: update.taskId },
          data: updateData,
        })
      })
    )

    // Log history for each changed task
    for (let i = 0; i < backendUpdates.length; i++) {
      const update = backendUpdates[i]
      const existingTask = existingTasks.find(t => t.id === update.taskId)
      
      if (existingTask && existingTask.status !== update.status) {
        await TaskHistoryLogger.logStatusChange(
          update.taskId,
          userId,
          existingTask.status,
          update.status
        )
        
        // Log audit action
        await AuditLogger.logTaskAction(
          req,
          userId,
          orgId,
          AUDIT_ACTIONS.TASK_STATUS_CHANGED,
          update.taskId,
          {
            oldStatus: existingTask.status,
            newStatus: update.status,
            taskTitle: existingTask.title,
            projectId: existingTask.projectId
          }
        )
      }
    }

    // Send notifications for status changes if needed
    // (This could be enhanced to batch notifications)
    
    res.json({ 
      success: true, 
      updatedTasks: results.length,
      message: `Successfully updated ${results.length} tasks`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Bulk status update error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as tasksRouter }
