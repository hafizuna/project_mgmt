import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All audit log routes require authentication
router.use(authenticate);

// Validation schemas
const auditLogQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /audit-logs
 * Get audit logs with filtering and pagination (Admin only)
 */
router.get('/', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
    } = auditLogQuerySchema.parse(req.query);

    // Validate limit
    if (limit > 200) {
      return res.status(400).json({ error: 'Limit cannot exceed 200' });
    }

    // Build where clause
    const where: any = {
      orgId: req.user!.orgId, // Only show logs from current user's org
    };

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get total count for pagination
    const totalCount = await prisma.auditLog.count({ where });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /audit-logs/user/:userId
 * Get audit logs for a specific user (Admin only)
 */
router.get('/user/:userId', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);
    const { page = 1, limit = 50 } = z.object({
      page: z.string().optional().default('1').transform(Number),
      limit: z.string().optional().default('50').transform(Number),
    }).parse(req.query);

    // Validate limit
    if (limit > 200) {
      return res.status(400).json({ error: 'Limit cannot exceed 200' });
    }

    // Verify user exists in the same org
    const user = await prisma.user.findFirst({
      where: { id: userId, orgId: req.user!.orgId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const where = {
      userId,
      orgId: req.user!.orgId,
    };

    const totalCount = await prisma.auditLog.count({ where });

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      user,
      auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get user audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity (Admin only)
 */
router.get('/entity/:entityType/:entityId', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = z.object({
      entityType: z.string(),
      entityId: z.string(),
    }).parse(req.params);
    
    const { page = 1, limit = 50 } = z.object({
      page: z.string().optional().default('1').transform(Number),
      limit: z.string().optional().default('50').transform(Number),
    }).parse(req.query);

    // Validate limit
    if (limit > 200) {
      return res.status(400).json({ error: 'Limit cannot exceed 200' });
    }

    const where = {
      entityType,
      entityId,
      orgId: req.user!.orgId,
    };

    const totalCount = await prisma.auditLog.count({ where });

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      entityType,
      entityId,
      auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get entity audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /audit-logs/summary
 * Get audit log summary statistics (Admin only)
 */
router.get('/summary', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { days = '7' } = z.object({
      days: z.string().optional().default('7').transform(Number),
    }).parse(req.query);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where = {
      orgId: req.user!.orgId,
      createdAt: { gte: startDate },
    };

    // Get total count in the period
    const totalCount = await prisma.auditLog.count({ where });

    // Get counts by action type
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    });

    // Get counts by entity type
    const entityCounts = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    });

    // Get most active users
    const userCounts = await prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });

    // Get user details for the most active users
    const userIds = userCounts.map(uc => uc.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });

    const mostActiveUsers = userCounts.map(uc => ({
      count: uc._count.userId,
      user: users.find(u => u.id === uc.userId),
    }));

    res.json({
      period: `Last ${days} days`,
      totalCount,
      actionCounts: actionCounts.map(ac => ({
        action: ac.action,
        count: ac._count.action,
      })),
      entityCounts: entityCounts.map(ec => ({
        entityType: ec.entityType,
        count: ec._count.entityType,
      })),
      mostActiveUsers,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Get audit log summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as auditLogsRouter };
