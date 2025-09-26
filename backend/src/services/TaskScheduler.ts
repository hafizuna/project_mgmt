import * as schedule from 'node-schedule'
import { ReportNotificationService } from './ReportNotificationService.js'
import { NotificationService } from './NotificationService.js'
import { NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client'
import { prisma } from '../lib/database.js'

export class TaskScheduler {
  private static instance: TaskScheduler
  private reportNotificationService: ReportNotificationService
  private notificationService: NotificationService
  private scheduledJobs: Map<string, schedule.Job> = new Map()

  private constructor() {
    this.reportNotificationService = ReportNotificationService.getInstance()
    this.notificationService = NotificationService.getInstance()
  }

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler()
    }
    return TaskScheduler.instance
  }

  /**
   * Initialize all scheduled tasks
   */
  public initialize(): void {
    console.log('🕐 Initializing task scheduler...')

    // Daily reminder checks at 9:00 AM
    this.scheduleJob('daily-plan-reminders', '0 9 * * *', async () => {
      console.log('⏰ Running daily plan reminder check...')
      await this.reportNotificationService.checkWeeklyPlanReminders()
    })

    // Daily report reminder checks at 2:00 PM
    this.scheduleJob('daily-report-reminders', '0 14 * * *', async () => {
      console.log('⏰ Running daily report reminder check...')
      await this.reportNotificationService.checkWeeklyReportReminders()
    })

    // Weekly compliance alerts on Mondays at 10:00 AM
    this.scheduleJob('weekly-compliance-alerts', '0 10 * * 1', async () => {
      console.log('⏰ Running weekly compliance alert check...')
      await this.reportNotificationService.checkComplianceAlerts()
    })

    // Process scheduled notifications every 15 minutes
    this.scheduleJob('process-scheduled-notifications', '*/15 * * * *', async () => {
      await this.reportNotificationService.processScheduledNotifications()
    })

    // Additional reminder check at 4:00 PM for end-of-day deadlines
    this.scheduleJob('evening-reminders', '0 16 * * *', async () => {
      console.log('⏰ Running evening reminder check...')
      await this.reportNotificationService.checkWeeklyPlanReminders()
      await this.reportNotificationService.checkWeeklyReportReminders()
    })

    // Task due date reminders - Check every 2 hours during work hours
    this.scheduleJob('task-due-reminders', '0 8,10,12,14,16,18 * * *', async () => {
      console.log('⏰ Running task due date reminder check...')
      await this.checkTaskDueReminders()
    })

    // Meeting reminders - Check every 30 minutes for upcoming meetings
    this.scheduleJob('meeting-reminders', '*/30 * * * *', async () => {
      console.log('⏰ Running meeting reminder check...')
      await this.checkMeetingReminders()
    })

    console.log('✅ Task scheduler initialized with all jobs')
    this.logScheduledJobs()
  }

  /**
   * Schedule a job with error handling
   */
  private scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    try {
      const job = schedule.scheduleJob(cronExpression, async () => {
        try {
          await task()
        } catch (error) {
          console.error(`❌ Error in scheduled job '${name}':`, error)
        }
      })

      if (job) {
        this.scheduledJobs.set(name, job)
        console.log(`📅 Scheduled job '${name}' with cron '${cronExpression}'`)
      } else {
        console.error(`❌ Failed to schedule job '${name}'`)
      }
    } catch (error) {
      console.error(`❌ Error scheduling job '${name}':`, error)
    }
  }

  /**
   * Cancel a specific scheduled job
   */
  public cancelJob(name: string): boolean {
    const job = this.scheduledJobs.get(name)
    if (job) {
      const success = job.cancel()
      if (success) {
        this.scheduledJobs.delete(name)
        console.log(`🗑️ Cancelled job '${name}'`)
      }
      return success
    }
    return false
  }

  /**
   * Cancel all scheduled jobs
   */
  public cancelAllJobs(): void {
    console.log('🗑️ Cancelling all scheduled jobs...')
    
    for (const [name, job] of this.scheduledJobs) {
      job.cancel()
      console.log(`🗑️ Cancelled job '${name}'`)
    }
    
    this.scheduledJobs.clear()
    console.log('✅ All scheduled jobs cancelled')
  }

  /**
   * Get information about all scheduled jobs
   */
  public getJobInfo(): Array<{
    name: string
    nextInvocation: Date | null
    pendingInvocations: any[]
  }> {
    const jobInfo: Array<{
      name: string
      nextInvocation: Date | null
      pendingInvocations: any[]
    }> = []

    for (const [name, job] of this.scheduledJobs) {
      jobInfo.push({
        name,
        nextInvocation: job.nextInvocation(),
        pendingInvocations: job.pendingInvocations
      })
    }

    return jobInfo
  }

  /**
   * Log information about scheduled jobs
   */
  private logScheduledJobs(): void {
    console.log('📋 Scheduled Jobs Summary:')
    
    const jobInfo = this.getJobInfo()
    for (const info of jobInfo) {
      console.log(`  • ${info.name}: Next run at ${info.nextInvocation?.toLocaleString() || 'Never'}`)
    }
  }

  /**
   * Check for tasks due soon and send reminders
   */
  private async checkTaskDueReminders(): Promise<void> {
    try {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(23, 59, 59, 999)

      const overdue = new Date(now)
      overdue.setHours(0, 0, 0, 0)

      // Find tasks due soon (within 24 hours) that haven't been completed
      const tasksDueSoon = await prisma.task.findMany({
        where: {
          dueDate: {
            gte: now,
            lte: tomorrow
          },
          status: {
            not: 'Done'
          },
          assigneeId: {
            not: null
          }
        },
        include: {
          assignee: {
            select: { id: true, name: true }
          },
          project: {
            select: { id: true, name: true, orgId: true }
          }
        }
      })

      // Find overdue tasks
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: {
            lt: overdue
          },
          status: {
            not: 'Done'
          },
          assigneeId: {
            not: null
          }
        },
        include: {
          assignee: {
            select: { id: true, name: true }
          },
          project: {
            select: { id: true, name: true, orgId: true }
          }
        }
      })

      // Send due soon notifications
      for (const task of tasksDueSoon) {
        if (task.assignee && task.project) {
          const dueDate = task.dueDate!.toLocaleDateString()
          await this.notificationService.createNotification({
            userId: task.assignee.id,
            orgId: task.project.orgId,
            type: NotificationType.TASK_DUE_SOON,
            category: NotificationCategory.TASK,
            title: `Task due soon: ${task.title}`,
            message: `Your task "${task.title}" is due on ${dueDate}`,
            data: {
              taskId: task.id,
              projectId: task.projectId,
              dueDate: task.dueDate,
              priority: task.priority
            },
            entityType: 'Task',
            entityId: task.id,
            priority: task.priority === 'Critical' ? NotificationPriority.High : NotificationPriority.Medium
          })
        }
      }

      // Send overdue notifications
      for (const task of overdueTasks) {
        if (task.assignee && task.project) {
          const overdueDays = Math.floor((now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24))
          await this.notificationService.createNotification({
            userId: task.assignee.id,
            orgId: task.project.orgId,
            type: NotificationType.TASK_OVERDUE,
            category: NotificationCategory.TASK,
            title: `Task overdue: ${task.title}`,
            message: `Your task "${task.title}" is ${overdueDays} day(s) overdue`,
            data: {
              taskId: task.id,
              projectId: task.projectId,
              dueDate: task.dueDate,
              overdueDays
            },
            entityType: 'Task',
            entityId: task.id,
            priority: NotificationPriority.High
          })
        }
      }

      console.log(`📋 Processed ${tasksDueSoon.length} due soon tasks, ${overdueTasks.length} overdue tasks`)
    } catch (error) {
      console.error('❌ Error checking task due reminders:', error)
    }
  }

  /**
   * Check for upcoming meetings and send reminders
   */
  private async checkMeetingReminders(): Promise<void> {
    try {
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)

      // Find meetings starting in 1 hour
      const meetingsInOneHour = await prisma.meeting.findMany({
        where: {
          startTime: {
            gte: now,
            lte: oneHourFromNow
          },
          status: {
            not: 'Completed'
          }
        },
        include: {
          attendees: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          project: {
            select: { orgId: true }
          }
        }
      })

      // Find meetings starting in 15 minutes
      const meetingsInFifteenMinutes = await prisma.meeting.findMany({
        where: {
          startTime: {
            gte: now,
            lte: fifteenMinutesFromNow
          },
          status: {
            not: 'Completed'
          }
        },
        include: {
          attendees: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          project: {
            select: { orgId: true }
          }
        }
      })

      // Send 1-hour reminders
      for (const meeting of meetingsInOneHour) {
        for (const attendee of meeting.attendees) {
          const meetingTime = meeting.startTime.toLocaleTimeString()
          await this.notificationService.createNotification({
            userId: attendee.userId,
            orgId: meeting.orgId,
            type: NotificationType.MEETING_REMINDER,
            category: NotificationCategory.MEETING,
            title: `Meeting in 1 hour: ${meeting.title}`,
            message: `"${meeting.title}" starts at ${meetingTime}`,
            data: {
              meetingId: meeting.id,
              startTime: meeting.startTime,
              location: meeting.location,
              meetingLink: meeting.meetingLink,
              reminderType: '1hour'
            },
            entityType: 'Meeting',
            entityId: meeting.id,
            priority: NotificationPriority.Medium
          })
        }
      }

      // Send 15-minute reminders
      for (const meeting of meetingsInFifteenMinutes) {
        for (const attendee of meeting.attendees) {
          const meetingTime = meeting.startTime.toLocaleTimeString()
          await this.notificationService.createNotification({
            userId: attendee.userId,
            orgId: meeting.orgId,
            type: NotificationType.MEETING_REMINDER,
            category: NotificationCategory.MEETING,
            title: `Meeting starting soon: ${meeting.title}`,
            message: `"${meeting.title}" starts in 15 minutes at ${meetingTime}`,
            data: {
              meetingId: meeting.id,
              startTime: meeting.startTime,
              location: meeting.location,
              meetingLink: meeting.meetingLink,
              reminderType: '15minutes'
            },
            entityType: 'Meeting',
            entityId: meeting.id,
            priority: NotificationPriority.High
          })
        }
      }

      console.log(`📅 Processed ${meetingsInOneHour.length} 1-hour reminders, ${meetingsInFifteenMinutes.length} 15-minute reminders`)
    } catch (error) {
      console.error('❌ Error checking meeting reminders:', error)
    }
  }

  /**
   * Run a specific notification check manually (for testing)
   */
  public async runManualCheck(type: 'plan' | 'report' | 'compliance' | 'scheduled' | 'tasks' | 'meetings'): Promise<void> {
    console.log(`🔧 Running manual ${type} check...`)

    try {
      switch (type) {
        case 'plan':
          await this.reportNotificationService.checkWeeklyPlanReminders()
          break
        case 'report':
          await this.reportNotificationService.checkWeeklyReportReminders()
          break
        case 'compliance':
          await this.reportNotificationService.checkComplianceAlerts()
          break
        case 'scheduled':
          await this.reportNotificationService.processScheduledNotifications()
          break
        case 'tasks':
          await this.checkTaskDueReminders()
          break
        case 'meetings':
          await this.checkMeetingReminders()
          break
        default:
          throw new Error(`Unknown check type: ${type}`)
      }

      console.log(`✅ Manual ${type} check completed`)
    } catch (error) {
      console.error(`❌ Error in manual ${type} check:`, error)
      throw error
    }
  }

  /**
   * Reschedule a job with new cron expression
   */
  public rescheduleJob(name: string, newCronExpression: string): boolean {
    const job = this.scheduledJobs.get(name)
    if (job) {
      try {
        const success = job.reschedule(newCronExpression)
        if (success) {
          console.log(`📅 Rescheduled job '${name}' with new cron '${newCronExpression}'`)
        }
        return success
      } catch (error) {
        console.error(`❌ Error rescheduling job '${name}':`, error)
        return false
      }
    }
    return false
  }

  /**
   * Check if scheduler is running
   */
  public isRunning(): boolean {
    return this.scheduledJobs.size > 0
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean
    jobCount: number
    jobs: Array<{
      name: string
      nextRun: string | null
    }>
  } {
    const jobs = this.getJobInfo().map(info => ({
      name: info.name,
      nextRun: info.nextInvocation?.toLocaleString() || null
    }))

    return {
      isRunning: this.isRunning(),
      jobCount: this.scheduledJobs.size,
      jobs
    }
  }

  /**
   * Initialize default report settings for all organizations
   */
  public async initializeAllReportSettings(): Promise<void> {
    try {
      console.log('🔧 Initializing report settings for all organizations...')
      
      const organizations = await prisma.organization.findMany({
        select: { id: true, name: true }
      })

      for (const org of organizations) {
        await this.reportNotificationService.initializeReportSettings(org.id)
      }
      console.log(`✅ Report settings initialized for ${organizations.length} organizations`)
    } catch (error) {
      console.error('❌ Error initializing report settings:', error)
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down task scheduler...')
  TaskScheduler.getInstance().cancelAllJobs()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down task scheduler...')
  TaskScheduler.getInstance().cancelAllJobs()
  process.exit(0)
})