import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Role, KnowledgeCategory, KnowledgeStatus } from '@prisma/client'
import { prisma } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { AuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger.js'

const router = Router()

// Template definitions for structured content
const TEMPLATES = {
  MARKET_RESEARCH: {
    name: 'Market Research',
    fields: {
      objective: { type: 'textarea', label: 'Objective/Purpose', required: true },
      keyFindings: { type: 'textarea', label: 'Key Findings/Observations', required: true },
      marketInsights: { type: 'textarea', label: 'Market Insights', required: true },
      keyTakeaways: { type: 'textarea', label: 'Key Takeaways/Recommendations', required: true },
      supportingData: { type: 'textarea', label: 'Supporting Data/Links', required: false }
    }
  },
  COMPETITOR_ANALYSIS: {
    name: 'Competitor Analysis',
    fields: {
      competitorName: { type: 'text', label: 'Competitor Name', required: true },
      analysisFocus: { type: 'text', label: 'Analysis Focus', required: true },
      keyObservations: { type: 'textarea', label: 'Key Observations', required: true },
      strengthsWeaknesses: { type: 'textarea', label: 'Strengths & Weaknesses', required: true },
      competitivePositioning: { type: 'textarea', label: 'Competitive Positioning', required: true },
      strategicImplications: { type: 'textarea', label: 'Strategic Implications', required: true },
      recommendations: { type: 'textarea', label: 'Action Items/Recommendations', required: true }
    }
  },
  CUSTOMER_INSIGHTS: {
    name: 'Customer Insights',
    fields: {
      customerSegment: { type: 'text', label: 'Customer Segment/Source', required: true },
      researchContext: { type: 'textarea', label: 'Research Context', required: true },
      keyFeedback: { type: 'textarea', label: 'Key Customer Feedback', required: true },
      painPoints: { type: 'textarea', label: 'Pain Points Identified', required: true },
      opportunities: { type: 'textarea', label: 'Opportunities Discovered', required: true },
      behavioralInsights: { type: 'textarea', label: 'Behavioral Insights', required: true },
      nextSteps: { type: 'textarea', label: 'Recommendations/Next Steps', required: true }
    }
  },
  LESSONS_LEARNED: {
    name: 'Lessons Learned',
    fields: {
      context: { type: 'textarea', label: 'Context/Background', required: true },
      whatHappened: { type: 'textarea', label: 'What Happened', required: true },
      whatWorked: { type: 'textarea', label: 'What Worked Well', required: true },
      whatDidntWork: { type: 'textarea', label: 'What Didn\'t Work', required: true },
      rootCause: { type: 'textarea', label: 'Root Cause Analysis', required: false },
      lessonsLearned: { type: 'textarea', label: 'Lessons Learned', required: true },
      recommendations: { type: 'textarea', label: 'Recommendations for Future', required: true }
    }
  }
}

// Validation schemas
const createKnowledgeEntrySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.nativeEnum(KnowledgeCategory),
  content: z.record(z.string()),
  tags: z.array(z.string()).optional().default([]),
  status: z.nativeEnum(KnowledgeStatus).optional().default(KnowledgeStatus.Published),
})

const updateKnowledgeEntrySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').optional(),
  category: z.nativeEnum(KnowledgeCategory).optional(),
  content: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(KnowledgeStatus).optional(),
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional().transform(val => val === '' ? undefined : val),
  category: z.string().optional(),
  author: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
})

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  parentId: z.string().uuid().optional(),
})

/**
 * GET /knowledge/templates
 * Get available knowledge entry templates
 */
router.get('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({ templates: TEMPLATES })
  } catch (error) {
    console.error('Get templates error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /knowledge
 * List knowledge entries with pagination, search, and filtering
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page, limit, search, category, author, tags } = querySchema.parse(req.query)
    const skip = (page - 1) * limit
    const orgId = req.user!.orgId

    // Build where clause
    let where: any = {
      orgId: orgId,
      status: KnowledgeStatus.Published, // Only show published entries
    }

    // Apply filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = category as KnowledgeCategory
    }

    if (author) {
      where.authorId = author
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim())
      where.tags = {
        hasSome: tagArray
      }
    }

    // Get entries and total count
    const [entries, totalCount] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
          _count: {
            select: {
              comments: true,
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.knowledgeEntry.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('List knowledge entries error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /knowledge/:id
 * Get a specific knowledge entry by ID
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const orgId = req.user!.orgId

    const entry = await prisma.knowledgeEntry.findUnique({
      where: { 
        id,
        orgId: orgId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  }
                }
              }
            }
          },
          where: { parentId: null }, // Only top-level comments
          orderBy: { createdAt: 'desc' }
        }
      },
    })

    if (!entry) {
      return res.status(404).json({ error: 'Knowledge entry not found' })
    }

    res.json({ entry })
  } catch (error) {
    console.error('Get knowledge entry error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /knowledge
 * Create a new knowledge entry
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createKnowledgeEntrySchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Validate content against template
    const template = TEMPLATES[data.category]
    if (!template) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    // Check required fields
    for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
      if (fieldConfig.required && (!data.content[fieldKey] || data.content[fieldKey].trim() === '')) {
        return res.status(400).json({ 
          error: `Required field missing: ${fieldConfig.label}` 
        })
      }
    }

    const entry = await prisma.knowledgeEntry.create({
      data: {
        ...data,
        authorId: userId,
        orgId: orgId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        }
      },
    })

    // Log knowledge entry creation
    await AuditLogger.logUserAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.CREATED, // Using existing action, could add KNOWLEDGE_ENTRY_CREATED
      entry.id,
      { 
        entityType: 'KnowledgeEntry',
        title: entry.title, 
        category: entry.category 
      }
    )

    res.status(201).json({ entry })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create knowledge entry error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /knowledge/:id
 * Update a knowledge entry
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updates = updateKnowledgeEntrySchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check if entry exists and user has permission
    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id, orgId: orgId },
    })

    if (!existingEntry) {
      return res.status(404).json({ error: 'Knowledge entry not found' })
    }

    // Only author and admins can edit
    const userRole = req.user!.role
    if (userRole !== Role.Admin && existingEntry.authorId !== userId) {
      return res.status(403).json({ error: 'Access denied to edit this entry' })
    }

    // If category is being changed, validate content against new template
    if (updates.category && updates.content) {
      const template = TEMPLATES[updates.category]
      if (!template) {
        return res.status(400).json({ error: 'Invalid category' })
      }

      // Check required fields for new template
      for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
        if (fieldConfig.required && (!updates.content[fieldKey] || updates.content[fieldKey].trim() === '')) {
          return res.status(400).json({ 
            error: `Required field missing for ${template.name}: ${fieldConfig.label}` 
          })
        }
      }
    }

    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: updates,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        }
      },
    })

    // Log knowledge entry update
    await AuditLogger.logUserAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.UPDATED,
      id,
      { 
        entityType: 'KnowledgeEntry',
        title: entry.title,
        updatedFields: Object.keys(updates) 
      }
    )

    res.json({ entry })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Update knowledge entry error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /knowledge/:id
 * Archive a knowledge entry (set status to Archived)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check if entry exists and user has permission
    const existingEntry = await prisma.knowledgeEntry.findUnique({
      where: { id, orgId: orgId },
    })

    if (!existingEntry) {
      return res.status(404).json({ error: 'Knowledge entry not found' })
    }

    // Only author and admins can archive
    const userRole = req.user!.role
    if (userRole !== Role.Admin && existingEntry.authorId !== userId) {
      return res.status(403).json({ error: 'Access denied to archive this entry' })
    }

    // Archive the entry instead of deleting
    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: { status: KnowledgeStatus.Archived },
    })

    // Log knowledge entry archival
    await AuditLogger.logUserAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.DELETED, // Using existing action
      id,
      { 
        entityType: 'KnowledgeEntry',
        title: existingEntry.title,
        action: 'archived' 
      }
    )

    res.json({ message: 'Knowledge entry archived successfully' })
  } catch (error) {
    console.error('Archive knowledge entry error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /knowledge/:id/comments
 * Get comments for a knowledge entry
 */
router.get('/:id/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const orgId = req.user!.orgId

    // Check if entry exists and is accessible
    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id, orgId: orgId },
      select: { id: true }
    })

    if (!entry) {
      return res.status(404).json({ error: 'Knowledge entry not found' })
    }

    const comments = await prisma.knowledgeComment.findMany({
      where: { 
        entryId: id,
        parentId: null, // Only top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ comments })
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /knowledge/:id/comments
 * Add a comment to a knowledge entry
 */
router.post('/:id/comments', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content, parentId } = createCommentSchema.parse(req.body)
    const userId = req.user!.userId
    const orgId = req.user!.orgId

    // Check if entry exists and is accessible
    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id, orgId: orgId },
      select: { id: true, title: true }
    })

    if (!entry) {
      return res.status(404).json({ error: 'Knowledge entry not found' })
    }

    // If parentId provided, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.knowledgeComment.findUnique({
        where: { id: parentId, entryId: id }
      })
      if (!parentComment) {
        return res.status(400).json({ error: 'Parent comment not found' })
      }
    }

    const comment = await prisma.knowledgeComment.create({
      data: {
        content,
        entryId: id,
        authorId: userId,
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          }
        }
      }
    })

    // Log comment addition
    await AuditLogger.logUserAction(
      req,
      userId,
      orgId,
      AUDIT_ACTIONS.CREATED,
      comment.id,
      { 
        entityType: 'KnowledgeComment',
        knowledgeEntryId: id,
        knowledgeEntryTitle: entry.title,
        isReply: !!parentId
      }
    )

    res.status(201).json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Create comment error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as knowledgeRouter }