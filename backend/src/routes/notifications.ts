import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient, Role, NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'
import { NotificationService } from '../services/NotificationService.js'

const router = Router()
const prisma = new PrismaClient()
const notificationService = NotificationService.getInstance()

// Validation schemas
const notificationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  unreadOnly: z.string().optional().transform(val => val === 'true'),
  category: z.nativeEnum(NotificationCategory).optional(),
  type: z.nativeEnum(NotificationType).optional(),
})

const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
})

const notificationPreferencesSchema = z.object({
  enableInApp: z.boolean().optional(),
  enableEmail: z.boolean().optional(),
  enablePush: z.boolean().optional(),
  emailDigestFrequency: z.enum(['Never', 'Immediate', 'Hourly', 'Daily', 'Weekly']).optional(),
  
  // Category preferences
  taskNotifications: z.boolean().optional(),
  projectNotifications: z.boolean().optional(),
  meetingNotifications: z.boolean().optional(),
  reportNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
  
  // Email preferences
  taskEmail: z.boolean().optional(),
  projectEmail: z.boolean().optional(),
  meetingEmail: z.boolean().optional(),
  reportEmail: z.boolean().optional(),
  systemEmail: z.boolean().optional(),
  
  // Quiet hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  quietHoursTimezone: z.string().optional(),
  
  // Weekend settings
  enableWeekendsEmail: z.boolean().optional(),
  enableWeekendsApp: z.boolean().optional(),
})

const createNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  category: z.nativeEnum(NotificationCategory),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.any()).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  scheduledFor: z.string().datetime().optional(),
  userIds: z.array(z.string().uuid()).min(1, 'At least one user ID is required'),
})

/**
 * GET /api/notifications
 * Get user's notifications with pagination and filtering
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { page, limit, unreadOnly, category, type } = notificationQuerySchema.parse(req.query)

    const result = await notificationService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
      category,
      type
    })

    res.json({
      notifications: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1,
      },
      unreadCount: result.unreadCount
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Failed to retrieve notifications' })
  }
})

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for current user
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    })

    res.json({ unreadCount })
  } catch (error) {
    console.error('Get unread count error:', error)
    res.status(500).json({ error: 'Failed to get unread count' })
  }
})

/**
 * POST /api/notifications/mark-read
 * Mark notifications as read
 */
router.post('/mark-read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { notificationIds, markAll } = markAsReadSchema.parse(req.body)

    if (markAll) {
      await notificationService.markAllAsRead(userId)
    } else if (notificationIds && notificationIds.length > 0) {
      await notificationService.markMultipleAsRead(notificationIds, userId)
    } else {
      return res.status(400).json({ error: 'Either notificationIds or markAll must be provided' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Mark as read error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

/**
 * PUT /api/notifications/:id/read
 * Mark specific notification as read
 */
router.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId

    await notificationService.markAsRead(id, userId)

    res.json({ success: true })
  } catch (error) {
    console.error('Mark notification as read error:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          orgId: req.user!.orgId,
          enableInApp: true,
          enableEmail: true,
          enablePush: true,
          emailDigestFrequency: 'Daily',
          taskNotifications: true,
          projectNotifications: true,
          meetingNotifications: true,
          reportNotifications: true,
          systemNotifications: true,
          taskEmail: true,
          projectEmail: true,
          meetingEmail: true,
          reportEmail: true,
          systemEmail: false,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          quietHoursTimezone: 'UTC',
          enableWeekendsEmail: false,
          enableWeekendsApp: true,
        }
      })
    }

    res.json(preferences)
  } catch (error) {
    console.error('Get notification preferences error:', error)
    res.status(500).json({ error: 'Failed to retrieve notification preferences' })
  }
})

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const orgId = req.user!.orgId
    const preferencesData = notificationPreferencesSchema.parse(req.body)

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: preferencesData,
      create: {
        userId,
        orgId,
        ...preferencesData,
        // Set defaults for required fields if not provided
        enableInApp: preferencesData.enableInApp ?? true,
        enableEmail: preferencesData.enableEmail ?? true,
        enablePush: preferencesData.enablePush ?? true,
        emailDigestFrequency: preferencesData.emailDigestFrequency ?? 'Daily',
        taskNotifications: preferencesData.taskNotifications ?? true,
        projectNotifications: preferencesData.projectNotifications ?? true,
        meetingNotifications: preferencesData.meetingNotifications ?? true,
        reportNotifications: preferencesData.reportNotifications ?? true,
        systemNotifications: preferencesData.systemNotifications ?? true,
        taskEmail: preferencesData.taskEmail ?? true,
        projectEmail: preferencesData.projectEmail ?? true,
        meetingEmail: preferencesData.meetingEmail ?? true,
        reportEmail: preferencesData.reportEmail ?? true,
        systemEmail: preferencesData.systemEmail ?? false,
        quietHoursEnabled: preferencesData.quietHoursEnabled ?? false,
        quietHoursStart: preferencesData.quietHoursStart ?? '22:00',
        quietHoursEnd: preferencesData.quietHoursEnd ?? '08:00',
        quietHoursTimezone: preferencesData.quietHoursTimezone ?? 'UTC',
        enableWeekendsEmail: preferencesData.enableWeekendsEmail ?? false,
        enableWeekendsApp: preferencesData.enableWeekendsApp ?? true,
      }
    })

    // Log preference change
    await AuditLogger.log({
      userId,
      orgId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'NotificationPreference',
      entityId: preferences.id,
      metadata: { action: 'preferences_updated' }
    })

    res.json(preferences)
  } catch (error) {
    console.error('Update notification preferences error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to update notification preferences' })
  }
})

/**
 * POST /api/notifications/create
 * Create notification(s) - Admin/Manager only
 */
router.post('/create', authenticate, requireRole(['Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const orgId = req.user!.orgId
    const notificationData = createNotificationSchema.parse(req.body)

    const scheduledFor = notificationData.scheduledFor ? new Date(notificationData.scheduledFor) : undefined

    const notificationIds = await notificationService.createBulkNotifications(
      notificationData.userIds,
      {
        orgId,
        type: notificationData.type,
        category: notificationData.category,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        entityType: notificationData.entityType,
        entityId: notificationData.entityId,
        priority: notificationData.priority || NotificationPriority.Medium,
        scheduledFor
      },
      !scheduledFor // Send immediately if not scheduled
    )

    // Log notification creation
    await AuditLogger.log({
      userId,
      orgId,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'Notification',
      entityId: notificationIds.join(','),
      metadata: { 
        type: notificationData.type,
        category: notificationData.category,
        recipientCount: notificationData.userIds.length,
        scheduled: !!scheduledFor
      }
    })

    res.json({ 
      success: true, 
      notificationIds,
      recipientCount: notificationData.userIds.length
    })
  } catch (error) {
    console.error('Create notification error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to create notifications' })
  }
})

/**
 * DELETE /api/notifications/:id
 * Delete a notification (user can only delete their own)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await prisma.notification.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

/**
 * GET /api/notifications/admin/stats
 * Get notification statistics - Admin only
 */
router.get('/admin/stats', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId
    const { days = '7' } = req.query
    const daysNum = parseInt(days as string)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysNum)

    const [
      totalNotifications,
      deliveredNotifications,
      emailNotifications,
      unreadNotifications,
      notificationsByType,
      recentActivity
    ] = await Promise.all([
      prisma.notification.count({
        where: { orgId, createdAt: { gte: cutoffDate } }
      }),
      prisma.notification.count({
        where: { orgId, deliveredAt: { not: null }, createdAt: { gte: cutoffDate } }
      }),
      prisma.notification.count({
        where: { orgId, deliveredViaEmail: true, createdAt: { gte: cutoffDate } }
      }),
      prisma.notification.count({
        where: { orgId, isRead: false }
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { orgId, createdAt: { gte: cutoffDate } },
        _count: true
      }),
      prisma.notification.findMany({
        where: { orgId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      })
    ])

    const deliveryRate = totalNotifications > 0 ? (deliveredNotifications / totalNotifications) * 100 : 0
    const emailDeliveryRate = totalNotifications > 0 ? (emailNotifications / totalNotifications) * 100 : 0

    res.json({
      period: `Last ${daysNum} days`,
      stats: {
        totalNotifications,
        deliveredNotifications,
        emailNotifications,
        unreadNotifications,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        emailDeliveryRate: Math.round(emailDeliveryRate * 100) / 100
      },
      notificationsByType: notificationsByType.map(item => ({
        type: item.type,
        count: item._count
      })),
      recentActivity: recentActivity.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        userName: notification.user?.name,
        userEmail: notification.user?.email,
        isRead: notification.isRead,
        deliveredAt: notification.deliveredAt,
        createdAt: notification.createdAt
      }))
    })
  } catch (error) {
    console.error('Get notification stats error:', error)
    res.status(500).json({ error: 'Failed to retrieve notification statistics' })
  }
})

/**
 * POST /api/notifications/admin/cleanup
 * Clean up old notifications - Admin only
 */
router.post('/admin/cleanup', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { daysToKeep = 30 } = req.body
    
    const deletedCount = await notificationService.cleanupOldNotifications(daysToKeep)

    // Log cleanup action
    await AuditLogger.log({
      userId: req.user!.userId,
      orgId: req.user!.orgId,
      action: AUDIT_ACTIONS.DELETE,
      entityType: 'Notification',
      entityId: 'bulk_cleanup',
      metadata: { deletedCount, daysToKeep }
    })

    res.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned up ${deletedCount} old notifications older than ${daysToKeep} days`
    })
  } catch (error) {
    console.error('Notification cleanup error:', error)
    res.status(500).json({ error: 'Failed to cleanup notifications' })
  }
})

/**
 * GET /api/notifications/test-email
 * Test email notification service - Admin only
 */
router.get('/test-email', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Create a test notification
    const notificationId = await notificationService.createNotification({
      userId,
      orgId,
      type: NotificationType.WELCOME,
      category: NotificationCategory.SYSTEM,
      title: 'Email Test Notification',
      message: 'This is a test email to verify your notification system is working correctly.',
      data: { testEmail: true },
      priority: NotificationPriority.Medium
    })

    res.json({ 
      success: true,
      message: 'Test notification sent successfully',
      notificationId
    })
  } catch (error) {
    console.error('Test email error:', error)
    res.status(500).json({ error: 'Failed to send test email' })
  }
})

export default router