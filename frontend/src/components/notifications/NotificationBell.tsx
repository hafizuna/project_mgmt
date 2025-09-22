import React, { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notification-store'
import { NotificationDropdown } from './NotificationDropdown'

interface NotificationBellProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showBadge?: boolean
  maxBadgeCount?: number
}

export function NotificationBell({
  className,
  size = 'md',
  variant = 'ghost',
  showBadge = true,
  maxBadgeCount = 99
}: NotificationBellProps) {
  const {
    unreadCount,
    isDropdownOpen,
    setDropdownOpen,
    fetchUnreadCount,
    error
  } = useNotificationStore()

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount()
    
    // Set up periodic refresh of unread count (every 30 seconds)
    const interval = setInterval(fetchUnreadCount, 30000)
    
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Icon size based on button size
  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  }[size]

  // Display count with max limit
  const displayCount = unreadCount > maxBadgeCount ? `${maxBadgeCount}+` : unreadCount.toString()

  // Badge positioning classes based on button size
  const badgeClasses = {
    sm: '-top-1 -right-1 h-4 w-4 text-xs',
    md: '-top-2 -right-2 h-5 w-5 text-xs',
    lg: '-top-2 -right-2 h-6 w-6 text-sm'
  }[size]

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size === 'sm' ? 'sm' : 'icon'}
          className={cn(
            'relative transition-all duration-200',
            unreadCount > 0 && 'animate-pulse',
            error && 'text-destructive',
            className
          )}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell 
            size={iconSize} 
            className={cn(
              'transition-transform duration-200',
              isDropdownOpen && 'scale-110'
            )}
          />
          
          {/* Unread count badge */}
          {showBadge && unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className={cn(
                'absolute flex items-center justify-center rounded-full border-2 border-background font-semibold',
                'animate-in zoom-in-75 duration-200',
                badgeClasses
              )}
            >
              {displayCount}
            </Badge>
          )}
          
          {/* Error indicator */}
          {error && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
          
          {/* Online indicator dot */}
          <div className="absolute -bottom-0.5 -left-0.5 h-1.5 w-1.5 rounded-full bg-green-500 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        side="bottom"
        sideOffset={8}
      >
        <NotificationDropdown />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact version for mobile/sidebar
export function NotificationBellCompact({ className }: { className?: string }) {
  return (
    <NotificationBell
      size="sm"
      variant="ghost"
      className={className}
    />
  )
}

// Version with custom trigger (for custom layouts)
export function NotificationBellCustom({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  const { isDropdownOpen, setDropdownOpen } = useNotificationStore()

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild className={className}>
        {children}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        side="bottom"
        sideOffset={8}
      >
        <NotificationDropdown />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}