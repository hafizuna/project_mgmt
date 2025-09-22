import React, { useEffect, useRef } from 'react'
import { 
  Bell, 
  CheckCheck, 
  Settings, 
  ExternalLink,
  MoreVertical,
  Trash2,
  Clock,
  X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notification-store'
import { Notification, NOTIFICATION_ICONS, NOTIFICATION_LABELS } from '@/types/notifications'
import { NotificationItem } from './NotificationItem'

interface NotificationDropdownProps {
  onViewAll?: () => void
  onPreferences?: () => void
}

export function NotificationDropdown({ 
  onViewAll, 
  onPreferences 
}: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    fetchNotifications,
    markAllAsRead,
    clearError,
    loadMore
  } = useNotificationStore()

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Fetch notifications on mount if not already loaded
  useEffect(() => {
    if (!hasInitialized && notifications.length === 0) {
      fetchNotifications(true)
      setHasInitialized(true)
    }
  }, [fetchNotifications, notifications.length, hasInitialized])


  // Handle scroll for infinite loading
  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50

    if (isNearBottom && hasMore && !isLoading) {
      loadMore()
    }
  }, [hasMore, isLoading, loadMore])

  // Group notifications by read status
  const unreadNotifications = notifications.filter(n => !n.isRead)
  const readNotifications = notifications.filter(n => n.isRead)

  const handleViewAll = () => {
    onViewAll?.()
  }

  const handlePreferences = () => {
    onPreferences?.()
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  return (
    <div className="flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-5 px-2 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="h-8 px-2 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View All
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-destructive/10 text-destructive text-sm">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1"
        onScrollCapture={handleScroll}
      >
        <div className="p-2">
          {/* Empty state */}
          {!isLoading && notifications.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="font-medium text-sm mb-1">No notifications</h4>
              <p className="text-xs text-muted-foreground">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          )}

          {/* Unread notifications */}
          {unreadNotifications.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-2 px-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Unread ({unreadNotifications.length})
                </span>
              </div>
              {unreadNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  className="mb-1"
                />
              ))}
              {readNotifications.length > 0 && <Separator className="my-3" />}
            </>
          )}

          {/* Read notifications */}
          {readNotifications.length > 0 && (
            <>
              {unreadNotifications.length > 0 && (
                <div className="flex items-center gap-2 mb-2 px-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Earlier
                  </span>
                </div>
              )}
              {readNotifications.slice(0, 10).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  className="mb-1 opacity-60"
                />
              ))}
            </>
          )}

          {/* Loading state */}
          {isLoading && notifications.length === 0 && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[80%]" />
                      <Skeleton className="h-3 w-[60%]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more indicator */}
          {isLoading && notifications.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 animate-spin" />
                Loading more...
              </div>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && notifications.length > 0 && (
            <div className="text-center py-3">
              <span className="text-xs text-muted-foreground">
                You've seen all notifications
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3">
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleViewAll}
            className="text-xs"
          >
            View all notifications
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handlePreferences}
            className="text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  )
}