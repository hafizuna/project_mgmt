import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient, Role, MeetingType, MeetingStatus, AttendeeStatus, ActionItemStatus, ProjectMemberRole, TaskPriority, NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'
import { NotificationService } from '../services/NotificationService.js'

const router = Router()
const prisma = new PrismaClient()
const notificationService = NotificationService.getInstance()

// Validation schemas
const createMeetingSchema = z.object({
  title: z.string().min(2, 'Meeting title must be at least 2 characters'),
  description: z.string().optional(),
  startTime: z.string().datetime('Invalid start time'),
  endTime: z.string().datetime('Invalid end time'),
  type: z.nativeEnum(MeetingType).default(MeetingType.Online),
  location: z.string().optional(),
  meetingLink: z.string().url('Invalid meeting link').optional().or(z.literal('')),
  projectId: z.string().uuid('Invalid project ID').optional(),
  agenda: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    duration: z.number().optional()
  })).optional(),
  attendeeIds: z.array(z.string().uuid()).optional()
})

const updateMeetingSchema = z.object({
  title: z.string().min(2, 'Meeting title must be at least 2 characters').optional(),
  description: z.string().optional(),
  startTime: z.string().datetime('Invalid start time').optional(),
  endTime: z.string().datetime('Invalid end time').optional(),
  type: z.nativeEnum(MeetingType).optional(),
  location: z.string().optional(),
  meetingLink: z.string().url('Invalid meeting link').optional().or(z.literal('')),
  status: z.nativeEnum(MeetingStatus).optional(),
  agenda: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    duration: z.number().optional()
  })).optional(),
  notes: z.string().optional(),
  actualStartTime: z.string().datetime().optional(),
  actualEndTime: z.string().datetime().optional()
})

const addAttendeeSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  isRequired: z.boolean().optional().default(true)
})

const updateAttendanceSchema = z.object({
  status: z.nativeEnum(AttendeeStatus)
})

const createActionItemSchema = z.object({
  description: z.string().min(1, 'Action item description is required'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  dueDate: z.string().datetime('Invalid due date').optional(),
  projectId: z.string().uuid('Invalid project ID').optional()
})

const updateActionItemSchema = z.object({
  description: z.string().min(1, 'Action item description is required').optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  dueDate: z.string().datetime('Invalid due date').optional(),
  status: z.nativeEnum(ActionItemStatus).optional(),
  projectId: z.string().uuid('Invalid project ID').optional()
})

const convertToTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
  priority: z.nativeEnum(TaskPriority).optional()
})

// Helper function to check if user has access to project (reuse from projects logic)
async function checkProjectAccess(
  userId: string,
  orgId: string,
  projectId: string,
  requiredAccess: 'read' | 'write' | 'admin'
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  if (!user) return false

  // Admin has full access to all org projects
  if (user.role === Role.Admin) return true

  // Get project with membership info
  const project = await prisma.project.findUnique({
    where: { 
      id: projectId,
      orgId: orgId 
    },
    include: {
      members: {
        where: { userId: userId },
        select: { role: true }
      }
    }
  })

  if (!project) return false

  // Project owner has full access
  if (project.ownerId === userId) return true

  // Check membership access
  const membership = project.members[0]
  if (!membership) return false

  // Read access: any member can read
  if (requiredAccess === 'read') return true

  // Write access: Manager role users + project managers/owners
  if (requiredAccess === 'write') {
    return user.role === Role.Manager || membership.role === ProjectMemberRole.Manager
  }

  // Admin access: only project owners (admins already handled above)
  if (requiredAccess === 'admin') {
    return project.ownerId === userId
  }

  return false
}

/**
 * GET /api/meetings
 * List meetings with role-based filtering
 * Role access: All users (filtered by access)
 */
router.get('/meetings', authenticate, async (req: Request, res: Response) => {
  try {
    const { project, status, upcoming } = req.query
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    let whereClause: any = {
      orgId: orgId
    }

    // Filter by project if specified
    if (project && typeof project === 'string') {
      const hasProjectAccess = await checkProjectAccess(userId, orgId, project, 'read')
      if (!hasProjectAccess) {
        return res.status(403).json({ error: 'Access denied to this project' })
      }
      whereClause.projectId = project
    }

    // Filter by status if specified
    if (status && typeof status === 'string') {
      whereClause.status = status
    }

    // Filter upcoming meetings
    if (upcoming === 'true') {
      whereClause.startTime = { gte: new Date() }
    }

    // Role-based filtering for non-admins
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role !== Role.Admin) {
      // Non-admins can only see meetings they created or are attending
      whereClause.OR = [
        { createdById: userId },
        { 
          attendees: {
            some: { userId: userId }
          }
        }
      ]
    }

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        attendees: {
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
        },
        _count: {
          select: {
            actionItems: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    res.json({ meetings })
  } catch (error) {
    console.error('List meetings error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/meetings/:id
 * Get meeting details
 * Role access: Meeting creator, attendees, or Admin
 */
router.get('/meetings/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        attendees: {
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
        },
        actionItems: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            },
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            },
            project: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!meeting || meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    // Check access: Admin, meeting creator, or attendee
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const isAttendee = meeting.attendees.some(a => a.userId === userId)
    const canAccess = user?.role === Role.Admin || 
                      meeting.createdById === userId || 
                      isAttendee

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied to this meeting' })
    }

    res.json({ meeting })
  } catch (error) {
    console.error('Get meeting error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/meetings
 * Create a new meeting
 * Role access: Manager+ only
 */
router.post('/meetings', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createMeetingSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check user has permission to create meetings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (user?.role === Role.Team) {
      return res.status(403).json({ error: 'Only Manager+ users can create meetings' })
    }

    // If project is specified, check project access
    if (data.projectId) {
      const hasAccess = await checkProjectAccess(userId, orgId, data.projectId, 'write')
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' })
      }
    }

    // Validate attendees are organization members
    if (data.attendeeIds && data.attendeeIds.length > 0) {
      const validAttendees = await prisma.user.findMany({
        where: {
          id: { in: data.attendeeIds },
          orgId: orgId
        },
        select: { id: true }
      })

      if (validAttendees.length !== data.attendeeIds.length) {
        return res.status(400).json({ error: 'Some attendees are not valid organization members' })
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        type: data.type,
        location: data.location,
        meetingLink: data.meetingLink || null,
        videoRoom: null, // Will be updated after creation for online meetings
        projectId: data.projectId,
        agenda: data.agenda || null,
        orgId: orgId,
        createdById: userId,
        attendees: data.attendeeIds ? {
          create: data.attendeeIds.map(attendeeId => ({
            userId: attendeeId,
            isRequired: true,
            status: AttendeeStatus.Pending
          }))
        } : undefined
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        attendees: {
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
        }
      }
    })

    // Update with video room ID for online meetings
    let finalMeeting = meeting;
    if (data.type === MeetingType.Online || data.type === MeetingType.Hybrid) {
      const videoRoom = `projectflow-${meeting.id}`;
      finalMeeting = await prisma.meeting.update({
        where: { id: meeting.id },
        data: { videoRoom },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          },
          attendees: {
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
          }
        }
      });
    }

    // Log meeting creation
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'meeting.created',
      { 
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        projectId: meeting.projectId
      }
    )

    // Send meeting scheduling notifications
    try {
      const meetingDate = new Date(data.startTime).toLocaleDateString()
      const meetingTime = new Date(data.startTime).toLocaleTimeString()
      
      // Notify all attendees about the scheduled meeting
      for (const attendee of finalMeeting.attendees) {
        if (attendee.userId !== userId) { // Don't notify the meeting creator
          await notificationService.createNotification({
            userId: attendee.userId,
            orgId,
            type: NotificationType.MEETING_SCHEDULED,
            category: NotificationCategory.MEETING,
            title: `Meeting scheduled: ${finalMeeting.title}`,
            message: `You have been invited to "${finalMeeting.title}" on ${meetingDate} at ${meetingTime}`,
            data: {
              meetingId: finalMeeting.id,
              projectId: finalMeeting.projectId,
              startTime: finalMeeting.startTime,
              endTime: finalMeeting.endTime,
              location: finalMeeting.location,
              meetingLink: finalMeeting.meetingLink,
              type: finalMeeting.type
            },
            entityType: 'Meeting',
            entityId: finalMeeting.id,
            priority: NotificationPriority.Medium,
            scheduledFor: new Date(Date.now() + 60 * 60 * 1000) // Send immediately, reminders will be scheduled separately
          })
        }
      }

      // Notify project members if this is a project meeting
      if (finalMeeting.projectId) {
        const projectMembers = await prisma.projectMember.findMany({
          where: {
            projectId: finalMeeting.projectId,
            userId: {
              notIn: [userId, ...finalMeeting.attendees.map(a => a.userId)]
            }
          },
          select: { userId: true }
        })

        for (const member of projectMembers) {
          await notificationService.createNotification({
            userId: member.userId,
            orgId,
            type: NotificationType.MEETING_SCHEDULED,
            category: NotificationCategory.MEETING,
            title: `Project meeting scheduled: ${finalMeeting.title}`,
            message: `A meeting "${finalMeeting.title}" has been scheduled for your project on ${meetingDate}`,
            data: {
              meetingId: finalMeeting.id,
              projectId: finalMeeting.projectId,
              startTime: finalMeeting.startTime,
              isProjectMeeting: true
            },
            entityType: 'Meeting',
            entityId: finalMeeting.id,
            priority: NotificationPriority.Low
          })
        }
      }
    } catch (notificationError) {
      console.error('Failed to send meeting scheduling notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    res.status(201).json({ meeting: finalMeeting })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create meeting error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/meetings/:id
 * Update a meeting
 * Role access: Meeting creator or Admin
 */
router.put('/meetings/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = updateMeetingSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    const existingMeeting = await prisma.meeting.findUnique({
      where: { id },
      select: { orgId: true, createdById: true }
    })

    if (!existingMeeting || existingMeeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    // Check permissions: Admin or meeting creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canUpdate = user?.role === Role.Admin || existingMeeting.createdById === userId
    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied to update this meeting' })
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...updates,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
        meetingLink: updates.meetingLink === '' ? null : updates.meetingLink,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        attendees: {
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
        }
      }
    })

    res.json({ meeting })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update meeting error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 * Role access: Meeting creator or Admin
 */
router.delete('/meetings/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { orgId: true, createdById: true, title: true }
    })

    if (!meeting || meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    // Check permissions: Admin or meeting creator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canDelete = user?.role === Role.Admin || meeting.createdById === userId
    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied to delete this meeting' })
    }

    await prisma.meeting.delete({
      where: { id }
    })

    // Log meeting deletion
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'meeting.deleted',
      { 
        meetingId: id,
        meetingTitle: meeting.title
      }
    )

    res.json({ message: 'Meeting deleted successfully' })
  } catch (error) {
    console.error('Delete meeting error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as meetingsRouter }