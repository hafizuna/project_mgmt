import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  Notification, 
  NotificationPreferences, 
  NotificationFilters,
  NotificationType
} from '@/types/notifications'
import { notificationsApi } from '@/lib/notifications-api'

interface NotificationState {
  // Core state
  notifications: Notification[]
  unreadCount: number
  preferences: NotificationPreferences | null
  
  // UI state
  isDropdownOpen: boolean
  isLoading: boolean
  error: string | null
  
  // Pagination & filtering
  currentPage: number
  hasMore: boolean
  filters: NotificationFilters
  
  // Actions
  fetchNotifications: (reset?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAsUnread: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  
  // Preferences
  fetchPreferences: () => Promise<void>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>
  
  // UI actions
  setDropdownOpen: (open: boolean) => void
  setFilters: (filters: Partial<NotificationFilters>) => void
  clearError: () => void
  
  // Real-time updates
  addNotification: (notification: Notification) => void
  updateNotification: (notificationId: string, updates: Partial<Notification>) => void
  removeNotification: (notificationId: string) => void
  
  // Bulk operations
  markSelectedAsRead: (notificationIds: string[]) => Promise<void>
  deleteSelected: (notificationIds: string[]) => Promise<void>
  
  // Load more for pagination
  loadMore: () => Promise<void>
  
  // Reset state
  reset: () => void
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  isDropdownOpen: false,
  isLoading: false,
  error: null,
  currentPage: 1,
  hasMore: true,
  filters: {},
}

export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Fetch notifications with pagination
    fetchNotifications: async (reset = false) => {
      const { currentPage, filters, notifications } = get()
      const page = reset ? 1 : currentPage

      try {
        set({ isLoading: true, error: null })

        const response = await notificationsApi.getNotifications({
          page,
          limit: 20,
          filters
        })

        const newNotifications = response.notifications
        const hasMore = page < response.pagination.totalPages

        set({
          notifications: reset ? newNotifications : [...notifications, ...newNotifications],
          unreadCount: response.unreadCount,
          currentPage: page,
          hasMore,
          isLoading: false
        })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch notifications',
          isLoading: false
        })
      }
    },

    // Fetch unread count only
    fetchUnreadCount: async () => {
      try {
        const response = await notificationsApi.getUnreadCount()
        set({ unreadCount: response.unreadCount })
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    },

    // Mark notification as read
    markAsRead: async (notificationId: string) => {
      try {
        await notificationsApi.markAsRead(notificationId)
        
        set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.id === notificationId 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to mark as read' })
      }
    },

    // Mark notification as unread (not supported by backend)
    markAsUnread: async (notificationId: string) => {
      // Mark as unread is not supported by the backend
      set({ error: 'Mark as unread is not supported' })
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
      try {
        const response = await notificationsApi.markAllAsRead()
        
        set((state) => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            isRead: true,
            readAt: new Date().toISOString()
          })),
          unreadCount: 0
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to mark all as read' })
      }
    },

    // Delete notification
    deleteNotification: async (notificationId: string) => {
      const notification = get().notifications.find(n => n.id === notificationId)
      
      try {
        await notificationsApi.deleteNotification(notificationId)
        
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadCount: notification && !notification.isRead 
            ? Math.max(0, state.unreadCount - 1) 
            : state.unreadCount
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete notification' })
      }
    },

    // Fetch user preferences
    fetchPreferences: async () => {
      try {
        const preferences = await notificationsApi.getPreferences()
        set({ preferences })
      } catch (error) {
        console.error('Failed to fetch preferences:', error)
        // Set default preferences if API fails
        set({
          preferences: {
            id: '',
            userId: '',
            taskNotifications: true,
            projectNotifications: true,
            meetingNotifications: true,
            reportNotifications: true,
            systemNotifications: true,
            emailNotifications: false,
            pushNotifications: false,
            createdAt: '',
            updatedAt: ''
          }
        })
      }
    },

    // Update user preferences
    updatePreferences: async (updates: Partial<NotificationPreferences>) => {
      try {
        const updatedPreferences = await notificationsApi.updatePreferences(updates)
        set({ preferences: updatedPreferences })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update preferences' })
      }
    },

    // UI actions
    setDropdownOpen: (open: boolean) => {
      console.log(`Setting dropdown state: ${open}`)
      set({ isDropdownOpen: open })
      
      // Clear any errors when closing
      if (!open) {
        set({ error: null })
      }
      
      // Fetch notifications when opening dropdown if we don't have any
      if (open && get().notifications.length === 0) {
        get().fetchNotifications(true)
      }
    },

    setFilters: (newFilters: Partial<NotificationFilters>) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
        currentPage: 1,
        hasMore: true
      }))
      
      // Refetch with new filters
      get().fetchNotifications(true)
    },

    clearError: () => set({ error: null }),

    // Real-time notification updates
    addNotification: (notification: Notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: !notification.isRead ? state.unreadCount + 1 : state.unreadCount
      }))
    },

    updateNotification: (notificationId: string, updates: Partial<Notification>) => {
      set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId)
        if (!notification) return state

        const wasUnread = !notification.isRead
        const willBeUnread = updates.isRead === false || (updates.isRead === undefined && !notification.isRead)
        const unreadCountChange = wasUnread && !willBeUnread ? -1 : !wasUnread && willBeUnread ? 1 : 0

        return {
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, ...updates } : n
          ),
          unreadCount: Math.max(0, state.unreadCount + unreadCountChange)
        }
      })
    },

    removeNotification: (notificationId: string) => {
      const notification = get().notifications.find(n => n.id === notificationId)
      
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: notification && !notification.isRead 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      }))
    },

    // Bulk operations
    markSelectedAsRead: async (notificationIds: string[]) => {
      try {
        await notificationsApi.bulkAction({
          action: 'mark_read',
          notificationIds
        })

        set((state) => {
          const unreadNotifications = state.notifications.filter(
            n => notificationIds.includes(n.id) && !n.isRead
          )

          return {
            notifications: state.notifications.map(notification =>
              notificationIds.includes(notification.id)
                ? { ...notification, isRead: true, readAt: new Date().toISOString() }
                : notification
            ),
            unreadCount: Math.max(0, state.unreadCount - unreadNotifications.length)
          }
        })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to mark notifications as read' })
      }
    },

    deleteSelected: async (notificationIds: string[]) => {
      const { notifications } = get()
      const unreadCount = notifications.filter(
        n => notificationIds.includes(n.id) && !n.isRead
      ).length

      try {
        await notificationsApi.bulkAction({
          action: 'delete',
          notificationIds
        })

        set((state) => ({
          notifications: state.notifications.filter(n => !notificationIds.includes(n.id)),
          unreadCount: Math.max(0, state.unreadCount - unreadCount)
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete notifications' })
      }
    },

    // Load more notifications
    loadMore: async () => {
      const { currentPage, hasMore, isLoading } = get()
      
      if (!hasMore || isLoading) return

      set({ currentPage: currentPage + 1 })
      await get().fetchNotifications()
    },

    // Reset store to initial state
    reset: () => set(initialState)
  }))
)

// Selectors for computed values
export const useUnreadNotifications = () => 
  useNotificationStore(state => state.notifications.filter(n => !n.isRead))

export const useNotificationsByType = (type: NotificationType) =>
  useNotificationStore(state => state.notifications.filter(n => n.type === type))

export const useRecentNotifications = (limit = 5) =>
  useNotificationStore(state => state.notifications.slice(0, limit))

// Initialize store when user logs in
export const initializeNotifications = async () => {
  const store = useNotificationStore.getState()
  await Promise.all([
    store.fetchPreferences(),
    store.fetchUnreadCount()
  ])
}

// Cleanup store when user logs out
export const cleanupNotifications = () => {
  useNotificationStore.getState().reset()
}