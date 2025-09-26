import { NotificationType, NotificationCategory, NotificationPriority, NotificationChannel, User } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { EmailService } from './EmailService.js'
import { TemplateService } from './TemplateService.js'

export interface CreateNotificationData {
  userId: string
  orgId: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: any
  entityType?: string
  entityId?: string
  priority?: NotificationPriority
  scheduledFor?: Date
  channels?: NotificationChannel[]
}

export interface NotificationWithUser {
  id: string
  userId: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: any
  priority: NotificationPriority
  isRead: boolean
  readAt?: Date
  createdAt: Date
  updatedAt: Date
  entityType?: string
  entityId?: string
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

export class NotificationService {
  private static instance: NotificationService
  private emailService: EmailService
  private templateService: TemplateService

  private constructor() {
    this.emailService = EmailService.getInstance()
    this.templateService = TemplateService.getInstance()
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Create and optionally send a notification
   */
  async createNotification(data: CreateNotificationData, sendImmediately: boolean = true): Promise<string> {
    try {
      // Get user preferences
      const userPrefs = await this.getUserPreferences(data.userId)
      
      // Check if user wants this type of notification
      if (!this.shouldSendNotification(userPrefs, data.type, data.category)) {
        console.log(`Skipping notification for user ${data.userId} - disabled in preferences`)
        return ''
      }

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          orgId: data.orgId,
          type: data.type,
          category: data.category,
          title: data.title,
          message: data.message,
          data: data.data || {},
          entityType: data.entityType,
          entityId: data.entityId,
          priority: data.priority || NotificationPriority.Medium,
          scheduledFor: data.scheduledFor,
          deliveredViaApp: true, // Always create in-app notification
          deliveredViaEmail: false,
          deliveredViaPush: false,
        }
      })

      console.log(`Created notification ${notification.id} for user ${data.userId}`)

      // Send immediately if requested
      if (sendImmediately && !data.scheduledFor) {
        await this.deliverNotification(notification.id, data.channels)
      } else if (data.scheduledFor) {
        // Add to queue for scheduled delivery
        await this.scheduleNotification(notification.id, data.scheduledFor)
      }

      return notification.id
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[], 
    baseData: Omit<CreateNotificationData, 'userId'>, 
    sendImmediately: boolean = true
  ): Promise<string[]> {
    const notificationIds: string[] = []
    
    for (const userId of userIds) {
      try {
        const notificationId = await this.createNotification(
          { ...baseData, userId },
          sendImmediately
        )
        if (notificationId) {
          notificationIds.push(notificationId)
        }
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error)
      }
    }

    return notificationIds
  }

  /**
   * Send notification through specified channels
   */
  private async deliverNotification(notificationId: string, channels?: NotificationChannel[]): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              notificationPreferences: true
            }
          }
        }
      })

      if (!notification) {
        console.error(`Notification ${notificationId} not found`)
        return
      }

      const userPrefs = notification.user.notificationPreferences

      // Determine which channels to use
      const channelsToUse = channels || [NotificationChannel.IN_APP, NotificationChannel.EMAIL]

      // Send via email if enabled
      if (channelsToUse.includes(NotificationChannel.EMAIL) && userPrefs?.enableEmail) {
        await this.sendEmailNotification(notification)
      }

      // Update delivery status
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          deliveredAt: new Date(),
          deliveredViaEmail: channelsToUse.includes(NotificationChannel.EMAIL),
          deliveredViaPush: channelsToUse.includes(NotificationChannel.PUSH),
        }
      })

    } catch (error) {
      console.error(`Error delivering notification ${notificationId}:`, error)
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    try {
      // Get email template if available
      const template = await this.templateService.getTemplate(
        notification.orgId, 
        notification.type
      )

      let subject = notification.title
      let htmlContent = notification.message
      
      if (template) {
        subject = await this.templateService.renderTemplate(template.emailSubject || template.titleTemplate, notification.data)
        htmlContent = await this.templateService.renderTemplate(template.emailTemplate || template.messageTemplate, notification.data)
      }

      await this.emailService.sendEmail({
        to: notification.user.email,
        subject,
        html: htmlContent,
        text: notification.message,
        metadata: {
          notificationId: notification.id,
          userId: notification.userId,
          type: notification.type
        }
      })

      // Update email delivery status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSentAt: new Date(),
          emailDelivered: true,
        }
      })

      console.log(`Email sent for notification ${notification.id}`)

    } catch (error) {
      console.error(`Error sending email for notification ${notification.id}:`, error)
      
      // Update email error status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailError: error instanceof Error ? error.message : 'Unknown error',
        }
      })
    }
  }

  /**
   * Schedule notification for future delivery
   */
  private async scheduleNotification(notificationId: string, scheduledFor: Date): Promise<void> {
    await prisma.notificationQueue.create({
      data: {
        notificationId,
        type: (await prisma.notification.findUnique({ where: { id: notificationId } }))!.type,
        scheduledFor,
        payload: { notificationId }
      }
    })
  }

  /**
   * Get user's notification preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    // Return default preferences if none exist
    if (!prefs) {
      return {
        enableInApp: true,
        enableEmail: true,
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
      }
    }

    return prefs
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(prefs: any, type: NotificationType, category: NotificationCategory): boolean {
    // Check category preferences
    switch (category) {
      case NotificationCategory.TASK:
        return prefs.taskNotifications
      case NotificationCategory.PROJECT:
        return prefs.projectNotifications
      case NotificationCategory.MEETING:
        return prefs.meetingNotifications
      case NotificationCategory.REPORT:
        return prefs.reportNotifications
      case NotificationCategory.SYSTEM:
        return prefs.systemNotifications
      default:
        return true
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId // Ensure user can only mark their own notifications
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number
      limit?: number
      unreadOnly?: boolean
      category?: NotificationCategory
      type?: NotificationType
    } = {}
  ): Promise<{
    notifications: NotificationWithUser[]
    total: number
    unreadCount: number
  }> {
    const { page = 1, limit = 20, unreadOnly = false, category, type } = options
    const skip = (page - 1) * limit

    const where: any = { userId }
    if (unreadOnly) where.isRead = false
    if (category) where.category = category
    if (type) where.type = type

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ])

    return {
      notifications: notifications as NotificationWithUser[],
      total,
      unreadCount
    }
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true
      }
    })

    return result.count
  }

  /**
   * Process scheduled notifications (background job)
   */
  async processScheduledNotifications(): Promise<void> {
    const now = new Date()
    
    const queueItems = await prisma.notificationQueue.findMany({
      where: {
        scheduledFor: { lte: now },
        status: 'Pending'
      },
      take: 50 // Process in batches
    })

    for (const item of queueItems) {
      try {
        // Update status to processing
        await prisma.notificationQueue.update({
          where: { id: item.id },
          data: { 
            status: 'Processing',
            lastAttemptAt: new Date(),
            attempts: { increment: 1 }
          }
        })

        // Deliver the notification
        if (item.notificationId) {
          await this.deliverNotification(item.notificationId)
        }

        // Mark as completed
        await prisma.notificationQueue.update({
          where: { id: item.id },
          data: { 
            status: 'Completed',
            processedAt: new Date()
          }
        })

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error)
        
        // Handle retry logic
        const shouldRetry = item.attempts < item.maxAttempts
        await prisma.notificationQueue.update({
          where: { id: item.id },
          data: {
            status: shouldRetry ? 'Pending' : 'Failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            nextAttemptAt: shouldRetry ? new Date(Date.now() + (item.attempts * 5 * 60 * 1000)) : null // Exponential backoff
          }
        })
      }
    }
  }

  // Convenience methods for specific notification types

  /**
   * Send task-related notification
   */
  async notifyTaskUpdate(
    taskId: string,
    type: NotificationType,
    recipientIds: string[],
    taskData: any,
    orgId: string
  ): Promise<void> {
    const data = {
      orgId,
      type,
      category: NotificationCategory.TASK,
      title: this.getTaskNotificationTitle(type, taskData),
      message: this.getTaskNotificationMessage(type, taskData),
      entityType: 'Task',
      entityId: taskId,
      data: taskData,
      priority: type.includes('OVERDUE') ? NotificationPriority.High : NotificationPriority.Medium
    }

    await this.createBulkNotifications(recipientIds, data)
  }

  /**
   * Send report-related notification
   */
  async notifyReportUpdate(
    type: NotificationType,
    recipientIds: string[],
    reportData: any,
    orgId: string,
    scheduledFor?: Date
  ): Promise<void> {
    const data = {
      orgId,
      type,
      category: NotificationCategory.REPORT,
      title: this.getReportNotificationTitle(type, reportData),
      message: this.getReportNotificationMessage(type, reportData),
      entityType: 'WeeklyReport',
      entityId: reportData.id,
      data: reportData,
      priority: type.includes('OVERDUE') ? NotificationPriority.High : NotificationPriority.Medium,
      scheduledFor
    }

    await this.createBulkNotifications(recipientIds, data)
  }

  /**
   * Send meeting-related notification
   */
  async notifyMeetingUpdate(
    meetingId: string,
    type: NotificationType,
    recipientIds: string[],
    meetingData: any,
    orgId: string,
    scheduledFor?: Date
  ): Promise<void> {
    const data = {
      orgId,
      type,
      category: NotificationCategory.MEETING,
      title: this.getMeetingNotificationTitle(type, meetingData),
      message: this.getMeetingNotificationMessage(type, meetingData),
      entityType: 'Meeting',
      entityId: meetingId,
      data: meetingData,
      priority: type.includes('STARTING_SOON') ? NotificationPriority.High : NotificationPriority.Medium,
      scheduledFor
    }

    await this.createBulkNotifications(recipientIds, data)
  }

  // Helper methods for generating notification content
  private getTaskNotificationTitle(type: NotificationType, taskData: any): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return `Task assigned: ${taskData.title}`
      case NotificationType.TASK_DUE_SOON:
        return `Task due soon: ${taskData.title}`
      case NotificationType.TASK_OVERDUE:
        return `Task overdue: ${taskData.title}`
      case NotificationType.TASK_STATUS_CHANGED:
        return `Task status updated: ${taskData.title}`
      case NotificationType.TASK_COMMENT_ADDED:
        return `New comment on: ${taskData.title}`
      default:
        return `Task update: ${taskData.title}`
    }
  }

  private getTaskNotificationMessage(type: NotificationType, taskData: any): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return `You have been assigned to work on "${taskData.title}" in project "${taskData.projectName}".`
      case NotificationType.TASK_DUE_SOON:
        return `The task "${taskData.title}" is due on ${new Date(taskData.dueDate).toLocaleDateString()}.`
      case NotificationType.TASK_OVERDUE:
        return `The task "${taskData.title}" was due on ${new Date(taskData.dueDate).toLocaleDateString()} and is now overdue.`
      case NotificationType.TASK_STATUS_CHANGED:
        return `The status of "${taskData.title}" has been changed to "${taskData.status}".`
      case NotificationType.TASK_COMMENT_ADDED:
        return `${taskData.commenterName} added a comment to "${taskData.title}".`
      default:
        return `Task "${taskData.title}" has been updated.`
    }
  }

  private getReportNotificationTitle(type: NotificationType, reportData: any): string {
    switch (type) {
      case NotificationType.WEEKLY_PLAN_DUE:
        return 'Weekly plan due tomorrow'
      case NotificationType.WEEKLY_PLAN_OVERDUE:
        return 'Weekly plan overdue'
      case NotificationType.WEEKLY_REPORT_DUE:
        return 'Weekly report due tomorrow'
      case NotificationType.WEEKLY_REPORT_OVERDUE:
        return 'Weekly report overdue'
      case NotificationType.REPORT_SUBMISSION_RECEIVED:
        return `${reportData.type} submitted`
      case NotificationType.LOW_COMPLIANCE_ALERT:
        return 'Low team compliance alert'
      default:
        return 'Weekly report update'
    }
  }

  private getReportNotificationMessage(type: NotificationType, reportData: any): string {
    switch (type) {
      case NotificationType.WEEKLY_PLAN_DUE:
        return `Your weekly plan for the week of ${new Date(reportData.weekStart).toLocaleDateString()} is due tomorrow. Please submit it by 10:00 AM.`
      case NotificationType.WEEKLY_PLAN_OVERDUE:
        return `Your weekly plan for the week of ${new Date(reportData.weekStart).toLocaleDateString()} is overdue. Please submit it as soon as possible.`
      case NotificationType.WEEKLY_REPORT_DUE:
        return `Your weekly report for the week of ${new Date(reportData.weekStart).toLocaleDateString()} is due tomorrow. Please submit it by 5:00 PM.`
      case NotificationType.WEEKLY_REPORT_OVERDUE:
        return `Your weekly report for the week of ${new Date(reportData.weekStart).toLocaleDateString()} is overdue. Please submit it as soon as possible.`
      case NotificationType.REPORT_SUBMISSION_RECEIVED:
        return `${reportData.userName} has submitted their ${reportData.type.toLowerCase()} for the week of ${new Date(reportData.weekStart).toLocaleDateString()}.`
      case NotificationType.LOW_COMPLIANCE_ALERT:
        return `Team compliance has dropped to ${reportData.complianceRate}%. Please follow up with team members who haven't submitted their reports.`
      default:
        return 'Your weekly report has been updated.'
    }
  }

  private getMeetingNotificationTitle(type: NotificationType, meetingData: any): string {
    switch (type) {
      case NotificationType.MEETING_SCHEDULED:
        return `Meeting scheduled: ${meetingData.title}`
      case NotificationType.MEETING_REMINDER:
        return `Meeting reminder: ${meetingData.title}`
      case NotificationType.MEETING_CANCELLED:
        return `Meeting cancelled: ${meetingData.title}`
      case NotificationType.MEETING_UPDATED:
        return `Meeting updated: ${meetingData.title}`
      case NotificationType.MEETING_STARTING_SOON:
        return `Meeting starting soon: ${meetingData.title}`
      default:
        return `Meeting update: ${meetingData.title}`
    }
  }

  private getMeetingNotificationMessage(type: NotificationType, meetingData: any): string {
    switch (type) {
      case NotificationType.MEETING_SCHEDULED:
        return `You have been invited to "${meetingData.title}" on ${new Date(meetingData.startTime).toLocaleDateString()} at ${new Date(meetingData.startTime).toLocaleTimeString()}.`
      case NotificationType.MEETING_REMINDER:
        return `Don't forget about "${meetingData.title}" scheduled for ${new Date(meetingData.startTime).toLocaleDateString()} at ${new Date(meetingData.startTime).toLocaleTimeString()}.`
      case NotificationType.MEETING_CANCELLED:
        return `The meeting "${meetingData.title}" scheduled for ${new Date(meetingData.startTime).toLocaleDateString()} has been cancelled.`
      case NotificationType.MEETING_UPDATED:
        return `The meeting "${meetingData.title}" has been updated. Please check the new details.`
      case NotificationType.MEETING_STARTING_SOON:
        return `"${meetingData.title}" is starting in 15 minutes. Join now: ${meetingData.meetingLink}`
      default:
        return `Meeting "${meetingData.title}" has been updated.`
    }
  }
}