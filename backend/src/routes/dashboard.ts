import express from 'express'
import { z } from 'zod'
import { prisma } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = express.Router()

// Query parameter schema for date filtering
const dashboardQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  projectId: z.string().optional(),
})

// GET /api/dashboard/stats - Overall dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const query = dashboardQuerySchema.parse(req.query)
    const organizationId = req.user!.orgId

    // Build date filters
    const dateFilter: any = {}
    if (query.dateFrom) {
      dateFilter.gte = new Date(query.dateFrom)
    }
    if (query.dateTo) {
      dateFilter.lte = new Date(query.dateTo)
    }

    // Project filter
    const projectFilter = query.projectId ? { id: query.projectId } : {}

    // Parallel queries for better performance
    const [
      totalTasks,
      completedTasks,
      overdueTasks,
      activeProjects,
      totalProjects,
      teamMembers,
      recentMeetings,
      upcomingMeetings
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({
        where: {
          project: { 
            orgId: organizationId,
            ...projectFilter
          },
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        }
      }),

      // Completed tasks
      prisma.task.count({
        where: {
          project: { 
            orgId: organizationId,
            ...projectFilter
          },
          status: 'Done',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter })
        }
      }),

      // Overdue tasks
      prisma.task.count({
        where: {
          project: { 
            orgId: organizationId,
            ...projectFilter
          },
          status: { not: 'Done' },
          dueDate: { lt: new Date() }
        }
      }),

      // Active projects
      prisma.project.count({
        where: {
          orgId: organizationId,
          ...projectFilter,
          status: 'Active'
        }
      }),

      // Total projects
      prisma.project.count({
        where: {
          orgId: organizationId,
          ...projectFilter
        }
      }),

      // Team members count
      prisma.user.count({
        where: {
          orgId: organizationId,
          isActive: true
        }
      }),

      // Recent meetings (last 30 days)
      prisma.meeting.count({
        where: {
          orgId: organizationId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Upcoming meetings (next 7 days)
      prisma.meeting.count({
        where: {
          orgId: organizationId,
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // Calculate completion rate and trends
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    // Calculate trend (compare with previous period)
    const periodLength = query.dateFrom && query.dateTo 
      ? new Date(query.dateTo).getTime() - new Date(query.dateFrom).getTime()
      : 30 * 24 * 60 * 60 * 1000 // Default 30 days

    const previousPeriodStart = new Date(Date.now() - 2 * periodLength)
    const previousPeriodEnd = new Date(Date.now() - periodLength)

    const [previousTasks, previousCompletedTasks] = await Promise.all([
      prisma.task.count({
        where: {
          project: { 
            orgId: organizationId,
            ...projectFilter
          },
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      }),
      prisma.task.count({
        where: {
          project: { 
            orgId: organizationId,
            ...projectFilter
          },
          status: 'Done',
          updatedAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      })
    ])

    const tasksTrend = previousTasks > 0 ? Math.round(((totalTasks - previousTasks) / previousTasks) * 100) : 0
    const completedTasksTrend = previousCompletedTasks > 0 ? Math.round(((completedTasks - previousCompletedTasks) / previousCompletedTasks) * 100) : 0

    const stats = {
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      activeProjects,
      totalProjects,
      teamMembers,
      recentMeetings,
      upcomingMeetings,
      trends: {
        tasks: {
          value: tasksTrend,
          isPositive: tasksTrend >= 0
        },
        completedTasks: {
          value: Math.abs(completedTasksTrend),
          isPositive: completedTasksTrend >= 0
        }
      }
    }

    // Log dashboard view
    await AuditLogger.logUserAction(
      req,
      req.user!.userId,
      organizationId,
      'dashboard.stats_viewed',
      null,
      { query }
    )

    res.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
})

// GET /api/dashboard/projects - Project progress data
router.get('/projects', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId

    const projects = await prisma.project.findMany({
      where: {
        orgId: organizationId,
        status: { in: ['Active'] }
      },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            assigneeId: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5 // Show top 5 active projects
    })

    const projectsWithProgress = projects.map(project => {
      const totalTasks = project.tasks.length
      
      // Weighted progress calculation
      if (totalTasks === 0) {
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status.toLowerCase(),
          progress: 0,
          tasksCompleted: 0,
          totalTasks: 0,
          deadline: project.dueDate?.toISOString().split('T')[0] || null,
          teamMembers: project.members.map(member => ({
            name: member.user.name,
            initials: member.user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
            id: member.user.id
          }))
        }
      }
      
      // Advanced progress calculation with weighted task status
      const taskStatusWeights = {
        'Todo': 0,        // 0% progress
        'InProgress': 0.5, // 50% progress
        'Review': 0.8,    // 80% progress
        'Done': 1.0       // 100% progress
      }
      
      const totalProgress = project.tasks.reduce((sum, task) => {
        return sum + (taskStatusWeights[task.status] || 0)
      }, 0)
      
      const progress = Math.round((totalProgress / totalTasks) * 100)
      const completedTasks = project.tasks.filter(task => task.status === 'Done').length
      
      // Calculate task breakdown by status
      const taskBreakdown = {
        todo: project.tasks.filter(task => task.status === 'Todo').length,
        inProgress: project.tasks.filter(task => task.status === 'InProgress').length,
        review: project.tasks.filter(task => task.status === 'Review').length,
        done: completedTasks
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status.toLowerCase(),
        progress,
        tasksCompleted: completedTasks,
        totalTasks,
        taskBreakdown,
        deadline: project.dueDate?.toISOString().split('T')[0] || null,
        teamMembers: project.members.map(member => ({
          name: member.user.name,
          initials: member.user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
          id: member.user.id
        }))
      }
    })

    res.json(projectsWithProgress)
  } catch (error) {
    console.error('Dashboard projects error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
})

// GET /api/dashboard/tasks - Recent and priority tasks
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId

    const tasks = await prisma.task.findMany({
      where: {
        project: { orgId: organizationId },
        status: { not: 'Done' }
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 10
    })

    const tasksWithProgress = tasks.map(task => {
      // Calculate progress based on task status
      const progress = task.status === 'Done' ? 100 : 
                      task.status === 'InProgress' ? 50 : 0

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status === 'Done' ? 'completed' : task.status === 'InProgress' ? 'in-progress' : task.status === 'Review' ? 'review' : 'todo',
        priority: task.priority.toLowerCase(),
        assignee: task.assignee ? {
          name: task.assignee.name,
          initials: task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase(),
          id: task.assignee.id
        } : null,
        deadline: task.dueDate?.toISOString().split('T')[0] || null,
        progress,
        project: task.project.name
      }
    })

    res.json(tasksWithProgress)
  } catch (error) {
    console.error('Dashboard tasks error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
})

// GET /api/dashboard/deadlines - Upcoming deadlines
router.get('/deadlines', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const upcomingTasks = await prisma.task.findMany({
      where: {
        project: { orgId: organizationId },
        status: { not: 'Done' },
        dueDate: {
          gte: new Date(),
          lte: nextWeek
        }
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 10
    })

    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        orgId: organizationId,
        startTime: {
          gte: new Date(),
          lte: nextWeek
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 5
    })

    const deadlines = [
      ...upcomingTasks.map(task => ({
        id: task.id,
        title: task.title,
        date: task.dueDate?.toISOString().split('T')[0] || '',
        priority: task.priority.toLowerCase(),
        type: 'task',
        project: task.project.name
      })),
      ...upcomingMeetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        date: meeting.startTime.toISOString().split('T')[0],
        priority: 'medium' as const,
        type: 'meeting',
        project: null
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    res.json(deadlines)
  } catch (error) {
    console.error('Dashboard deadlines error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
})

// GET /api/dashboard/activity - Recent activity feed
router.get('/activity', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId

    // Get recent audit logs for activity feed
    const activities = await prisma.auditLog.findMany({
      where: {
        orgId: organizationId,
        action: {
          in: [
            'task.create',
            'task.update',
            'task.complete',
            'project.create',
            'meeting.create',
            'meeting.complete'
          ]
        }
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      user: activity.user.name,
      createdAt: activity.createdAt.toISOString(),
      metadata: activity.metadata
    }))

    res.json(formattedActivities)
  } catch (error) {
    console.error('Dashboard activity error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
})

// GET /api/dashboard/analytics/team - Team productivity analytics
router.get('/analytics/team', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get all users in organization with their task completion data
    const users = await prisma.user.findMany({
      where: {
        orgId: organizationId,
        isActive: true
      },
      include: {
        assignedTasks: {
          where: {
            updatedAt: {
              gte: thirtyDaysAgo
            }
          },
          select: {
            id: true,
            status: true,
            priority: true,
            updatedAt: true,
            estimate: true,
            dueDate: true
          }
        }
      }
    })

    const teamProductivity = users.map(user => {
      const tasks = user.assignedTasks
      const completedTasks = tasks.filter(task => task.status === 'Done')
      const overdueTasks = tasks.filter(task => 
        task.dueDate && task.dueDate < now && task.status !== 'Done'
      )
      
      // Calculate efficiency score
      const totalTasks = tasks.length
      const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0
      const overdueRate = totalTasks > 0 ? (overdueTasks.length / totalTasks) * 100 : 0
      const efficiency = Math.max(0, completionRate - overdueRate)
      
      // Determine status based on efficiency
      let status = 'good'
      if (efficiency >= 85) status = 'excellent'
      else if (efficiency >= 70) status = 'good'
      else if (efficiency >= 50) status = 'warning'
      else status = 'critical'
      
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        tasksCompleted: completedTasks.length,
        totalTasks,
        efficiency: Math.round(efficiency),
        status,
        overdueTasks: overdueTasks.length
      }
    })

    // Sort by efficiency descending
    teamProductivity.sort((a, b) => b.efficiency - a.efficiency)

    res.json(teamProductivity)
  } catch (error) {
    console.error('Team analytics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/dashboard/analytics/velocity - Task velocity and trends
router.get('/analytics/velocity', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId
    const now = new Date()
    
    // Get weekly completion data for last 5 weeks
    const weeklyData = []
    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      
      const completedTasks = await prisma.task.count({
        where: {
          project: { orgId: organizationId },
          status: 'Done',
          updatedAt: {
            gte: weekStart,
            lt: weekEnd
          }
        }
      })
      
      const weekLabel = i === 0 ? 'This Week' : `Week ${5 - i}`
      weeklyData.push({
        name: weekLabel,
        value: completedTasks,
        date: weekStart.toISOString().split('T')[0]
      })
    }
    
    // Calculate average and trend
    const totalCompleted = weeklyData.reduce((sum, week) => sum + week.value, 0)
    const average = Math.round(totalCompleted / weeklyData.length)
    
    // Calculate trend (last 2 weeks vs first 2 weeks)
    const recentAvg = (weeklyData[3].value + weeklyData[4].value) / 2
    const earlierAvg = (weeklyData[0].value + weeklyData[1].value) / 2
    const trendPercentage = earlierAvg > 0 ? Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100) : 0
    
    res.json({
      weeklyData,
      average,
      trend: {
        percentage: Math.abs(trendPercentage),
        direction: trendPercentage >= 0 ? 'up' : 'down',
        isPositive: trendPercentage >= 0
      }
    })
  } catch (error) {
    console.error('Velocity analytics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/dashboard/analytics/performance - Performance metrics
router.get('/analytics/performance', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Get current and previous period data for trends
    const [currentStats, previousStats] = await Promise.all([
      // Current 30 days
      Promise.all([
        prisma.task.count({
          where: {
            project: { orgId: organizationId },
            updatedAt: { gte: thirtyDaysAgo }
          }
        }),
        prisma.task.count({
          where: {
            project: { orgId: organizationId },
            status: 'Done',
            updatedAt: { gte: thirtyDaysAgo }
          }
        }),
        prisma.task.count({
          where: {
            project: { orgId: organizationId },
            dueDate: { gte: thirtyDaysAgo, lte: now },
            status: 'Done',
            updatedAt: { lte: now }
          }
        }),
        prisma.task.count({
          where: {
            project: { orgId: organizationId },
            dueDate: { gte: thirtyDaysAgo, lte: now }
          }
        })
      ]),
      // Previous 30 days
      Promise.all([
        prisma.task.count({
          where: {
            project: { orgId: organizationId },
            updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
          }
        }),
        prisma.task.count({
          where: {
            project: { orgId: organizationId },
            status: 'Done',
            updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
          }
        })
      ])
    ])

    const [totalTasks, completedTasks, onTimeCompleted, totalDueTasks] = currentStats
    const [prevTotalTasks, prevCompletedTasks] = previousStats

    // Calculate metrics
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const onTimeDelivery = totalDueTasks > 0 ? Math.round((onTimeCompleted / totalDueTasks) * 100) : 0
    
    // Mock team utilization (could be enhanced with time tracking data)
    const teamUtilization = Math.round(65 + (completionRate * 0.3))

    // Calculate trends
    const completionTrend = prevCompletedTasks > 0 ? 
      Math.round(((completedTasks - prevCompletedTasks) / prevCompletedTasks) * 100) : 0
    
    const utilizationTrend = 5 // Mock trend for now
    const deliveryTrend = 3 // Mock trend for now

    const metrics = [
      {
        label: 'Completion Rate',
        value: completionRate,
        target: 85,
        trend: {
          value: Math.abs(completionTrend),
          isPositive: completionTrend >= 0
        }
      },
      {
        label: 'Team Utilization', 
        value: teamUtilization,
        target: 80,
        trend: {
          value: utilizationTrend,
          isPositive: true
        }
      },
      {
        label: 'On-time Delivery',
        value: onTimeDelivery,
        target: 90,
        trend: {
          value: deliveryTrend,
          isPositive: true
        }
      }
    ]

    res.json(metrics)
  } catch (error) {
    console.error('Performance analytics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/dashboard/analytics/risks - Risk analysis
router.get('/analytics/risks', authenticate, async (req, res) => {
  try {
    const organizationId = req.user!.orgId
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get risk data
    const [overdueTasks, unassignedTasks, approachingDeadlines] = await Promise.all([
      prisma.task.count({
        where: {
          project: { orgId: organizationId },
          dueDate: { lt: now },
          status: { not: 'Done' }
        }
      }),
      prisma.task.count({
        where: {
          project: { orgId: organizationId },
          assigneeId: null,
          status: { not: 'Done' }
        }
      }),
      prisma.task.count({
        where: {
          project: { orgId: organizationId },
          dueDate: {
            gte: now,
            lte: nextWeek
          },
          status: { not: 'Done' }
        }
      })
    ])

    const risks = []

    if (overdueTasks > 0) {
      risks.push({
        title: `${overdueTasks} task${overdueTasks > 1 ? 's' : ''} overdue`,
        severity: overdueTasks > 5 ? 'high' : overdueTasks > 2 ? 'medium' : 'low',
        impact: overdueTasks > 5 ? 'Project delays likely' : 'Minor delays possible',
        count: overdueTasks
      })
    }

    if (unassignedTasks > 0) {
      risks.push({
        title: `${unassignedTasks} unassigned task${unassignedTasks > 1 ? 's' : ''}`,
        severity: unassignedTasks > 10 ? 'high' : unassignedTasks > 5 ? 'medium' : 'low',
        impact: 'Resource allocation needed',
        count: unassignedTasks
      })
    }

    if (approachingDeadlines > 0) {
      risks.push({
        title: `${approachingDeadlines} deadline${approachingDeadlines > 1 ? 's' : ''} this week`,
        severity: approachingDeadlines > 5 ? 'medium' : 'low',
        impact: 'Monitor progress closely',
        count: approachingDeadlines
      })
    }

    // If no risks, add a positive message
    if (risks.length === 0) {
      risks.push({
        title: 'No major risks detected',
        severity: 'low',
        impact: 'Projects are on track',
        count: 0
      })
    }

    res.json(risks)
  } catch (error) {
    console.error('Risk analytics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as dashboardRouter }
