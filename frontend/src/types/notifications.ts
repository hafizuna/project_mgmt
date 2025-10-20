export enum NotificationType {
  // Task Related
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DUE_SOON = 'TASK_DUE_SOON',
  TASK_OVERDUE = 'TASK_OVERDUE',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_COMMENT_ADDED = 'TASK_COMMENT_ADDED',
  TASK_MENTION = 'TASK_MENTION',
  
  // Project Related
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_MEMBER_ADDED = 'PROJECT_MEMBER_ADDED',
  PROJECT_DEADLINE_APPROACHING = 'PROJECT_DEADLINE_APPROACHING',
  
  // Meeting Related
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  MEETING_REMINDER = 'MEETING_REMINDER',
  MEETING_CANCELLED = 'MEETING_CANCELLED',
  MEETING_UPDATED = 'MEETING_UPDATED',
  MEETING_STARTING_SOON = 'MEETING_STARTING_SOON',
  
  // Report Related
  WEEKLY_PLAN_DUE = 'WEEKLY_PLAN_DUE',
  WEEKLY_PLAN_OVERDUE = 'WEEKLY_PLAN_OVERDUE',
  WEEKLY_REPORT_DUE = 'WEEKLY_REPORT_DUE',
  WEEKLY_REPORT_OVERDUE = 'WEEKLY_REPORT_OVERDUE',
  REPORT_SUBMISSION_RECEIVED = 'REPORT_SUBMISSION_RECEIVED',
  LOW_COMPLIANCE_ALERT = 'LOW_COMPLIANCE_ALERT',
  
  // System Related
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  SECURITY_ALERT = 'SECURITY_ALERT',
  WELCOME = 'WELCOME',
  
  // General
  CUSTOM = 'CUSTOM'
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
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
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
  // Task Related
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
  [NotificationType.TASK_STATUS_CHANGED]: {
    type: NotificationType.TASK_STATUS_CHANGED,
    icon: 'Activity',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  [NotificationType.TASK_COMMENT_ADDED]: {
    type: NotificationType.TASK_COMMENT_ADDED,
    icon: 'MessageSquare',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  [NotificationType.TASK_MENTION]: {
    type: NotificationType.TASK_MENTION,
    icon: 'AtSign',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100'
  },
  
  // Project Related
  [NotificationType.PROJECT_CREATED]: {
    type: NotificationType.PROJECT_CREATED,
    icon: 'FolderPlus',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.PROJECT_UPDATED]: {
    type: NotificationType.PROJECT_UPDATED,
    icon: 'FolderEdit',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  [NotificationType.PROJECT_MEMBER_ADDED]: {
    type: NotificationType.PROJECT_MEMBER_ADDED,
    icon: 'UserPlus',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100'
  },
  [NotificationType.PROJECT_DEADLINE_APPROACHING]: {
    type: NotificationType.PROJECT_DEADLINE_APPROACHING,
    icon: 'Calendar',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  
  // Meeting Related
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
  [NotificationType.MEETING_CANCELLED]: {
    type: NotificationType.MEETING_CANCELLED,
    icon: 'CalendarX',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.MEETING_UPDATED]: {
    type: NotificationType.MEETING_UPDATED,
    icon: 'CalendarClock',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.MEETING_STARTING_SOON]: {
    type: NotificationType.MEETING_STARTING_SOON,
    icon: 'Video',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  
  // Report Related
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
  
  // System Related
  [NotificationType.SYSTEM_MAINTENANCE]: {
    type: NotificationType.SYSTEM_MAINTENANCE,
    icon: 'Settings',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  [NotificationType.ACCOUNT_UPDATED]: {
    type: NotificationType.ACCOUNT_UPDATED,
    icon: 'User',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.SECURITY_ALERT]: {
    type: NotificationType.SECURITY_ALERT,
    icon: 'Shield',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.WELCOME]: {
    type: NotificationType.WELCOME,
    icon: 'Heart',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  [NotificationType.CUSTOM]: {
    type: NotificationType.CUSTOM,
    icon: 'Bell',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  // Task Related
  [NotificationType.TASK_ASSIGNED]: 'Task Assigned',
  [NotificationType.TASK_DUE_SOON]: 'Task Due Soon',
  [NotificationType.TASK_OVERDUE]: 'Task Overdue',
  [NotificationType.TASK_STATUS_CHANGED]: 'Task Updated',
  [NotificationType.TASK_COMMENT_ADDED]: 'Task Comment',
  [NotificationType.TASK_MENTION]: 'Task Mention',
  
  // Project Related
  [NotificationType.PROJECT_CREATED]: 'Project Created',
  [NotificationType.PROJECT_UPDATED]: 'Project Updated',
  [NotificationType.PROJECT_MEMBER_ADDED]: 'Member Added',
  [NotificationType.PROJECT_DEADLINE_APPROACHING]: 'Deadline Approaching',
  
  // Meeting Related
  [NotificationType.MEETING_SCHEDULED]: 'Meeting Scheduled',
  [NotificationType.MEETING_REMINDER]: 'Meeting Reminder',
  [NotificationType.MEETING_CANCELLED]: 'Meeting Cancelled',
  [NotificationType.MEETING_UPDATED]: 'Meeting Updated',
  [NotificationType.MEETING_STARTING_SOON]: 'Meeting Starting',
  
  // Report Related
  [NotificationType.WEEKLY_PLAN_DUE]: 'Weekly Plan Due',
  [NotificationType.WEEKLY_PLAN_OVERDUE]: 'Plan Overdue',
  [NotificationType.WEEKLY_REPORT_DUE]: 'Weekly Report Due',
  [NotificationType.WEEKLY_REPORT_OVERDUE]: 'Report Overdue',
  [NotificationType.REPORT_SUBMISSION_RECEIVED]: 'Report Submitted',
  [NotificationType.LOW_COMPLIANCE_ALERT]: 'Low Compliance',
  
  // System Related
  [NotificationType.SYSTEM_MAINTENANCE]: 'System Maintenance',
  [NotificationType.ACCOUNT_UPDATED]: 'Account Updated',
  [NotificationType.SECURITY_ALERT]: 'Security Alert',
  [NotificationType.WELCOME]: 'Welcome',
  [NotificationType.CUSTOM]: 'Notification'
}
