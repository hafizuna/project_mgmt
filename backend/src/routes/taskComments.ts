import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient, TaskHistoryAction } from '@prisma/client'
import { authenticate } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty').max(5000, 'Comment is too long'),
  parentId: z.string().uuid().optional(), // For replies
})

const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty').max(5000, 'Comment is too long'),
})

// Helper function to check task access
async function checkTaskAccess(userId: string, orgId: string, taskId: string, requiredAccess: 'read' | 'write' = 'read') {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: {
            where: { userId: userId },
            select: { role: true }
          }
        }
      }
    }
  })

  if (!task || task.project.orgId !== orgId) return false

  // Check if user is a project member
  const membership = task.project.members[0]
  if (!membership) return false

  return true
}

// Helper function to check comment ownership or admin rights
async function checkCommentAccess(userId: string, orgId: string, commentId: string) {
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        select: {
          project: {
            select: { orgId: true }
          }
        }
      }
    }
  })

  if (!comment || comment.task.project.orgId !== orgId) return false

  // User can edit/delete their own comments
  return comment.authorId === userId
}

/**
 * GET /tasks/:taskId/comments
 * Get all comments for a task
 */
router.get('/tasks/:taskId/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task access
    const hasAccess = await checkTaskAccess(userId, orgId, taskId, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this task' })
    }

    const comments = await prisma.taskComment.findMany({
      where: { 
        taskId,
        parentId: null // Only get top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ comments })
  } catch (error) {
    console.error('Get task comments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /tasks/:taskId/comments
 * Add a comment to a task
 */
router.post('/tasks/:taskId/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const { content, parentId } = createCommentSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task access
    const hasAccess = await checkTaskAccess(userId, orgId, taskId, 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to comment on this task' })
    }

    // If parentId is provided, verify it exists and belongs to the same task
    if (parentId) {
      const parentComment = await prisma.taskComment.findUnique({
        where: { id: parentId },
        select: { taskId: true }
      })
      
      if (!parentComment || parentComment.taskId !== taskId) {
        return res.status(400).json({ error: 'Invalid parent comment' })
      }
    }

    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        authorId: userId,
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Add to task history
    await prisma.taskHistory.create({
      data: {
        taskId,
        userId,
        action: TaskHistoryAction.COMMENT_ADDED,
        description: parentId ? 'replied to a comment' : 'added a comment',
      }
    })

    // Log audit action
    await AuditLogger.logTaskAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.TASK_COMMENT_ADDED,
      taskId,
      { commentId: comment.id, isReply: !!parentId }
    )

    res.status(201).json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /comments/:commentId
 * Update a comment
 */
router.put('/comments/:commentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params
    const { content } = updateCommentSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check comment access
    const hasAccess = await checkCommentAccess(userId, orgId, commentId)
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to edit this comment' })
    }

    const comment = await prisma.taskComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    res.json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /comments/:commentId
 * Delete a comment
 */
router.delete('/comments/:commentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check comment access
    const hasAccess = await checkCommentAccess(userId, orgId, commentId)
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to delete this comment' })
    }

    // Get comment details for audit log
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { taskId: true, content: true }
    })

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' })
    }

    // Delete the comment (this will cascade delete replies)
    await prisma.taskComment.delete({
      where: { id: commentId }
    })

    // Log audit action
    await AuditLogger.logTaskAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.TASK_COMMENT_DELETED,
      comment.taskId,
      { commentId }
    )

    res.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Delete comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /tasks/:taskId/history
 * Get task history/activity timeline
 */
router.get('/tasks/:taskId/history', authenticate, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check task access
    const hasAccess = await checkTaskAccess(userId, orgId, taskId, 'read')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this task' })
    }

    const history = await prisma.taskHistory.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ history })
  } catch (error) {
    console.error('Get task history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as taskCommentsRouter }