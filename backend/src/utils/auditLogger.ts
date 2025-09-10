import { PrismaClient } from '@prisma/client';
import type { Request } from 'express';

const prisma = new PrismaClient();

interface AuditLogData {
  userId: string;
  orgId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          orgId: data.orgId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
    }
  }

  // Helper method to extract request info
  static getRequestInfo(req: Request) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };
  }

  // Pre-defined audit actions
  static async logUserAction(
    req: Request,
    userId: string,
    orgId: string,
    action: string,
    targetUserId?: string,
    metadata?: any
  ) {
    const requestInfo = this.getRequestInfo(req);
    
    await this.log({
      userId,
      orgId,
      action,
      entityType: 'User',
      entityId: targetUserId,
      metadata,
      ...requestInfo,
    });
  }

  static async logProjectAction(
    req: Request,
    userId: string,
    orgId: string,
    action: string,
    projectId?: string,
    metadata?: any
  ) {
    const requestInfo = this.getRequestInfo(req);
    
    await this.log({
      userId,
      orgId,
      action,
      entityType: 'Project',
      entityId: projectId,
      metadata,
      ...requestInfo,
    });
  }

  static async logTaskAction(
    req: Request,
    userId: string,
    orgId: string,
    action: string,
    taskId?: string,
    metadata?: any
  ) {
    const requestInfo = this.getRequestInfo(req);
    
    await this.log({
      userId,
      orgId,
      action,
      entityType: 'Task',
      entityId: taskId,
      metadata,
      ...requestInfo,
    });
  }

  static async logOrgAction(
    req: Request,
    userId: string,
    orgId: string,
    action: string,
    metadata?: any
  ) {
    const requestInfo = this.getRequestInfo(req);
    
    await this.log({
      userId,
      orgId,
      action,
      entityType: 'Organization',
      entityId: orgId,
      metadata,
      ...requestInfo,
    });
  }

  static async logAuthAction(
    req: Request,
    userId: string,
    orgId: string,
    action: string,
    metadata?: any
  ) {
    const requestInfo = this.getRequestInfo(req);
    
    await this.log({
      userId,
      orgId,
      action,
      entityType: 'Auth',
      entityId: userId,
      metadata,
      ...requestInfo,
    });
  }
}

// Predefined action constants for consistency
export const AUDIT_ACTIONS = {
  // User actions
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_STATUS_CHANGED: 'user.status_changed',
  
  // Auth actions
  USER_LOGIN: 'auth.login',
  USER_LOGOUT: 'auth.logout',
  USER_REGISTER: 'auth.register',
  PASSWORD_CHANGED: 'auth.password_changed',
  
  // Project actions
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_STATUS_CHANGED: 'project.status_changed',
  PROJECT_MEMBER_ADDED: 'project.member_added',
  PROJECT_MEMBER_REMOVED: 'project.member_removed',
  
  // Task actions
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_UNASSIGNED: 'task.unassigned',
  
  // Organization actions
  ORG_SETTINGS_UPDATED: 'org.settings_updated',
  ORG_UPDATED: 'org.updated',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
