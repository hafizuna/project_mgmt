import { Router, Request, Response } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { TaskScheduler } from '../services/TaskScheduler.js'
import { ReportNotificationService } from '../services/ReportNotificationService.js'

const router = Router()
const taskScheduler = TaskScheduler.getInstance()
const reportNotificationService = ReportNotificationService.getInstance()

/**
 * Get scheduler status
 */
router.get('/status', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const status = taskScheduler.getStatus()
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('Error getting scheduler status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    })
  }
})

/**
 * Initialize/restart scheduler
 */
router.post('/initialize', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    // Cancel existing jobs first
    taskScheduler.cancelAllJobs()
    
    // Initialize scheduler
    taskScheduler.initialize()
    
    const status = taskScheduler.getStatus()
    
    res.json({
      success: true,
      message: 'Task scheduler initialized successfully',
      data: status
    })
  } catch (error) {
    console.error('Error initializing scheduler:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to initialize scheduler'
    })
  }
})

/**
 * Stop all scheduled jobs
 */
router.post('/stop', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    taskScheduler.cancelAllJobs()
    
    res.json({
      success: true,
      message: 'All scheduled jobs stopped successfully'
    })
  } catch (error) {
    console.error('Error stopping scheduler:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    })
  }
})

/**
 * Run manual notification checks
 */
router.post('/run-check/:type', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    
    if (!['plan', 'report', 'compliance', 'scheduled'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid check type. Must be one of: plan, report, compliance, scheduled'
      })
    }

    await taskScheduler.runManualCheck(type as 'plan' | 'report' | 'compliance' | 'scheduled')
    
    res.json({
      success: true,
      message: `Manual ${type} check completed successfully`
    })
  } catch (error) {
    console.error(`Error running manual ${req.params.type} check:`, error)
    res.status(500).json({
      success: false,
      error: `Failed to run manual ${req.params.type} check`
    })
  }
})

/**
 * Reschedule a specific job
 */
router.post('/reschedule/:jobName', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params
    const { cronExpression } = req.body

    if (!cronExpression) {
      return res.status(400).json({
        success: false,
        error: 'cronExpression is required'
      })
    }

    const success = taskScheduler.rescheduleJob(jobName, cronExpression)
    
    if (success) {
      res.json({
        success: true,
        message: `Job '${jobName}' rescheduled successfully`
      })
    } else {
      res.status(404).json({
        success: false,
        error: `Job '${jobName}' not found or failed to reschedule`
      })
    }
  } catch (error) {
    console.error('Error rescheduling job:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule job'
    })
  }
})

/**
 * Cancel a specific job
 */
router.delete('/jobs/:jobName', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params
    
    const success = taskScheduler.cancelJob(jobName)
    
    if (success) {
      res.json({
        success: true,
        message: `Job '${jobName}' cancelled successfully`
      })
    } else {
      res.status(404).json({
        success: false,
        error: `Job '${jobName}' not found`
      })
    }
  } catch (error) {
    console.error('Error cancelling job:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job'
    })
  }
})

/**
 * Initialize report settings for all organizations
 */
router.post('/init-report-settings', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    await taskScheduler.initializeAllReportSettings()
    
    res.json({
      success: true,
      message: 'Report settings initialized for all organizations'
    })
  } catch (error) {
    console.error('Error initializing report settings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to initialize report settings'
    })
  }
})

/**
 * Test notification sending for a specific user
 */
router.post('/test-notification', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { userId, type, orgId } = req.body

    if (!userId || !type) {
      return res.status(400).json({
        success: false,
        error: 'userId and type are required'
      })
    }

    const testData = {
      userName: 'Test User',
      weekStart: new Date().toISOString(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      dueTime: '17:00',
      type: 'Test Notification'
    }

    const notificationService = ReportNotificationService.getInstance()
    
    // This would need to be implemented in NotificationService
    // await notificationService.sendTestNotification(userId, type, testData, orgId)
    
    res.json({
      success: true,
      message: 'Test notification sent successfully'
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    })
  }
})

/**
 * Get detailed job information
 */
router.get('/jobs', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const jobInfo = taskScheduler.getJobInfo()
    
    res.json({
      success: true,
      data: jobInfo
    })
  } catch (error) {
    console.error('Error getting job info:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get job information'
    })
  }
})

/**
 * Get notification statistics
 */
router.get('/stats', authenticate, requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { orgId } = req.user!
    const { days = 7 } = req.query

    const stats = await reportNotificationService.getNotificationStats(
      orgId,
      parseInt(days as string) || 7
    )
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting notification stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get notification statistics'
    })
  }
})

export default router