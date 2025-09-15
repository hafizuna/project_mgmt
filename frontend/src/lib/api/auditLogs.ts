import { apiClient } from './client';

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user: AuditLogUser;
  orgId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuditLogsResponse {
  auditLogs: AuditLog[];
  pagination: AuditLogPagination;
}

export interface UserAuditLogsResponse {
  user: AuditLogUser;
  auditLogs: AuditLog[];
  pagination: AuditLogPagination;
}

export interface EntityAuditLogsResponse {
  entityType: string;
  entityId: string;
  auditLogs: AuditLog[];
  pagination: AuditLogPagination;
}

export interface AuditLogSummary {
  period: string;
  totalCount: number;
  actionCounts: Array<{
    action: string;
    count: number;
  }>;
  entityCounts: Array<{
    entityType: string;
    count: number;
  }>;
  mostActiveUsers: Array<{
    count: number;
    user?: AuditLogUser;
  }>;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}

export const auditLogsApi = {
  // Get audit logs with filtering and pagination
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/audit-logs?${params.toString()}`);
    return response;
  },

  // Get audit logs for a specific user
  getUserAuditLogs: async (
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<UserAuditLogsResponse> => {
    const response = await apiClient.get(`/audit-logs/user/${userId}?page=${page}&limit=${limit}`);
    return response;
  },

  // Get audit logs for a specific entity
  getEntityAuditLogs: async (
    entityType: string,
    entityId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<EntityAuditLogsResponse> => {
    const response = await apiClient.get(
      `/audit-logs/entity/${entityType}/${entityId}?page=${page}&limit=${limit}`
    );
    return response;
  },

  // Get audit log summary statistics
  getSummary: async (days: number = 7): Promise<AuditLogSummary> => {
    const response = await apiClient.get(`/audit-logs/summary?days=${days}`);
    return response;
  },
};

// Helper functions to format audit log data
export const auditLogHelpers = {
  // Format action for display
  formatAction: (action: string): string => {
    return action
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  // Get action color for display
  getActionColor: (action: string): string => {
    if (action.includes('created')) return 'text-green-600';
    if (action.includes('updated')) return 'text-blue-600';
    if (action.includes('deleted') || action.includes('deactivated')) return 'text-red-600';
    if (action.includes('login')) return 'text-purple-600';
    if (action.includes('logout')) return 'text-gray-600';
    return 'text-gray-800';
  },

  // Get entity type icon
  getEntityIcon: (entityType: string): string => {
    switch (entityType.toLowerCase()) {
      case 'user': return '👤';
      case 'project': return '📂';
      case 'task': return '✓';
      case 'organization': return '🏢';
      case 'auth': return '🔐';
      default: return '📄';
    }
  },

  // Format metadata for display
  formatMetadata: (metadata: any): string => {
    if (!metadata) return '';
    
    try {
      const entries = Object.entries(metadata);
      return entries
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
    } catch {
      return JSON.stringify(metadata);
    }
  },

  // Format date for display
  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  },

  // Get relative time
  getRelativeTime: (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  },
};
