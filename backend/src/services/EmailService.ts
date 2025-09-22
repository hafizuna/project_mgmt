import nodemailer from 'nodemailer'
import { z } from 'zod'

const emailConfigSchema = z.object({
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
})

export interface EmailData {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
  metadata?: Record<string, any>
}

export interface EmailResult {
  messageId: string
  accepted: string[]
  rejected: string[]
  pending: string[]
}

export class EmailService {
  private static instance: EmailService
  private transporter: nodemailer.Transporter | null = null
  private configured: boolean = false
  private constructor() {
    this.initializeTransporter()
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  private initializeTransporter(): void {
    try {
      const config = emailConfigSchema.parse(process.env)
      
      // Check if SMTP is configured
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
        console.warn('SMTP not configured. Email notifications will not be sent.')
        this.configured = false
        return
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT || '587'),
        secure: parseInt(config.SMTP_PORT || '587') === 465, // true for 465, false for other ports
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
        // Add some additional security options
        tls: {
          rejectUnauthorized: false, // For development - should be true in production
        },
      })

      this.configured = true
      console.log('Email service initialized successfully')

      // Test connection
      this.verifyConnection()
    } catch (error) {
      console.error('Failed to initialize email service:', error)
      this.configured = false
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter || !this.configured) return

    try {
      await this.transporter.verify()
      console.log('SMTP connection verified successfully')
    } catch (error) {
      console.error('SMTP connection verification failed:', error)
      this.configured = false
    }
  }

  public async sendEmail(emailData: EmailData): Promise<EmailResult | null> {
    if (!this.configured || !this.transporter) {
      console.warn('Email service not configured. Skipping email send.')
      return null
    }

    try {
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@projectflow.com'
      
      const mailOptions = {
        from: `ProjectFlow <${fromEmail}>`,
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html || this.generateDefaultHtml(emailData.subject, emailData.text || ''),
        attachments: emailData.attachments,
        // Add metadata as headers
        headers: emailData.metadata ? {
          'X-Notification-ID': emailData.metadata.notificationId,
          'X-User-ID': emailData.metadata.userId,
          'X-Notification-Type': emailData.metadata.type,
        } : undefined,
      }

      console.log(`Sending email to: ${mailOptions.to}`)
      console.log(`Subject: ${mailOptions.subject}`)

      const result = await this.transporter.sendMail(mailOptions)

      console.log(`Email sent successfully. MessageId: ${result.messageId}`)

      return {
        messageId: result.messageId,
        accepted: result.accepted as string[],
        rejected: result.rejected as string[],
        pending: result.pending as string[],
      }
    } catch (error) {
      console.error('Error configuring email service:', error)
      this.configured = false
      return null
    }
  }

  public async sendBulkEmails(emails: EmailData[]): Promise<(EmailResult | null)[]> {
    const results: (EmailResult | null)[] = []
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email)
        results.push(result)
        
        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('Error in bulk email send:', error)
        results.push(null)
      }
    }

    return results
  }

  private generateDefaultHtml(subject: string, text: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.7;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #6b7280;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 10px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">ProjectFlow</div>
            <div class="title">${subject}</div>
        </div>
        
        <div class="content">
            ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
        
        <div class="footer">
            <p>This email was sent by ProjectFlow. If you have any questions, please contact your system administrator.</p>
            <p><small>© ${new Date().getFullYear()} ProjectFlow. All rights reserved.</small></p>
        </div>
    </div>
</body>
</html>`
  }

  public generateReportReminderEmail(userName: string, reportType: 'plan' | 'report', weekStart: string, dueDate: string): string {
    const isReport = reportType === 'report'
    const title = isReport ? 'Weekly Report Due Soon' : 'Weekly Plan Due Soon'
    const itemName = isReport ? 'weekly report' : 'weekly plan'
    const weekDisplay = new Date(weekStart).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .alert-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .title {
            font-size: 22px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.7;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .highlight-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">ProjectFlow</div>
            <div class="alert-icon">⏰</div>
            <div class="title">${title}</div>
            <div class="subtitle">Week of ${weekDisplay}</div>
        </div>
        
        <div class="content">
            <p>Hi ${userName},</p>
            
            <p>This is a friendly reminder that your ${itemName} for the week starting ${weekDisplay} is due soon.</p>
            
            <div class="highlight-box">
                <strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
            </div>
            
            <p>${isReport 
              ? 'Please submit your weekly report including your achievements, goal progress, time allocation, and any blockers you encountered.'
              : 'Please submit your weekly plan including your goals, priorities, estimated time allocation, and focus areas for the upcoming week.'
            }</p>
            
            <p>Submitting your ${itemName} on time helps the team stay aligned and enables better project coordination.</p>
            
            <div style="text-align: center;">
                <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/reports" class="button">
                    Submit ${isReport ? 'Weekly Report' : 'Weekly Plan'}
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>If you have any questions about the weekly reporting process, please contact your manager or system administrator.</p>
            <p><small>© ${new Date().getFullYear()} ProjectFlow. All rights reserved.</small></p>
        </div>
    </div>
</body>
</html>`
  }

  public generateComplianceAlertEmail(adminName: string, complianceRate: number, overdueCount: number, weekStart: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Low Team Compliance Alert</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .alert-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .title {
            font-size: 22px;
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .content {
            font-size: 16px;
            line-height: 1.7;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .stats-box {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #dc2626;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">ProjectFlow</div>
            <div class="alert-icon">🚨</div>
            <div class="title">Low Team Compliance Alert</div>
        </div>
        
        <div class="content">
            <p>Hi ${adminName},</p>
            
            <p>The weekly reporting compliance rate has dropped below the acceptable threshold for the week starting ${new Date(weekStart).toLocaleDateString()}.</p>
            
            <div class="stats-box">
                <div class="stat-item">
                    <span><strong>Compliance Rate:</strong></span>
                    <span style="color: #dc2626; font-weight: bold;">${complianceRate}%</span>
                </div>
                <div class="stat-item">
                    <span><strong>Overdue Reports:</strong></span>
                    <span style="color: #dc2626; font-weight: bold;">${overdueCount}</span>
                </div>
            </div>
            
            <p>Please consider taking the following actions:</p>
            <ul>
                <li>Send reminders to team members with overdue reports</li>
                <li>Review individual compliance patterns</li>
                <li>Discuss reporting process with low-compliance team members</li>
                <li>Consider adjusting deadlines or providing additional support</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/admin/reports" class="button">
                    View Team Reports Dashboard
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>This alert was automatically generated by the ProjectFlow reporting system.</p>
            <p><small>© ${new Date().getFullYear()} ProjectFlow. All rights reserved.</small></p>
        </div>
    </div>
</body>
</html>`
  }

  public isConfigured(): boolean {
    return this.configured
  }

  public async testConnection(): Promise<boolean> {
    if (!this.transporter || !this.configured) return false

    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email connection test failed:', error)
      return false
    }
  }
}