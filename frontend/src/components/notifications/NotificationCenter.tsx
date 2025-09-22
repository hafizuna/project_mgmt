import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Trash2, 
  MoreVertical,
  Bell,
  Settings,
  RefreshCw,
  Archive,
  AlertCircle,
  CheckCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notification-store'
import { 
  NotificationType, 
  NotificationPriority,
  NotificationFilters,
  NOTIFICATION_LABELS 
} from '@/types/notifications'
import { NotificationItem } from './NotificationItem'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    filters,
    fetchNotifications,
    setFilters,
    markAllAsRead,
    markSelectedAsRead,
    deleteSelected,
    clearError
  } = useNotificationStore()

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectMode, setIsSelectMode] = useState(false)

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications(true)
  }, [fetchNotifications])

  // Filter notifications based on search query
  const filteredNotifications = notifications.filter(notification => {
    const searchLower = searchQuery.toLowerCase()
    return (
      notification.title.toLowerCase().includes(searchLower) ||
      notification.message?.toLowerCase().includes(searchLower) ||
      NOTIFICATION_LABELS[notification.type].toLowerCase().includes(searchLower)
    )
  })

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    const groups: { [key: string]: typeof filteredNotifications } = {}
    
    filteredNotifications.forEach(notification => {
      const date = format(new Date(notification.createdAt), 'yyyy-MM-dd')
      const label = format(new Date(notification.createdAt), 'MMM dd, yyyy')
      
      if (!groups[label]) {
        groups[label] = []
      }
      groups[label].push(notification)
    })
    
    return Object.entries(groups).sort((a, b) => 
      new Date(b[1][0].createdAt).getTime() - new Date(a[1][0].createdAt).getTime()
    )
  }, [filteredNotifications])

  // Handle filter changes
  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setFilters({ [key]: value })
  }

  // Handle date range filter
  const handleDateRangeFilter = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date()
    let dateFrom: string | undefined
    let dateTo: string | undefined

    switch (range) {
      case 'today':
        dateFrom = format(now, 'yyyy-MM-dd')
        dateTo = format(now, 'yyyy-MM-dd')
        break
      case 'week':
        dateFrom = format(startOfWeek(now), 'yyyy-MM-dd')
        dateTo = format(endOfWeek(now), 'yyyy-MM-dd')
        break
      case 'month':
        dateFrom = format(startOfMonth(now), 'yyyy-MM-dd')
        dateTo = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case 'all':
      default:
        dateFrom = undefined
        dateTo = undefined
        break
    }

    setFilters({ dateFrom, dateTo })
  }

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id))
    }
  }

  const toggleSelectNotification = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }

  // Bulk actions
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return
    await markSelectedAsRead(selectedIds)
    setSelectedIds([])
    setIsSelectMode(false)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} notifications?`)) return
    await deleteSelected(selectedIds)
    setSelectedIds([])
    setIsSelectMode(false)
  }

  const handleRefresh = () => {
    fetchNotifications(true)
    setSelectedIds([])
    setIsSelectMode(false)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6" />
              <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}

              <Button
                variant={isSelectMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsSelectMode(!isSelectMode)
                  setSelectedIds([])
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.type || 'all'}
                onValueChange={(value) => handleFilterChange('type', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(NOTIFICATION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={
                  filters.isRead === undefined ? 'all' : 
                  filters.isRead ? 'read' : 'unread'
                }
                onValueChange={(value) => 
                  handleFilterChange('isRead', 
                    value === 'all' ? undefined : 
                    value === 'read' ? true : false
                  )
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) => handleFilterChange('priority', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value={NotificationPriority.URGENT}>Urgent</SelectItem>
                  <SelectItem value={NotificationPriority.HIGH}>High</SelectItem>
                  <SelectItem value={NotificationPriority.NORMAL}>Normal</SelectItem>
                  <SelectItem value={NotificationPriority.LOW}>Low</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDateRangeFilter('today')}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeFilter('week')}>
                    This week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDateRangeFilter('month')}>
                    This month
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDateRangeFilter('all')}>
                    All time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {isSelectMode && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.length === filteredNotifications.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm">
                    {selectedIds.length} of {filteredNotifications.length} selected
                  </span>
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkMarkAsRead}
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Mark read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border-l-4 border-destructive">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Loading state */}
          {isLoading && notifications.length === 0 && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-[80%]" />
                        <Skeleton className="h-3 w-[60%]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredNotifications.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchQuery 
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "You're all caught up! New notifications will appear here when they arrive."
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grouped notifications */}
          {groupedNotifications.map(([dateLabel, groupNotifications]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {dateLabel}
                </h3>
                <div className="flex-1 h-px bg-border" />
                <Badge variant="outline" className="text-xs">
                  {groupNotifications.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {groupNotifications.map((notification) => (
                  <div key={notification.id} className="relative">
                    {isSelectMode && (
                      <div className="absolute left-3 top-3 z-10">
                        <Checkbox
                          checked={selectedIds.includes(notification.id)}
                          onCheckedChange={() => toggleSelectNotification(notification.id)}
                        />
                      </div>
                    )}
                    <NotificationItem
                      notification={notification}
                      className={cn(
                        isSelectMode && 'pl-12',
                        selectedIds.includes(notification.id) && 'bg-blue-50 dark:bg-blue-950/20'
                      )}
                      showActions={!isSelectMode}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load more button */}
          {hasMore && !isLoading && (
            <div className="text-center pt-6">
              <Button
                variant="outline"
                onClick={() => fetchNotifications()}
                disabled={isLoading}
              >
                Load more notifications
              </Button>
            </div>
          )}

          {/* End of results */}
          {!hasMore && notifications.length > 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                You've reached the end of your notifications
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}