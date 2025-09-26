import { NotificationType, Role, SubmissionStatus } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { NotificationService } from './NotificationService.js'
import { EmailService } from './EmailService.js'

export class ReportNotificationService {
  private static instance: ReportNotificationService
  private notificationService: NotificationService
  private emailService: EmailService

  private constructor() {
    this.notificationService = NotificationService.getInstance()
    this.emailService = EmailService.getInstance()
  }

  public static getInstance(): ReportNotificationService {
    if (!ReportNotificationService.instance) {
      ReportNotificationService.instance = new ReportNotificationService()
    }
    return ReportNotificationService.instance
  }

  /**
   * Get week dates (Monday to Sunday)
   */
  private getWeekDates(date: Date) {
    const monday = new Date(date)
    const dayOfWeek = monday.getDay()
    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    monday.setDate(diff)
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    
    return { weekStart: monday, weekEnd: sunday }
  }

  /**
   * Get organization's report settings or defaults
   */
  private async getReportSettings(orgId: string) {
    const settings = await prisma.reportSettings.findUnique({
      where: { orgId }
    })

    // Return defaults if no settings exist
    return settings || {
      planDueDay: 1, // Monday
      planDueTime: '10:00',
      planReminderDays: [0, 1], // Sunday, Monday
      reportDueDay: 5, // Friday
      reportDueTime: '17:00',
      reportReminderDays: [3, 4, 5], // Wed, Thu, Fri
      isEnforced: true,
      gracePeriodHours: 24,
      emailNotifications: true,
      inAppNotifications: true,
      managerNotifications: true
    }
  }

  /**
   * Get all active team members (exclude admins from reporting)
   */
  private async getActiveTeamMembers(orgId: string) {
    return await prisma.user.findMany({
      where: {
        orgId,
        isActive: true,
        role: { not: Role.Admin } // Exclude admins from reporting
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        notificationPreferences: true
      }
    })
  }

  /**
   * Check weekly plan reminders - run daily
   */
  async checkWeeklyPlanReminders(): Promise<void> {
    console.log('🔔 Checking weekly plan reminders...')

    try {
      // Get all organizations
      const organizations = await prisma.organization.findMany({
        select: { id: true, name: true }
      })

      for (const org of organizations) {
        await this.processWeeklyPlanReminders(org.id)
      }

      console.log('✅ Weekly plan reminder check completed')
    } catch (error) {
      console.error('❌ Error checking weekly plan reminders:', error)
    }
  }

  /**
   * Process weekly plan reminders for an organization
   */
  private async processWeeklyPlanReminders(orgId: string): Promise<void> {
    const settings = await this.getReportSettings(orgId)
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentHour = now.getHours()

    // Check if today is a reminder day
    if (!settings.planReminderDays.includes(currentDay)) {
      return
    }

    // Get current week dates
    const { weekStart, weekEnd } = this.getWeekDates(now)

    // Calculate plan due date
    const planDueDate = new Date(weekStart)
    planDueDate.setDate(planDueDate.getDate() + (settings.planDueDay - 1))
    const [planHour, planMinute] = settings.planDueTime.split(':')
    planDueDate.setHours(parseInt(planHour), parseInt(planMinute), 0, 0)

    // Get team members who need reminders
    const teamMembers = await this.getActiveTeamMembers(orgId)

    for (const member of teamMembers) {
      // Check if user wants report notifications
      if (!member.notificationPreferences?.reportNotifications) {
        continue
      }

      // Check if plan already exists for this week
      const existingPlan = await prisma.weeklyPlan.findUnique({
        where: {
          userId_weekStart: {
            userId: member.id,
            weekStart
          }
        }
      })

      // Skip if plan is already submitted
      if (existingPlan?.status === SubmissionStatus.Submitted) {
        continue
      }

      // Determine reminder type based on timing
      let reminderType: NotificationType
      const isOverdue = now > planDueDate
      const isDueToday = now.toDateString() === planDueDate.toDateString()
      const isDueTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === planDueDate.toDateString()

      if (isOverdue) {
        reminderType = NotificationType.WEEKLY_PLAN_OVERDUE
      } else if (isDueToday && currentHour >= parseInt(planHour) - 2) {
        reminderType = NotificationType.WEEKLY_PLAN_DUE
      } else if (isDueTomorrow) {
        reminderType = NotificationType.WEEKLY_PLAN_DUE
      } else {
        continue // Not time for reminder yet
      }

      // Check if we already sent this type of reminder recently
      const recentReminder = await prisma.notification.findFirst({
        where: {
          userId: member.id,
          type: reminderType,
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      if (recentReminder) {
        continue // Already sent this reminder recently
      }

      // Send reminder notification
      await this.notificationService.notifyReportUpdate(
        reminderType,
        [member.id],
        {
          userName: member.name,
          weekStart: weekStart.toISOString(),
          dueDate: planDueDate.toISOString(),
          dueTime: settings.planDueTime,
          type: 'Weekly Plan'
        },
        orgId
      )

      // Mark plan as overdue in database if needed
      if (isOverdue && existingPlan && existingPlan.status !== SubmissionStatus.Overdue) {
        await prisma.weeklyPlan.update({
          where: { id: existingPlan.id },
          data: { 
            status: SubmissionStatus.Overdue,
            isOverdue: true 
          }
        })
      }

      console.log(`📋 Sent ${reminderType} reminder to ${member.name}`)
    }
  }

  /**
   * Check weekly report reminders - run daily
   */
  async checkWeeklyReportReminders(): Promise<void> {
    console.log('🔔 Checking weekly report reminders...')

    try {
      // Get all organizations
      const organizations = await prisma.organization.findMany({
        select: { id: true, name: true }
      })

      for (const org of organizations) {
        await this.processWeeklyReportReminders(org.id)
      }

      console.log('✅ Weekly report reminder check completed')
    } catch (error) {
      console.error('❌ Error checking weekly report reminders:', error)
    }
  }

  /**
   * Process weekly report reminders for an organization
   */
  private async processWeeklyReportReminders(orgId: string): Promise<void> {
    const settings = await this.getReportSettings(orgId)
    const now = new Date()
    const currentDay = now.getDay()
    const currentHour = now.getHours()

    // Check if today is a reminder day
    if (!settings.reportReminderDays.includes(currentDay)) {
      return
    }

    // Get current week dates
    const { weekStart, weekEnd } = this.getWeekDates(now)

    // Calculate report due date
    const reportDueDate = new Date(weekStart)
    reportDueDate.setDate(reportDueDate.getDate() + (settings.reportDueDay - 1))
    const [reportHour, reportMinute] = settings.reportDueTime.split(':')
    reportDueDate.setHours(parseInt(reportHour), parseInt(reportMinute), 0, 0)

    // Get team members who need reminders
    const teamMembers = await this.getActiveTeamMembers(orgId)

    for (const member of teamMembers) {
      // Check if user wants report notifications
      if (!member.notificationPreferences?.reportNotifications) {
        continue
      }

      // Check if weekly plan exists and is submitted (required for report)
      const weeklyPlan = await prisma.weeklyPlan.findUnique({
        where: {
          userId_weekStart: {
            userId: member.id,
            weekStart
          }
        },
        include: {
          weeklyReport: true
        }
      })

      // Skip if no plan exists or plan not submitted
      if (!weeklyPlan || weeklyPlan.status !== SubmissionStatus.Submitted) {
        continue
      }

      // Skip if report is already submitted
      if (weeklyPlan.weeklyReport?.status === SubmissionStatus.Submitted) {
        continue
      }

      // Determine reminder type based on timing
      let reminderType: NotificationType
      const isOverdue = now > reportDueDate
      const isDueToday = now.toDateString() === reportDueDate.toDateString()
      const isDueTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === reportDueDate.toDateString()

      if (isOverdue) {
        reminderType = NotificationType.WEEKLY_REPORT_OVERDUE
      } else if (isDueToday && currentHour >= parseInt(reportHour) - 2) {
        reminderType = NotificationType.WEEKLY_REPORT_DUE
      } else if (isDueTomorrow) {
        reminderType = NotificationType.WEEKLY_REPORT_DUE
      } else {
        continue // Not time for reminder yet
      }

      // Check if we already sent this type of reminder recently
      const recentReminder = await prisma.notification.findFirst({
        where: {
          userId: member.id,
          type: reminderType,
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      if (recentReminder) {
        continue // Already sent this reminder recently
      }

      // Send reminder notification
      await this.notificationService.notifyReportUpdate(
        reminderType,
        [member.id],
        {
          userName: member.name,
          weekStart: weekStart.toISOString(),
          dueDate: reportDueDate.toISOString(),
          dueTime: settings.reportDueTime,
          type: 'Weekly Report'
        },
        orgId
      )

      // Mark report as overdue in database if needed
      if (isOverdue && weeklyPlan.weeklyReport && weeklyPlan.weeklyReport.status !== SubmissionStatus.Overdue) {
        await prisma.weeklyReport.update({
          where: { id: weeklyPlan.weeklyReport.id },
          data: { 
            status: SubmissionStatus.Overdue,
            isOverdue: true 
          }
        })
      }

      console.log(`📊 Sent ${reminderType} reminder to ${member.name}`)
    }
  }

  /**
   * Check compliance and send admin alerts - run weekly
   */
  async checkComplianceAlerts(): Promise<void> {
    console.log('🚨 Checking compliance alerts...')

    try {
      // Get all organizations
      const organizations = await prisma.organization.findMany({
        select: { id: true, name: true }
      })

      for (const org of organizations) {
        await this.processComplianceAlerts(org.id)
      }

      console.log('✅ Compliance alert check completed')
    } catch (error) {
      console.error('❌ Error checking compliance alerts:', error)
    }
  }

  /**
   * Process compliance alerts for an organization
   */
  private async processComplianceAlerts(orgId: string): Promise<void> {
    const settings = await this.getReportSettings(orgId)

    if (!settings.managerNotifications) {
      return
    }

    // Get current week dates
    const { weekStart, weekEnd } = this.getWeekDates(new Date())

    // Get all active team members
    const teamMembers = await this.getActiveTeamMembers(orgId)
    const totalUsers = teamMembers.length

    if (totalUsers === 0) {
      return
    }

    // Get submitted plans and reports for this week
    const [submittedPlans, submittedReports] = await Promise.all([
      prisma.weeklyPlan.count({
        where: {
          orgId,
          weekStart,
          status: SubmissionStatus.Submitted
        }
      }),
      prisma.weeklyReport.count({
        where: {
          orgId,
          weekStart,
          status: SubmissionStatus.Submitted
        }
      })
    ])

    // Calculate compliance rates
    const planComplianceRate = Math.round((submittedPlans / totalUsers) * 100)
    const reportComplianceRate = Math.round((submittedReports / totalUsers) * 100)

    // Check if compliance is below threshold (80%)
    const lowCompliance = planComplianceRate < 80 || reportComplianceRate < 80

    if (!lowCompliance) {
      return
    }

    // Get overdue counts
    const [overduePlans, overdueReports] = await Promise.all([
      prisma.weeklyPlan.count({
        where: {
          orgId,
          weekStart,
          isOverdue: true
        }
      }),
      prisma.weeklyReport.count({
        where: {
          orgId,
          weekStart,
          isOverdue: true
        }
      })
    ])

    // Get admins and managers to notify
    const admins = await prisma.user.findMany({
      where: {
        orgId,
        isActive: true,
        role: { in: [Role.Admin, Role.Manager] },
        notificationPreferences: {
          reportNotifications: true
        }
      }
    })

    if (admins.length === 0) {
      return
    }

    // Check if we already sent compliance alert this week
    const existingAlert = await prisma.notification.findFirst({
      where: {
        orgId,
        type: NotificationType.LOW_COMPLIANCE_ALERT,
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      }
    })

    if (existingAlert) {
      return // Already sent this week
    }

    // Send compliance alert to admins
    const adminIds = admins.map(admin => admin.id)
    const complianceData = {
      complianceRate: Math.min(planComplianceRate, reportComplianceRate),
      planComplianceRate,
      reportComplianceRate,
      overdueCount: overduePlans + overdueReports,
      overduePlans,
      overdueReports,
      totalUsers,
      weekStart: weekStart.toISOString()
    }

    await this.notificationService.notifyReportUpdate(
      NotificationType.LOW_COMPLIANCE_ALERT,
      adminIds,
      complianceData,
      orgId
    )

    console.log(`🚨 Sent compliance alert to ${adminIds.length} admins (${complianceData.complianceRate}% compliance)`)
  }

  /**
   * Send notification when a report is submitted (for admin awareness)
   */
  async notifyReportSubmission(reportId: string, type: 'plan' | 'report'): Promise<void> {
    try {
      const report = type === 'plan' 
        ? await prisma.weeklyPlan.findUnique({
            where: { id: reportId },
            include: { user: true }
          })
        : await prisma.weeklyReport.findUnique({
            where: { id: reportId },
            include: { user: true, weeklyPlan: true }
          })

      if (!report) {
        return
      }

      // Get organization settings
      const settings = await this.getReportSettings(report.orgId)
      
      if (!settings.managerNotifications) {
        return
      }

      // Get managers and admins to notify
      const managers = await prisma.user.findMany({
        where: {
          orgId: report.orgId,
          isActive: true,
          role: { in: [Role.Admin, Role.Manager] },
          notificationPreferences: {
            reportNotifications: true
          }
        }
      })

      if (managers.length === 0) {
        return
      }

      const managerIds = managers.map(m => m.id)
      const submissionData = {
        userName: report.user.name,
        type: type === 'plan' ? 'Weekly Plan' : 'Weekly Report',
        weekStart: report.weekStart.toISOString(),
        submittedAt: new Date().toISOString()
      }

      await this.notificationService.notifyReportUpdate(
        NotificationType.REPORT_SUBMISSION_RECEIVED,
        managerIds,
        submissionData,
        report.orgId
      )

      console.log(`📨 Notified ${managerIds.length} managers of ${type} submission by ${report.user.name}`)
    } catch (error) {
      console.error('Error notifying report submission:', error)
    }
  }

  /**
   * Process scheduled notifications queue
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      await this.notificationService.processScheduledNotifications()
    } catch (error) {
      console.error('Error processing scheduled notifications:', error)
    }
  }

  /**
   * Get notification statistics for the last N days
   */
  async getNotificationStats(orgId: string, days: number = 7): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const [totalNotifications, deliveredNotifications, reportNotifications, overdueAlerts] = await Promise.all([
        prisma.notification.count({
          where: {
            orgId,
            createdAt: { gte: startDate }
          }
        }),
        prisma.notification.count({
          where: {
            orgId,
            deliveredAt: { not: null },
            createdAt: { gte: startDate }
          }
        }),
        prisma.notification.count({
          where: {
            orgId,
            type: { in: ['WEEKLY_PLAN_DUE', 'WEEKLY_REPORT_DUE'] },
            createdAt: { gte: startDate }
          }
        }),
        prisma.notification.count({
          where: {
            orgId,
            type: { in: ['WEEKLY_PLAN_OVERDUE', 'WEEKLY_REPORT_OVERDUE'] },
            createdAt: { gte: startDate }
          }
        })
      ])

      const deliveryRate = totalNotifications > 0 ? Math.round((deliveredNotifications / totalNotifications) * 100) : 0

      return {
        totalNotifications,
        deliveredNotifications,
        reportNotifications,
        overdueAlerts,
        deliveryRate,
        period: `${days} days`
      }
    } catch (error) {
      console.error('Error getting notification stats:', error)
      throw error
    }
  }

  /**
   * Initialize default report settings for an organization
   */
  async initializeReportSettings(orgId: string): Promise<void> {
    try {
      const existingSettings = await prisma.reportSettings.findUnique({
        where: { orgId }
      })

      if (existingSettings) {
        return // Settings already exist
      }

      await prisma.reportSettings.create({
        data: {
          orgId,
          planDueDay: 1, // Monday
          planDueTime: '10:00',
          planReminderDays: [0, 1], // Sunday, Monday
          reportDueDay: 5, // Friday
          reportDueTime: '17:00',
          reportReminderDays: [3, 4, 5], // Wed, Thu, Fri
          isEnforced: true,
          gracePeriodHours: 24,
          emailNotifications: true,
          inAppNotifications: true,
          managerNotifications: true
        }
      })

      console.log(`✅ Initialized default report settings for organization ${orgId}`)
    } catch (error) {
      console.error(`Error initializing report settings for organization ${orgId}:`, error)
    }
  }
}
