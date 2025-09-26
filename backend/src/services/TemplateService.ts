import { NotificationType, NotificationCategory } from '@prisma/client'
import { prisma } from '../lib/database.js'

export interface TemplateData {
  id: string
  orgId: string
  type: NotificationType
  category: NotificationCategory
  name: string
  description?: string
  titleTemplate: string
  messageTemplate: string
  emailSubject?: string
  emailTemplate?: string
  variables: any
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export class TemplateService {
  private static instance: TemplateService

  private constructor() {}

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService()
    }
    return TemplateService.instance
  }

  /**
   * Get template for notification type and organization
   */
  async getTemplate(orgId: string, type: NotificationType): Promise<TemplateData | null> {
    try {
      const template = await prisma.notificationTemplate.findFirst({
        where: {
          orgId,
          type,
          isActive: true,
        },
        orderBy: [
          { isDefault: 'desc' }, // Default templates first
          { createdAt: 'desc' }
        ]
      })

      return template as TemplateData | null
    } catch (error) {
      console.error(`Error getting template for type ${type}:`, error)
      return null
    }
  }

  /**
   * Create default templates for an organization
   */
  async createDefaultTemplates(orgId: string): Promise<void> {
    const defaultTemplates = [
      // Task Templates
      {
        orgId,
        type: NotificationType.TASK_ASSIGNED,
        category: NotificationCategory.TASK,
        name: 'Task Assignment',
        description: 'Notification when a task is assigned to a user',
        titleTemplate: 'Task assigned: {{taskTitle}}',
        messageTemplate: 'You have been assigned to work on "{{taskTitle}}" in project "{{projectName}}". Due date: {{dueDate}}',
        emailSubject: 'New Task Assignment: {{taskTitle}}',
        emailTemplate: this.generateTaskAssignmentEmailTemplate(),
        variables: {
          taskTitle: 'string',
          projectName: 'string', 
          dueDate: 'string',
          assignerName: 'string',
          taskDescription: 'string',
          taskPriority: 'string'
        },
        isActive: true,
        isDefault: true,
      },
      {
        orgId,
        type: NotificationType.TASK_DUE_SOON,
        category: NotificationCategory.TASK,
        name: 'Task Due Soon',
        description: 'Notification when a task is due soon',
        titleTemplate: 'Task due soon: {{taskTitle}}',
        messageTemplate: 'The task "{{taskTitle}}" is due on {{dueDate}}. Please complete it soon.',
        emailSubject: 'Task Due Soon: {{taskTitle}}',
        emailTemplate: this.generateTaskDueSoonEmailTemplate(),
        variables: {
          taskTitle: 'string',
          projectName: 'string',
          dueDate: 'string',
          daysUntilDue: 'number'
        },
        isActive: true,
        isDefault: true,
      },
      // Report Templates  
      {
        orgId,
        type: NotificationType.WEEKLY_PLAN_DUE,
        category: NotificationCategory.REPORT,
        name: 'Weekly Plan Due',
        description: 'Reminder for weekly plan submission',
        titleTemplate: 'Weekly plan due tomorrow',
        messageTemplate: 'Your weekly plan for the week of {{weekStart}} is due tomorrow. Please submit it by {{dueTime}}.',
        emailSubject: 'Weekly Plan Due Tomorrow - Week of {{weekStart}}',
        emailTemplate: this.generateWeeklyPlanDueEmailTemplate(),
        variables: {
          userName: 'string',
          weekStart: 'string',
          dueDate: 'string',
          dueTime: 'string'
        },
        isActive: true,
        isDefault: true,
      },
      {
        orgId,
        type: NotificationType.WEEKLY_REPORT_DUE,
        category: NotificationCategory.REPORT,
        name: 'Weekly Report Due',
        description: 'Reminder for weekly report submission',
        titleTemplate: 'Weekly report due tomorrow',
        messageTemplate: 'Your weekly report for the week of {{weekStart}} is due tomorrow. Please submit it by {{dueTime}}.',
        emailSubject: 'Weekly Report Due Tomorrow - Week of {{weekStart}}',
        emailTemplate: this.generateWeeklyReportDueEmailTemplate(),
        variables: {
          userName: 'string',
          weekStart: 'string',
          dueDate: 'string',
          dueTime: 'string'
        },
        isActive: true,
        isDefault: true,
      },
      {
        orgId,
        type: NotificationType.LOW_COMPLIANCE_ALERT,
        category: NotificationCategory.REPORT,
        name: 'Low Compliance Alert',
        description: 'Alert for administrators when compliance drops',
        titleTemplate: 'Low team compliance alert',
        messageTemplate: 'Team compliance has dropped to {{complianceRate}}%. {{overdueCount}} reports are overdue.',
        emailSubject: 'ALERT: Low Team Compliance - {{complianceRate}}%',
        emailTemplate: this.generateComplianceAlertEmailTemplate(),
        variables: {
          adminName: 'string',
          complianceRate: 'number',
          overdueCount: 'number',
          weekStart: 'string'
        },
        isActive: true,
        isDefault: true,
      },
      // Meeting Templates
      {
        orgId,
        type: NotificationType.MEETING_REMINDER,
        category: NotificationCategory.MEETING,
        name: 'Meeting Reminder',
        description: 'Reminder for upcoming meetings',
        titleTemplate: 'Meeting reminder: {{meetingTitle}}',
        messageTemplate: 'Don\'t forget about "{{meetingTitle}}" scheduled for {{meetingDate}} at {{meetingTime}}.',
        emailSubject: 'Meeting Reminder: {{meetingTitle}}',
        emailTemplate: this.generateMeetingReminderEmailTemplate(),
        variables: {
          meetingTitle: 'string',
          meetingDate: 'string',
          meetingTime: 'string',
          meetingLocation: 'string',
          meetingLink: 'string'
        },
        isActive: true,
        isDefault: true,
      },
    ]

    // Create templates in batches to avoid conflicts
    for (const template of defaultTemplates) {
      try {
        await prisma.notificationTemplate.upsert({
          where: {
            orgId_type_name: {
              orgId: template.orgId,
              type: template.type,
              name: template.name
            }
          },
          update: {},
          create: template
        })
      } catch (error) {
        console.error(`Error creating template ${template.name}:`, error)
      }
    }

    console.log(`Created ${defaultTemplates.length} default templates for organization ${orgId}`)
  }

  /**
   * Render template with variables
   */
  async renderTemplate(template: string, variables: Record<string, any>): Promise<string> {
    try {
      let rendered = template

      // Simple variable substitution using {{variableName}} syntax
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g')
        rendered = rendered.replace(placeholder, String(value || ''))
      }

      // Clean up any remaining placeholders
      rendered = rendered.replace(/{{[^}]*}}/g, '')

      return rendered
    } catch (error) {
      console.error('Error rendering template:', error)
      return template // Return original template if rendering fails
    }
  }

  /**
   * Create or update a template
   */
  async createTemplate(templateData: Omit<TemplateData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateData> {
    const template = await prisma.notificationTemplate.create({
      data: templateData
    })

    return template as TemplateData
  }

  /**
   * Update a template
   */
  async updateTemplate(id: string, templateData: Partial<TemplateData>): Promise<TemplateData> {
    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: templateData
    })

    return template as TemplateData
  }

  /**
   * Get all templates for an organization
   */
  async getOrganizationTemplates(orgId: string): Promise<TemplateData[]> {
    const templates = await prisma.notificationTemplate.findMany({
      where: { orgId },
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { name: 'asc' }
      ]
    })

    return templates as TemplateData[]
  }

  // Email template generators
  private generateTaskAssignmentEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Task Assignment</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .task-details { background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
        .button { background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Task Assignment</h1>
        </div>
        <div class="content">
            <p>Hi there,</p>
            <p>You have been assigned a new task:</p>
            
            <div class="task-details">
                <h3>{{taskTitle}}</h3>
                <p><strong>Project:</strong> {{projectName}}</p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
                <p><strong>Priority:</strong> {{taskPriority}}</p>
                <p><strong>Assigned by:</strong> {{assignerName}}</p>
                {{#taskDescription}}<p><strong>Description:</strong> {{taskDescription}}</p>{{/taskDescription}}
            </div>
            
            <p>Please review the task details and start working on it as soon as possible.</p>
            
            <p><a href="{{appUrl}}/tasks" class="button">View Task</a></p>
        </div>
    </div>
</body>
</html>`
  }

  private generateTaskDueSoonEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Task Due Soon</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .warning { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
        .button { background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Task Due Soon</h1>
        </div>
        <div class="content">
            <div class="warning">
                <h3>{{taskTitle}}</h3>
                <p><strong>Project:</strong> {{projectName}}</p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
                <p><strong>Days remaining:</strong> {{daysUntilDue}}</p>
            </div>
            
            <p>This task is due soon. Please make sure to complete it before the deadline.</p>
            
            <p><a href="{{appUrl}}/tasks" class="button">View Task</a></p>
        </div>
    </div>
</body>
</html>`
  }

  private generateWeeklyPlanDueEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Plan Due</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .highlight { background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
        .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Weekly Plan Due Tomorrow</h1>
        </div>
        <div class="content">
            <p>Hi {{userName}},</p>
            
            <div class="highlight">
                <p><strong>Week:</strong> {{weekStart}}</p>
                <p><strong>Due:</strong> {{dueDate}} at {{dueTime}}</p>
            </div>
            
            <p>Your weekly plan is due tomorrow. Please include:</p>
            <ul>
                <li>Goals for the week</li>
                <li>Priority tasks</li>
                <li>Time allocation estimates</li>
                <li>Focus areas</li>
                <li>Any anticipated blockers</li>
            </ul>
            
            <p><a href="{{appUrl}}/reports" class="button">Submit Weekly Plan</a></p>
        </div>
    </div>
</body>
</html>`
  }

  private generateWeeklyReportDueEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Report Due</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .highlight { background-color: #d1fae5; padding: 15px; border-left: 4px solid #059669; margin: 15px 0; }
        .button { background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Weekly Report Due Tomorrow</h1>
        </div>
        <div class="content">
            <p>Hi {{userName}},</p>
            
            <div class="highlight">
                <p><strong>Week:</strong> {{weekStart}}</p>
                <p><strong>Due:</strong> {{dueDate}} at {{dueTime}}</p>
            </div>
            
            <p>Your weekly report is due tomorrow. Please include:</p>
            <ul>
                <li>Achievements this week</li>
                <li>Progress on planned goals</li>
                <li>Actual time allocation</li>
                <li>Blockers encountered</li>
                <li>Support needed</li>
                <li>Key learnings</li>
            </ul>
            
            <p><a href="{{appUrl}}/reports" class="button">Submit Weekly Report</a></p>
        </div>
    </div>
</body>
</html>`
  }

  private generateComplianceAlertEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Low Compliance Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .alert { background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0; }
        .stats { background-color: #f9fafb; padding: 15px; border-radius: 4px; }
        .button { background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Low Compliance Alert</h1>
        </div>
        <div class="content">
            <p>Hi {{adminName}},</p>
            
            <div class="alert">
                <p>Team compliance has dropped below acceptable levels for the week of {{weekStart}}.</p>
            </div>
            
            <div class="stats">
                <p><strong>Compliance Rate:</strong> {{complianceRate}}%</p>
                <p><strong>Overdue Reports:</strong> {{overdueCount}}</p>
            </div>
            
            <p>Please take appropriate action to improve compliance.</p>
            
            <p><a href="{{appUrl}}/admin/reports" class="button">View Team Dashboard</a></p>
        </div>
    </div>
</body>
</html>`
  }

  private generateMeetingReminderEmailTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Meeting Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .meeting-details { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .button { background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Meeting Reminder</h1>
        </div>
        <div class="content">
            <div class="meeting-details">
                <h3>{{meetingTitle}}</h3>
                <p><strong>Date:</strong> {{meetingDate}}</p>
                <p><strong>Time:</strong> {{meetingTime}}</p>
                {{#meetingLocation}}<p><strong>Location:</strong> {{meetingLocation}}</p>{{/meetingLocation}}
                {{#meetingLink}}<p><strong>Join Link:</strong> <a href="{{meetingLink}}">{{meetingLink}}</a></p>{{/meetingLink}}
            </div>
            
            <p>This is a reminder for your upcoming meeting.</p>
            
            <p><a href="{{appUrl}}/meetings" class="button">View Meeting Details</a></p>
        </div>
    </div>
</body>
</html>`
  }
}