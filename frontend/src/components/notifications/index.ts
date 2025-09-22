// Main notification components
export { NotificationBell, NotificationBellCompact, NotificationBellCustom } from './NotificationBell'
export { NotificationDropdown } from './NotificationDropdown'
export { NotificationItem, NotificationItemCompact } from './NotificationItem'
export { NotificationCenter } from './NotificationCenter'
export { NotificationPreferences } from './NotificationPreferences'
export { NotificationDemo } from './NotificationDemo'

// Re-export types for convenience
export type {
  Notification,
  NotificationPreferences as NotificationPreferencesType,
  NotificationsResponse,
  NotificationStats,
  NotificationFilters,
  BulkNotificationAction,
  CreateNotificationRequest,
  NotificationGroup,
  NotificationSetting,
  NotificationIcon
} from '@/types/notifications'

export {
  NotificationType,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  NOTIFICATION_ICONS,
  NOTIFICATION_LABELS
} from '@/types/notifications'

// Re-export store and hooks
export { useNotificationStore, initializeNotifications, cleanupNotifications } from '@/stores/notification-store'
export { 
  useNotificationManager, 
  useNotificationShortcuts, 
  useNotificationPreferences 
} from '@/hooks/useNotificationManager'

// Re-export API client
export { notificationsApi, notificationKeys } from '@/lib/notifications-api'