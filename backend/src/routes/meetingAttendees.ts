import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role, AttendeeStatus } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { authenticate } from '../middleware/auth.js'
import { AuditLogger } from '../utils/auditLogger.js'

const router = Router()

// Validation schemas
const addAttendeeSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  isRequired: z.boolean().optional().default(true)
})

const updateAttendanceSchema = z.object({
  status: z.nativeEnum(AttendeeStatus)
})

/**
 * POST /api/meetings/:meetingId/attendees
 * Add attendee to a meeting
 * Role access: Meeting creator or Admin
 */
router.post('/meetings/:meetingId/attendees', authenticate, async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params
    const data = addAttendeeSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check meeting exists and user has permission
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
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

    const canAddAttendee = user?.role === Role.Admin || meeting.createdById === userId
    if (!canAddAttendee) {
      return res.status(403).json({ error: 'Access denied to add attendees to this meeting' })
    }

    // Validate attendee is organization member
    const attendeeUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true, email: true, avatar: true, orgId: true }
    })

    if (!attendeeUser || attendeeUser.orgId !== orgId) {
      return res.status(400).json({ error: 'User is not a valid organization member' })
    }

    // Check if attendee is already added
    const existingAttendee = await prisma.meetingAttendee.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meetingId,
          userId: data.userId
        }
      }
    })

    if (existingAttendee) {
      return res.status(400).json({ error: 'User is already an attendee of this meeting' })
    }

    const attendee = await prisma.meetingAttendee.create({
      data: {
        meetingId: meetingId,
        userId: data.userId,
        isRequired: data.isRequired,
        status: AttendeeStatus.Pending
      },
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
    })

    // Log attendee addition
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'meeting.attendee_added',
      { 
        meetingId: meetingId,
        meetingTitle: meeting.title,
        attendeeId: data.userId,
        attendeeName: attendeeUser.name
      }
    )

    res.status(201).json({ attendee })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Add meeting attendee error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /api/meetings/:meetingId/attendees/:attendeeId
 * Update attendee status
 * Role access: Attendee themselves, meeting creator, or Admin
 */
router.put('/meetings/:meetingId/attendees/:attendeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { meetingId, attendeeId } = req.params
    const updates = updateAttendanceSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check meeting and attendee exist
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { orgId: true, createdById: true, title: true }
    })

    if (!meeting || meeting.orgId !== orgId) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    const attendee = await prisma.meetingAttendee.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meetingId,
          userId: attendeeId
        }
      },
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
    })

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' })
    }

    // Check permissions: Admin, meeting creator, or the attendee themselves
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const canUpdate = user?.role === Role.Admin || 
                      meeting.createdById === userId || 
                      attendeeId === userId

    if (!canUpdate) {
      return res.status(403).json({ error: 'Access denied to update this attendee' })
    }

    const updatedAttendee = await prisma.meetingAttendee.update({
      where: {
        meetingId_userId: {
          meetingId: meetingId,
          userId: attendeeId
        }
      },
      data: {
        status: updates.status
      },
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
    })

    // Log attendance status change
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'meeting.attendance_updated',
      { 
        meetingId: meetingId,
        meetingTitle: meeting.title,
        attendeeId: attendeeId,
        attendeeName: attendee.user.name,
        status: updates.status
      }
    )

    res.json({ attendee: updatedAttendee })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update attendee status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/meetings/:meetingId/attendees/:attendeeId
 * Remove attendee from meeting
 * Role access: Meeting creator or Admin (attendees cannot remove themselves)
 */
router.delete('/meetings/:meetingId/attendees/:attendeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { meetingId, attendeeId } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check meeting exists and user has permission
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
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

    const canRemove = user?.role === Role.Admin || meeting.createdById === userId
    if (!canRemove) {
      return res.status(403).json({ error: 'Access denied to remove attendees from this meeting' })
    }

    // Get attendee info for logging
    const attendee = await prisma.meetingAttendee.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meetingId,
          userId: attendeeId
        }
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' })
    }

    await prisma.meetingAttendee.delete({
      where: {
        meetingId_userId: {
          meetingId: meetingId,
          userId: attendeeId
        }
      }
    })

    // Log attendee removal
    await AuditLogger.logOrgAction(
      req,
      userId,
      orgId,
      'meeting.attendee_removed',
      { 
        meetingId: meetingId,
        meetingTitle: meeting.title,
        attendeeId: attendeeId,
        attendeeName: attendee.user.name
      }
    )

    res.json({ message: 'Attendee removed successfully' })
  } catch (error) {
    console.error('Remove meeting attendee error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as meetingAttendeesRouter }