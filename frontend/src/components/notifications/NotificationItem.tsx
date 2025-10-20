import React from 'react'
import * as LucideIcons from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notification-store'
import { 
  Notification, 
  NotificationPriority,
  NOTIFICATION_ICONS, 
  NOTIFICATION_LABELS 
} from '@/types/notifications'

interface NotificationItemProps {
  notification: Notification
  className?: string
  showActions?: boolean
  onClick?: () => void
}

export function NotificationItem({
  notification,
  className,
  showActions = true,
  onClick
}: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotificationStore()

  // Handle missing notification icon configuration with fallback
  const config = NOTIFICATION_ICONS[notification.type] || {
    type: notification.type,
    icon: 'Bell',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
  const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.Bell

  const handleItemClick = () => {
    // Mark as read when clicked
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    
    // Call custom onClick if provided
    onClick?.()
  }

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification(notification.id)
  }

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.Critical:
        return <Badge variant="destructive" className="h-5 px-1.5 text-xs">Critical</Badge>
      case NotificationPriority.High:
        return <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-orange-100 text-orange-700">High</Badge>
      case NotificationPriority.Medium:
        return null
      case NotificationPriority.Low:
        return <Badge variant="outline" className="h-5 px-1.5 text-xs">Low</Badge>
      default:
        return null
    }
  }

  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:bg-muted/50 cursor-pointer',
        !notification.isRead && 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
        notification.isRead && 'border-transparent',
        className
      )}
      onClick={handleItemClick}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
      )}

      {/* Notification icon */}
      <div className={cn(
        'flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full',
        config.bgColor
      )}>
        <IconComponent className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'text-sm line-clamp-2 mb-1',
              !notification.isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
            )}>
              {notification.title}
            </h4>
            {notification.message && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {notification.message}
              </p>
            )}
          </div>

          {/* Priority badge */}
          {notification.priority !== NotificationPriority.Medium && (
            <div className="flex-shrink-0">
              {getPriorityBadge(notification.priority)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {getRelativeTime(notification.createdAt)}
            </span>
            
            {/* Type label */}
            <Badge variant="outline" className="h-4 px-1.5 text-xs">
              {NOTIFICATION_LABELS[notification.type] || notification.type.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleMarkAsRead}
                  title="Mark as read"
                >
                  <LucideIcons.Check className="h-3 w-3" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <LucideIcons.MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.isRead && (
                    <DropdownMenuItem onClick={handleMarkAsRead}>
                      <LucideIcons.Check className="h-4 w-4 mr-2" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <LucideIcons.Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function NotificationItemCompact({
  notification,
  className,
  onClick
}: NotificationItemProps) {
  const { markAsRead } = useNotificationStore()
  
  // Handle missing notification icon configuration with fallback
  const config = NOTIFICATION_ICONS[notification.type] || {
    type: notification.type,
    icon: 'Bell',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
  const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.Bell

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    onClick?.()
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors',
        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
        className
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full',
        config.bgColor
      )}>
        <IconComponent className={cn('h-3 w-3', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs line-clamp-1',
          !notification.isRead ? 'font-medium' : 'text-muted-foreground'
        )}>
          {notification.title}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      )}
    </div>
  )
}