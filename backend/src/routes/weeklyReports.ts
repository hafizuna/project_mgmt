import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role, ReportType, SubmissionStatus, StressLevel } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'
import { ReportNotificationService } from '../services/ReportNotificationService.js'

const router = Router()

// Validation schemas
const createWeeklyPlanSchema = z.object({
  goals: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Goal title is required'),
    description: z.string().optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    estimatedHours: z.number().min(0, 'Hours must be positive').optional(),
  })),
  priorities: z.array(z.object({
    id: z.string().optional(),
    task: z.string().min(1, 'Priority task is required'),
    importance: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    estimatedTime: z.string().optional(),
  })),
  timeAllocation: z.object({
    projectWork: z.number().min(0).max(100, 'Percentage must be 0-100'),
    meetings: z.number().min(0).max(100, 'Percentage must be 0-100'),
    administration: z.number().min(0).max(100, 'Percentage must be 0-100'),
    learning: z.number().min(0).max(100, 'Percentage must be 0-100'),
    other: z.number().min(0).max(100, 'Percentage must be 0-100'),
  }).refine(data => {
    const total = data.projectWork + data.meetings + data.administration + data.learning + data.other
    return total <= 100
  }, { message: 'Total time allocation cannot exceed 100%' }),
  focusAreas: z.array(z.string().min(1, 'Focus area cannot be empty')),
  blockers: z.array(z.object({
    description: z.string().min(1, 'Blocker description is required'),
    impact: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    supportNeeded: z.string().optional(),
  })).optional(),
})

const createWeeklyReportSchema = z.object({
  achievements: z.array(z.object({
    goal: z.string().min(1, 'Achievement is required'),
    description: z.string().optional(),
    completionLevel: z.number().min(0).max(100, 'Completion must be 0-100%'),
    impact: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  })),
  goalsProgress: z.array(z.object({
    goalId: z.string().optional(),
    title: z.string().min(1, 'Goal title is required'),
    planned: z.string().min(1, 'Planned progress is required'),
    actual: z.string().min(1, 'Actual progress is required'),
    completionPercentage: z.number().min(0).max(100, 'Completion must be 0-100%'),
    notes: z.string().optional(),
  })),
  actualTimeSpent: z.object({
    projectWork: z.number().min(0).max(100, 'Percentage must be 0-100'),
    meetings: z.number().min(0).max(100, 'Percentage must be 0-100'),
    administration: z.number().min(0).max(100, 'Percentage must be 0-100'),
    learning: z.number().min(0).max(100, 'Percentage must be 0-100'),
    other: z.number().min(0).max(100, 'Percentage must be 0-100'),
  }),
  blockers: z.array(z.object({
    description: z.string().min(1, 'Blocker description is required'),
    impact: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    resolved: z.boolean().default(false),
    resolution: z.string().optional(),
  })).optional(),
  support: z.array(z.object({
    type: z.enum(['Technical', 'Resource', 'Training', 'Process', 'Other']),
    description: z.string().min(1, 'Support description is required'),
    urgency: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  })).optional(),
  learnings: z.array(z.string().min(1, 'Learning cannot be empty')).optional(),
  nextWeekPrep: z.string().optional(),
  productivityScore: z.number().min(1).max(10, 'Score must be 1-10').optional(),
  satisfactionScore: z.number().min(1).max(10, 'Score must be 1-10').optional(),
  stressLevel: z.nativeEnum(StressLevel).optional(),
})

const reportQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  type: z.nativeEnum(ReportType).optional(),
  status: z.nativeEnum(SubmissionStatus).optional(),
  userId: z.string().uuid().optional(),
  weekStart: z.string().datetime().optional(),
  sortBy: z.enum(['weekStart', 'submittedAt', 'createdAt', 'updatedAt']).optional().default('weekStart'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Helper functions
function getWeekDates(date: Date) {
  const monday = new Date(date)
  const dayOfWeek = monday.getDay()
  const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // adjust when day is Sunday
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  return { weekStart: monday, weekEnd: sunday }
}

function canAccessReport(userRole: Role, userId: string, reportUserId: string): boolean {
  // Admins can access all reports
  if (userRole === Role.Admin) return true
  
  // Managers can access reports of their team members (we'll implement team logic later)
  if (userRole === Role.Manager) return true
  
  // Users can only access their own reports
  return userId === reportUserId
}

/**
 * GET /api/reports/weekly-plans
 * Get weekly plans with filtering and pagination
 */
router.get('/weekly-plans', authenticate, async (req: Request, res: Response) => {
  try {
    const { page, limit, status, userId, weekStart, sortBy, sortOrder } = reportQuerySchema.parse(req.query)
    const skip = (page - 1) * limit

    const requesterId = req.user!.userId
    const requesterRole = req.user!.role as Role
    const orgId = req.user!.orgId

    // Build where clause based on role
    let where: any = { orgId }
    
    if (requesterRole === Role.Team) {
      // Team members can only see their own plans
      where.userId = requesterId
    } else if (requesterRole === Role.Manager && userId) {
      // Managers can filter by specific user
      where.userId = userId
    } else if (userId && requesterRole === Role.Admin) {
      // Admins can filter by specific user
      where.userId = userId
    }

    if (status) where.status = status
    if (weekStart) {
      const weekDates = getWeekDates(new Date(weekStart))
      where.weekStart = weekDates.weekStart
    }

    const [plans, total] = await Promise.all([
      prisma.weeklyPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          template: {
            select: { name: true, type: true }
          },
          weeklyReport: {
            select: { id: true, status: true, submittedAt: true }
          },
          _count: {
            select: { comments: true }
          }
        }
      }),
      prisma.weeklyPlan.count({ where })
    ])

    res.json({
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get weekly plans error:', error)
    res.status(500).json({ error: 'Failed to retrieve weekly plans' })
  }
})

/**
 * GET /api/reports/weekly-reports
 * Get weekly reports with filtering and pagination
 */
router.get('/weekly-reports', authenticate, async (req: Request, res: Response) => {
  try {
    const { page, limit, status, userId, weekStart, sortBy, sortOrder } = reportQuerySchema.parse(req.query)
    const skip = (page - 1) * limit

    const requesterId = req.user!.userId
    const requesterRole = req.user!.role as Role
    const orgId = req.user!.orgId

    // Build where clause based on role
    let where: any = { orgId }
    
    if (requesterRole === Role.Team) {
      // Team members can only see their own reports
      where.userId = requesterId
    } else if (requesterRole === Role.Manager && userId) {
      // Managers can filter by specific user
      where.userId = userId
    } else if (userId && requesterRole === Role.Admin) {
      // Admins can filter by specific user
      where.userId = userId
    }

    if (status) where.status = status
    if (weekStart) {
      const weekDates = getWeekDates(new Date(weekStart))
      where.weekStart = weekDates.weekStart
    }

    const [reports, total] = await Promise.all([
      prisma.weeklyReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          template: {
            select: { name: true, type: true }
          },
          weeklyPlan: {
            select: { id: true, status: true, goals: true }
          },
          _count: {
            select: { comments: true }
          }
        }
      }),
      prisma.weeklyReport.count({ where })
    ])

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get weekly reports error:', error)
    res.status(500).json({ error: 'Failed to retrieve weekly reports' })
  }
})

/**
 * GET /api/reports/weekly-plans/:id
 * Get specific weekly plan by ID
 */
router.get('/weekly-plans/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = req.user!.userId
    const requesterRole = req.user!.role as Role
    const orgId = req.user!.orgId

    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        template: true,
        weeklyReport: {
          select: { id: true, status: true, submittedAt: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, avatar: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!plan || plan.orgId !== orgId) {
      return res.status(404).json({ error: 'Weekly plan not found' })
    }

    // Check access permissions
    if (!canAccessReport(requesterRole, requesterId, plan.userId)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(plan)
  } catch (error) {
    console.error('Get weekly plan error:', error)
    res.status(500).json({ error: 'Failed to retrieve weekly plan' })
  }
})

/**
 * GET /api/reports/weekly-reports/:id
 * Get specific weekly report by ID
 */
router.get('/weekly-reports/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const requesterId = req.user!.userId
    const requesterRole = req.user!.role as Role
    const orgId = req.user!.orgId

    const report = await prisma.weeklyReport.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        template: true,
        weeklyPlan: {
          select: { id: true, goals: true, priorities: true, timeAllocation: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true }
            },
            replies: {
              include: {
                author: {
                  select: { id: true, name: true, avatar: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!report || report.orgId !== orgId) {
      return res.status(404).json({ error: 'Weekly report not found' })
    }

    // Check access permissions
    if (!canAccessReport(requesterRole, requesterId, report.userId)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(report)
  } catch (error) {
    console.error('Get weekly report error:', error)
    res.status(500).json({ error: 'Failed to retrieve weekly report' })
  }
})

/**
 * POST /api/reports/weekly-plans
 * Create or update weekly plan for current user
 */
router.post('/weekly-plans', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const orgId = req.user!.orgId
    
    // Get current week dates
    const { weekStart, weekEnd } = getWeekDates(new Date())
    
    const planData = createWeeklyPlanSchema.parse(req.body)

    // Check if plan already exists for this week
    const existingPlan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart
        }
      }
    })

    let plan
    if (existingPlan) {
      // Update existing plan if not yet submitted
      if (existingPlan.status === SubmissionStatus.Submitted) {
        return res.status(400).json({ error: 'Cannot modify submitted weekly plan' })
      }

      plan = await prisma.weeklyPlan.update({
        where: { id: existingPlan.id },
        data: {
          goals: planData.goals,
          priorities: planData.priorities,
          timeAllocation: planData.timeAllocation,
          focusAreas: planData.focusAreas,
          blockers: planData.blockers || [],
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      })
    } else {
      // Create new plan
      plan = await prisma.weeklyPlan.create({
        data: {
          userId,
          orgId,
          weekStart,
          weekEnd,
          goals: planData.goals,
          priorities: planData.priorities,
          timeAllocation: planData.timeAllocation,
          focusAreas: planData.focusAreas,
          blockers: planData.blockers || [],
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      })
    }

    // Log audit
    await AuditLogger.log({
      userId,
      orgId,
      action: existingPlan ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
      entityType: 'WeeklyPlan',
      entityId: plan.id,
      metadata: { weekStart: weekStart.toISOString() }
    })

    res.json(plan)
  } catch (error) {
    console.error('Create/update weekly plan error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to create/update weekly plan' })
  }
})

/**
 * POST /api/reports/weekly-reports
 * Create weekly report for current user
 */
router.post('/weekly-reports', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const orgId = req.user!.orgId
    
    // Get current week dates
    const { weekStart, weekEnd } = getWeekDates(new Date())
    
    const reportData = createWeeklyReportSchema.parse(req.body)

    // Find the corresponding weekly plan
    const weeklyPlan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart
        }
      }
    })

    if (!weeklyPlan) {
      return res.status(400).json({ error: 'Weekly plan must be created before submitting report' })
    }

    // Check if report already exists
    const existingReport = await prisma.weeklyReport.findUnique({
      where: {
        weeklyPlanId: weeklyPlan.id
      }
    })

    if (existingReport && existingReport.status === SubmissionStatus.Submitted) {
      return res.status(400).json({ error: 'Weekly report already submitted for this week' })
    }

    let report
    if (existingReport) {
      // Update existing report
      report = await prisma.weeklyReport.update({
        where: { id: existingReport.id },
        data: {
          achievements: reportData.achievements,
          goalsProgress: reportData.goalsProgress,
          actualTimeSpent: reportData.actualTimeSpent,
          blockers: reportData.blockers || [],
          support: reportData.support || [],
          learnings: reportData.learnings || [],
          nextWeekPrep: reportData.nextWeekPrep,
          productivityScore: reportData.productivityScore,
          satisfactionScore: reportData.satisfactionScore,
          stressLevel: reportData.stressLevel,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          weeklyPlan: {
            select: { id: true, goals: true }
          }
        }
      })
    } else {
      // Create new report
      report = await prisma.weeklyReport.create({
        data: {
          userId,
          orgId,
          weeklyPlanId: weeklyPlan.id,
          weekStart,
          weekEnd,
          achievements: reportData.achievements,
          goalsProgress: reportData.goalsProgress,
          actualTimeSpent: reportData.actualTimeSpent,
          blockers: reportData.blockers || [],
          support: reportData.support || [],
          learnings: reportData.learnings || [],
          nextWeekPrep: reportData.nextWeekPrep,
          productivityScore: reportData.productivityScore,
          satisfactionScore: reportData.satisfactionScore,
          stressLevel: reportData.stressLevel,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          weeklyPlan: {
            select: { id: true, goals: true }
          }
        }
      })
    }

    // Log audit
    await AuditLogger.log({
      userId,
      orgId,
      action: existingReport ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
      entityType: 'WeeklyReport',
      entityId: report.id,
      metadata: { weekStart: weekStart.toISOString() }
    })

    res.json(report)
  } catch (error) {
    console.error('Create/update weekly report error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    res.status(500).json({ error: 'Failed to create/update weekly report' })
  }
})

/**
 * POST /api/reports/weekly-plans/:id/submit
 * Submit weekly plan
 */
router.post('/weekly-plans/:id/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    const plan = await prisma.weeklyPlan.findUnique({
      where: { id }
    })

    if (!plan || plan.orgId !== orgId) {
      return res.status(404).json({ error: 'Weekly plan not found' })
    }

    if (plan.userId !== userId) {
      return res.status(403).json({ error: 'Can only submit your own weekly plan' })
    }

    if (plan.status === SubmissionStatus.Submitted) {
      return res.status(400).json({ error: 'Weekly plan already submitted' })
    }

    const updatedPlan = await prisma.weeklyPlan.update({
      where: { id },
      data: {
        status: SubmissionStatus.Submitted,
        submittedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    // Log audit
    await AuditLogger.log({
      userId,
      orgId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'WeeklyPlan',
      entityId: id,
      metadata: { action: 'submitted' }
    })

    // Trigger notification to managers/admins about submission
    try {
      const reportNotificationService = ReportNotificationService.getInstance()
      await reportNotificationService.notifyReportSubmission(id, 'plan')
    } catch (error) {
      console.error('Error sending report submission notification:', error)
      // Don't fail the request if notification fails
    }

    res.json(updatedPlan)
  } catch (error) {
    console.error('Submit weekly plan error:', error)
    res.status(500).json({ error: 'Failed to submit weekly plan' })
  }
})

/**
 * POST /api/reports/weekly-reports/:id/submit
 * Submit weekly report
 */
router.post('/weekly-reports/:id/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    const report = await prisma.weeklyReport.findUnique({
      where: { id }
    })

    if (!report || report.orgId !== orgId) {
      return res.status(404).json({ error: 'Weekly report not found' })
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: 'Can only submit your own weekly report' })
    }

    if (report.status === SubmissionStatus.Submitted) {
      return res.status(400).json({ error: 'Weekly report already submitted' })
    }

    const updatedReport = await prisma.weeklyReport.update({
      where: { id },
      data: {
        status: SubmissionStatus.Submitted,
        submittedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        weeklyPlan: {
          select: { id: true, goals: true }
        }
      }
    })

    // Log audit
    await AuditLogger.log({
      userId,
      orgId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'WeeklyReport',
      entityId: id,
      metadata: { action: 'submitted' }
    })

    // Trigger notification to managers/admins about submission
    try {
      const reportNotificationService = ReportNotificationService.getInstance()
      await reportNotificationService.notifyReportSubmission(id, 'report')
    } catch (error) {
      console.error('Error sending report submission notification:', error)
      // Don't fail the request if notification fails
    }

    res.json(updatedReport)
  } catch (error) {
    console.error('Submit weekly report error:', error)
    res.status(500).json({ error: 'Failed to submit weekly report' })
  }
})

/**
 * GET /api/reports/current-week-status
 * Get current user's plan/report status for this week
 */
router.get('/current-week-status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const orgId = req.user!.orgId
    
    const { weekStart, weekEnd } = getWeekDates(new Date())

    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart
        }
      },
      include: {
        weeklyReport: {
          select: { id: true, status: true, submittedAt: true }
        }
      }
    })

    // Get report settings to determine due dates
    const settings = await prisma.reportSettings.findUnique({
      where: { orgId }
    })

    const defaultSettings = {
      planDueDay: 1, // Monday
      planDueTime: '10:00',
      reportDueDay: 5, // Friday
      reportDueTime: '17:00'
    }

    const reportSettings = settings || defaultSettings

    // Calculate due dates
    const planDueDate = new Date(weekStart)
    planDueDate.setDate(planDueDate.getDate() + (reportSettings.planDueDay - 1))
    const [planHour, planMinute] = reportSettings.planDueTime.split(':')
    planDueDate.setHours(parseInt(planHour), parseInt(planMinute), 0, 0)

    const reportDueDate = new Date(weekStart)
    reportDueDate.setDate(reportDueDate.getDate() + (reportSettings.reportDueDay - 1))
    const [reportHour, reportMinute] = reportSettings.reportDueTime.split(':')
    reportDueDate.setHours(parseInt(reportHour), parseInt(reportMinute), 0, 0)

    const now = new Date()
    
    const status = {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      plan: {
        exists: !!plan,
        status: plan?.status || null,
        submittedAt: plan?.submittedAt?.toISOString() || null,
        dueDate: planDueDate.toISOString(),
        isOverdue: now > planDueDate && (!plan || plan.status !== SubmissionStatus.Submitted),
        canEdit: !plan || plan.status === SubmissionStatus.Draft,
      },
      report: {
        exists: !!plan?.weeklyReport,
        status: plan?.weeklyReport?.status || null,
        submittedAt: plan?.weeklyReport?.submittedAt?.toISOString() || null,
        dueDate: reportDueDate.toISOString(),
        isOverdue: now > reportDueDate && (!plan?.weeklyReport || plan.weeklyReport.status !== SubmissionStatus.Submitted),
        canEdit: !!plan && (!plan.weeklyReport || plan.weeklyReport.status === SubmissionStatus.Draft),
        requiresPlan: !plan || plan.status !== SubmissionStatus.Submitted,
      }
    }

    res.json(status)
  } catch (error) {
    console.error('Get current week status error:', error)
    res.status(500).json({ error: 'Failed to get current week status' })
  }
})

/**
 * GET /api/reports/admin/dashboard
 * Admin dashboard showing team submission status
 * Admin/Manager only
 */
router.get('/admin/dashboard', authenticate, requireRole(['Admin', 'Manager']), async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.orgId
    const { weekStart: weekStartParam } = req.query
    
    // Default to current week if no week specified
    const targetDate = weekStartParam ? new Date(weekStartParam as string) : new Date()
    const { weekStart, weekEnd } = getWeekDates(targetDate)

    // Get all active users in the organization
    const users = await prisma.user.findMany({
      where: {
        orgId,
        isActive: true,
        role: { not: Role.Admin } // Exclude admins from reporting
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
      }
    })

    // Get plans and reports for the specified week
    const [plans, reports] = await Promise.all([
      prisma.weeklyPlan.findMany({
        where: {
          orgId,
          weekStart,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      }),
      prisma.weeklyReport.findMany({
        where: {
          orgId,
          weekStart,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      })
    ])

    // Create user status map
    const userStatus = users.map(user => {
      const userPlan = plans.find(p => p.userId === user.id)
      const userReport = reports.find(r => r.userId === user.id)
      
      return {
        ...user,
        plan: {
          exists: !!userPlan,
          status: userPlan?.status || null,
          submittedAt: userPlan?.submittedAt?.toISOString() || null,
          isOverdue: userPlan?.isOverdue || false,
        },
        report: {
          exists: !!userReport,
          status: userReport?.status || null,
          submittedAt: userReport?.submittedAt?.toISOString() || null,
          isOverdue: userReport?.isOverdue || false,
        }
      }
    })

    // Calculate summary statistics
    const summary = {
      totalUsers: users.length,
      planSubmissions: plans.filter(p => p.status === SubmissionStatus.Submitted).length,
      reportSubmissions: reports.filter(r => r.status === SubmissionStatus.Submitted).length,
      planComplianceRate: users.length > 0 ? (plans.filter(p => p.status === SubmissionStatus.Submitted).length / users.length) * 100 : 0,
      reportComplianceRate: users.length > 0 ? (reports.filter(r => r.status === SubmissionStatus.Submitted).length / users.length) * 100 : 0,
      overduePlans: plans.filter(p => p.isOverdue).length,
      overdueReports: reports.filter(r => r.isOverdue).length,
    }

    res.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      summary,
      userStatus
    })
  } catch (error) {
    console.error('Get admin dashboard error:', error)
    res.status(500).json({ error: 'Failed to get admin dashboard data' })
  }
})

export default router