import { 
  Notification, 
  NotificationPreferences, 
  NotificationsResponse, 
  NotificationStats,
  NotificationFilters,
  BulkNotificationAction,
  CreateNotificationRequest
} from '@/types/notifications'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Helper function to get access token from auth store
function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-store')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export const notificationsApi = {
  // Get notifications with pagination and filtering
  async getNotifications(params: {
    page?: number
    limit?: number
    filters?: NotificationFilters
  } = {}): Promise<NotificationsResponse> {
    const searchParams = new URLSearchParams()
    
    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    
    if (params.filters) {
      if (params.filters.type) searchParams.set('type', params.filters.type)
      if (params.filters.category) searchParams.set('category', params.filters.category)
      if (params.filters.unreadOnly !== undefined) searchParams.set('unreadOnly', params.filters.unreadOnly.toString())
      if (params.filters.priority) searchParams.set('priority', params.filters.priority)
      if (params.filters.dateFrom) searchParams.set('dateFrom', params.filters.dateFrom)
      if (params.filters.dateTo) searchParams.set('dateTo', params.filters.dateTo)
    }

    const url = `${API_BASE}/notifications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // Get unread notification count
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const response = await fetch(`${API_BASE}/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // Get notification statistics (admin only)
  async getStats(days: number = 7): Promise<NotificationStats> {
    const response = await fetch(`${API_BASE}/notifications/admin/stats?days=${days}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // Mark notification as unread (not supported by backend)
  async markAsUnread(notificationId: string): Promise<{ success: boolean }> {
    // This functionality is not supported by the backend
    throw new NotificationApiError('Mark as unread is not supported', 501)
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ markAll: true })
    })

    return handleResponse(response)
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // Bulk actions on notifications
  async bulkAction(action: BulkNotificationAction): Promise<{ success: boolean }> {
    if (action.action === 'mark_read') {
      const response = await fetch(`${API_BASE}/notifications/mark-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notificationIds: action.notificationIds })
      })
      return handleResponse(response)
    } else if (action.action === 'delete') {
      // Delete notifications one by one since backend doesn't support bulk delete
      for (const id of action.notificationIds) {
        await this.deleteNotification(id)
      }
      return { success: true }
    } else {
      throw new NotificationApiError('Unsupported bulk action', 400)
    }
  },

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // Update notification preferences
  async updatePreferences(preferences: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<NotificationPreferences> {
    const response = await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(preferences)
    })

    return handleResponse(response)
  },

  // Create notification (admin only)
  async createNotification(notification: CreateNotificationRequest): Promise<{ success: boolean; notificationIds: string[]; recipientCount: number }> {
    const response = await fetch(`${API_BASE}/notifications/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(notification)
    })

    return handleResponse(response)
  },

  // Get single notification by ID
  async getNotification(notificationId: string): Promise<Notification> {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  }
}

// Query key factory for TanStack Query
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters?: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
}

// Custom error class for notification API errors
export class NotificationApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'NotificationApiError'
  }
}

// Type-safe fetch wrapper specifically for notifications
export const fetchWithAuth = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }))
    throw new NotificationApiError(error.message || `HTTP ${response.status}`, response.status)
  }

  return response.json()
}