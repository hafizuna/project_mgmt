export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DUE_SOON = 'TASK_DUE_SOON',
  TASK_OVERDUE = 'TASK_OVERDUE',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_COMMENTED = 'TASK_COMMENTED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_MILESTONE = 'PROJECT_MILESTONE',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_REMINDER = 'MEETING_REMINDER',
  MEETING_STARTED = 'MEETING_STARTED',
  WEEKLY_PLAN_DUE = 'WEEKLY_PLAN_DUE',
  WEEKLY_PLAN_OVERDUE = 'WEEKLY_PLAN_OVERDUE',
  WEEKLY_REPORT_DUE = 'WEEKLY_REPORT_DUE',
  WEEKLY_REPORT_OVERDUE = 'WEEKLY_REPORT_OVERDUE',
  REPORT_SUBMISSION_RECEIVED = 'REPORT_SUBMISSION_RECEIVED',
  LOW_COMPLIANCE_ALERT = 'LOW_COMPLIANCE_ALERT',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT'
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH'
}

export enum NotificationCategory {
  TASK = 'TASK',
  PROJECT = 'PROJECT', 
  MEETING = 'MEETING',
  REPORT = 'REPORT',
  SYSTEM = 'SYSTEM'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface NotificationUser {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface Notification {
  id: string
  userId: string
  orgId: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: Record<string, any>
  priority: NotificationPriority
  isRead: boolean
  readAt?: string
  scheduledFor?: string
  deliveredAt?: string
  deliveredViaApp?: boolean
  deliveredViaEmail?: boolean
  deliveredViaPush?: boolean
  entityType?: string
  entityId?: string
  createdAt: string
  updatedAt: string
  user: NotificationUser
}

export interface NotificationPreferences {
  id: string
  userId: string
  orgId: string
  enableInApp: boolean
  enableEmail: boolean
  enablePush: boolean
  emailDigestFrequency: 'Never' | 'Immediate' | 'Hourly' | 'Daily' | 'Weekly'
  taskNotifications: boolean
  projectNotifications: boolean
  meetingNotifications: boolean
  reportNotifications: boolean
  systemNotifications: boolean
  taskEmail: boolean
  projectEmail: boolean
  meetingEmail: boolean
  reportEmail: boolean
  systemEmail: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  quietHoursTimezone: string
  enableWeekendsEmail: boolean
  enableWeekendsApp: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateNotificationRequest {
  userIds: string[]
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
  data?: Record<string, any>
  entityType?: string
  entityId?: string
  priority?: NotificationPriority
  scheduledFor?: string
}

export interface NotificationFilters {
  type?: NotificationType
  category?: NotificationCategory
  unreadOnly?: boolean
  priority?: NotificationPriority
  dateFrom?: string
  dateTo?: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface NotificationStats {
  totalNotifications: number
  unreadCount: number
  recentCount: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
}

export interface BulkNotificationAction {
  action: 'mark_read' | 'mark_unread' | 'delete'
  notificationIds: string[]
}

// Frontend-specific types for UI components
export interface NotificationGroup {
  date: string
  notifications: Notification[]
}

export interface NotificationSetting {
  type: NotificationType
  label: string
  description: string
  enabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
}

export interface NotificationIcon {
  type: NotificationType
  icon: string
  color: string
  bgColor: string
}

export const NOTIFICATION_ICONS: Record<NotificationType, NotificationIcon> = {
  [NotificationType.TASK_ASSIGNED]: {
    type: NotificationType.TASK_ASSIGNED,
    icon: 'UserPlus',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.TASK_DUE_SOON]: {
    type: NotificationType.TASK_DUE_SOON,
    icon: 'Clock',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  [NotificationType.TASK_OVERDUE]: {
    type: NotificationType.TASK_OVERDUE,
    icon: 'AlertCircle',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.TASK_COMPLETED]: {
    type: NotificationType.TASK_COMPLETED,
    icon: 'CheckCircle',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  [NotificationType.TASK_COMMENTED]: {
    type: NotificationType.TASK_COMMENTED,
    icon: 'MessageSquare',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  [NotificationType.PROJECT_CREATED]: {
    type: NotificationType.PROJECT_CREATED,
    icon: 'Folder',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.PROJECT_UPDATED]: {
    type: NotificationType.PROJECT_UPDATED,
    icon: 'FolderEdit',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  [NotificationType.PROJECT_MILESTONE]: {
    type: NotificationType.PROJECT_MILESTONE,
    icon: 'Target',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100'
  },
  [NotificationType.MEETING_SCHEDULED]: {
    type: NotificationType.MEETING_SCHEDULED,
    icon: 'Calendar',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100'
  },
  [NotificationType.MEETING_REMINDER]: {
    type: NotificationType.MEETING_REMINDER,
    icon: 'Bell',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  [NotificationType.MEETING_STARTED]: {
    type: NotificationType.MEETING_STARTED,
    icon: 'Video',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  [NotificationType.WEEKLY_PLAN_DUE]: {
    type: NotificationType.WEEKLY_PLAN_DUE,
    icon: 'Calendar',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.WEEKLY_PLAN_OVERDUE]: {
    type: NotificationType.WEEKLY_PLAN_OVERDUE,
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.WEEKLY_REPORT_DUE]: {
    type: NotificationType.WEEKLY_REPORT_DUE,
    icon: 'FileText',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  [NotificationType.WEEKLY_REPORT_OVERDUE]: {
    type: NotificationType.WEEKLY_REPORT_OVERDUE,
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.REPORT_SUBMISSION_RECEIVED]: {
    type: NotificationType.REPORT_SUBMISSION_RECEIVED,
    icon: 'FileCheck',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  [NotificationType.LOW_COMPLIANCE_ALERT]: {
    type: NotificationType.LOW_COMPLIANCE_ALERT,
    icon: 'AlertCircle',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    icon: 'Megaphone',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  [NotificationType.TASK_ASSIGNED]: 'Task Assigned',
  [NotificationType.TASK_DUE_SOON]: 'Task Due Soon',
  [NotificationType.TASK_OVERDUE]: 'Task Overdue',
  [NotificationType.TASK_COMPLETED]: 'Task Completed',
  [NotificationType.TASK_COMMENTED]: 'Task Commented',
  [NotificationType.PROJECT_CREATED]: 'Project Created',
  [NotificationType.PROJECT_UPDATED]: 'Project Updated',
  [NotificationType.PROJECT_MILESTONE]: 'Project Milestone',
  [NotificationType.MEETING_SCHEDULED]: 'Meeting Scheduled',
  [NotificationType.MEETING_REMINDER]: 'Meeting Reminder',
  [NotificationType.MEETING_STARTED]: 'Meeting Started',
  [NotificationType.WEEKLY_PLAN_DUE]: 'Weekly Plan Due',
  [NotificationType.WEEKLY_PLAN_OVERDUE]: 'Weekly Plan Overdue',
  [NotificationType.WEEKLY_REPORT_DUE]: 'Weekly Report Due',
  [NotificationType.WEEKLY_REPORT_OVERDUE]: 'Weekly Report Overdue',
  [NotificationType.REPORT_SUBMISSION_RECEIVED]: 'Report Submitted',
  [NotificationType.LOW_COMPLIANCE_ALERT]: 'Low Compliance Alert',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: 'System Announcement'
}