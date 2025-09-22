import React, { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'
import { useNotificationStore } from '@/stores/notification-store'
import { 
  Notification, 
  NotificationType, 
  NotificationPriority,
  NotificationCategory,
  NOTIFICATION_ICONS,
  NOTIFICATION_LABELS 
} from '@/types/notifications'

interface UseNotificationManagerOptions {
  enableToasts?: boolean
  enablePolling?: boolean
  pollingInterval?: number
  toastDuration?: number
}

export function useNotificationManager({
  enableToasts = true,
  enablePolling = true,
  pollingInterval = 30000, // 30 seconds
  toastDuration = 5000
}: UseNotificationManagerOptions = {}) {
  const {
    unreadCount,
    fetchUnreadCount,
    addNotification,
    preferences
  } = useNotificationStore()

  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const lastNotificationCountRef = useRef(0)

  // Show toast for new notification
  const showNotificationToast = useCallback((notification: Notification) => {
    if (!enableToasts || !preferences?.enableInApp) return

    const config = NOTIFICATION_ICONS[notification.type]
    const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.Bell
    const label = NOTIFICATION_LABELS[notification.type]

    // Determine toast type based on priority
    const getToastFunction = (priority: NotificationPriority) => {
      switch (priority) {
        case NotificationPriority.URGENT:
          return toast.error
        case NotificationPriority.HIGH:
          return toast.warning
        case NotificationPriority.LOW:
          return toast.info
        default:
          return toast
      }
    }

    const toastFn = getToastFunction(notification.priority)

    toastFn(notification.title, {
      description: notification.message,
      duration: toastDuration,
      icon: React.createElement(IconComponent, { 
        size: 16,
        className: config.color 
      }),
      action: {
        label: 'View',
        onClick: () => {
          // Handle notification click - could navigate to relevant page
          console.log('Clicked notification:', notification)
        }
      }
    })
  }, [enableToasts, preferences?.enableInApp, toastDuration])

  // Handle new notifications (simulated real-time updates)
  useEffect(() => {
    if (unreadCount > lastNotificationCountRef.current) {
      // New notification detected - in a real app, this would come from WebSocket
      // For demo purposes, we can trigger toast when count increases
      console.log('New notification detected!')
    }
    lastNotificationCountRef.current = unreadCount
  }, [unreadCount])

  // Initialize notifications on mount
  useEffect(() => {
    // Fetch initial data
    fetchUnreadCount()
  }, [])

  // Set up polling for new notifications
  useEffect(() => {
    if (!enablePolling) return

    // Initial fetch
    fetchUnreadCount()

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchUnreadCount()
    }, pollingInterval)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [enablePolling, pollingInterval, fetchUnreadCount])

  // Mock function to simulate receiving real-time notifications
  // In a real app, this would be connected to WebSocket or Server-Sent Events
  const simulateNewNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const mockNotification: Notification = {
      id: Date.now().toString(),
      userId: 'current-user',
      orgId: 'current-org',
      type,
      category: NotificationCategory.SYSTEM,
      title,
      message,
      priority: NotificationPriority.NORMAL,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 'current-user',
        name: 'Current User',
        email: 'user@example.com'
      }
    }

    // Add notification to store first
    addNotification(mockNotification)
    
    // Show toast after a small delay to avoid state update conflicts
    setTimeout(() => {
      showNotificationToast(mockNotification)
    }, 10)
  }, [addNotification, showNotificationToast])

  // Function to show custom toast
  const showToast = useCallback((
    message: string, 
    options: {
      type?: 'success' | 'error' | 'warning' | 'info'
      duration?: number
      description?: string
      action?: { label: string; onClick: () => void }
    } = {}
  ) => {
    const { type = 'info', duration = toastDuration, description, action } = options
    
    const toastFn = {
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info
    }[type]

    toastFn(message, {
      duration,
      description,
      action
    })
  }, [toastDuration])

  return {
    // State
    unreadCount,
    
    // Actions
    showNotificationToast,
    simulateNewNotification,
    showToast,
    
    // Utils
    isPolling: enablePolling
  }
}

// Hook for notification-related shortcuts
export function useNotificationShortcuts() {
  const { markAllAsRead, fetchNotifications } = useNotificationStore()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + N: Mark all as read
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault()
        markAllAsRead()
        toast.success('All notifications marked as read')
      }
      
      // Ctrl/Cmd + Shift + R: Refresh notifications
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault()
        fetchNotifications(true)
        toast.info('Notifications refreshed')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [markAllAsRead, fetchNotifications])
}

// Hook for notification preferences
export function useNotificationPreferences() {
  const { preferences, updatePreferences, fetchPreferences } = useNotificationStore()

  // Fetch preferences on mount
  useEffect(() => {
    if (!preferences) {
      fetchPreferences()
    }
  }, [preferences, fetchPreferences])

  const updatePreference = useCallback(async (key: keyof typeof preferences, value: boolean) => {
    if (!preferences) return

    try {
      await updatePreferences({ [key]: value })
      toast.success('Notification preferences updated')
    } catch (error) {
      toast.error('Failed to update preferences')
    }
  }, [preferences, updatePreferences])

  return {
    preferences,
    updatePreference,
    isLoading: !preferences
  }
}