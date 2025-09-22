import React, { useState } from 'react'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Settings, 
  Save, 
  RefreshCw,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useNotificationPreferences } from '@/hooks/useNotificationManager'
import { NotificationType, NOTIFICATION_LABELS } from '@/types/notifications'

interface NotificationPreferencesProps {
  className?: string
}

interface NotificationCategory {
  key: keyof NonNullable<ReturnType<typeof useNotificationPreferences>['preferences']>
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  types: NotificationType[]
}

const notificationCategories: NotificationCategory[] = [
  {
    key: 'taskNotifications',
    title: 'Tasks & Projects',
    description: 'Notifications about task assignments, due dates, and project updates',
    icon: Bell,
    types: [
      NotificationType.TASK_ASSIGNED,
      NotificationType.TASK_DUE_SOON,
      NotificationType.TASK_OVERDUE,
      NotificationType.TASK_COMPLETED,
      NotificationType.TASK_COMMENTED,
      NotificationType.PROJECT_CREATED,
      NotificationType.PROJECT_UPDATED,
      NotificationType.PROJECT_MILESTONE
    ]
  },
  {
    key: 'meetingNotifications',
    title: 'Meetings',
    description: 'Reminders and updates about scheduled meetings and calls',
    icon: Bell,
    types: [
      NotificationType.MEETING_SCHEDULED,
      NotificationType.MEETING_REMINDER,
      NotificationType.MEETING_STARTED
    ]
  },
  {
    key: 'reportNotifications',
    title: 'Reports & Compliance',
    description: 'Weekly reports, plan submissions, and compliance alerts',
    icon: Bell,
    types: [
      NotificationType.WEEKLY_PLAN_DUE,
      NotificationType.WEEKLY_PLAN_OVERDUE,
      NotificationType.WEEKLY_REPORT_DUE,
      NotificationType.WEEKLY_REPORT_OVERDUE,
      NotificationType.REPORT_SUBMISSION_RECEIVED,
      NotificationType.LOW_COMPLIANCE_ALERT
    ]
  },
  {
    key: 'systemNotifications',
    title: 'System Announcements',
    description: 'Important system updates, maintenance notices, and announcements',
    icon: Bell,
    types: [
      NotificationType.SYSTEM_ANNOUNCEMENT
    ]
  }
]

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const { preferences, updatePreference, isLoading } = useNotificationPreferences()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  if (isLoading) {
    return <NotificationPreferencesSkeleton />
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load preferences</h3>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleTogglePreference = async (
    key: keyof typeof preferences, 
    value: boolean
  ) => {
    setIsSaving(true)
    try {
      await updatePreference(key, value)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to update preference:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Notification Preferences</h2>
            <p className="text-muted-foreground">
              Customize how and when you receive notifications
            </p>
          </div>
        </div>

        {lastSaved && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-600" />
            <span>
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Delivery Methods
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="in-app" className="font-medium">
                  In-App Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the notification bell
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Always On
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email" className="font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to your email address
                </p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => 
                handleTogglePreference('emailNotifications', checked)
              }
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push" className="font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send browser push notifications (coming soon)
                </p>
              </div>
            </div>
            <Switch
              id="push"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => 
                handleTogglePreference('pushNotifications', checked)
              }
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Categories</h3>
        
        {notificationCategories.map((category) => (
          <Card key={category.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <category.icon className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-base">
                      {category.title}
                    </CardTitle>
                    <CardDescription>
                      {category.description}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={Boolean(preferences[category.key])}
                  onCheckedChange={(checked) => 
                    handleTogglePreference(category.key, checked)
                  }
                  disabled={isSaving}
                />
              </div>
            </CardHeader>

            {/* Show notification types when category is enabled */}
            {preferences[category.key] && (
              <CardContent className="pt-0">
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm font-medium mb-3">Included notifications:</p>
                  <div className="flex flex-wrap gap-2">
                    {category.types.map((type) => (
                      <Badge 
                        key={type} 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {NOTIFICATION_LABELS[type]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Email Frequency Settings (if email is enabled) */}
      {preferences.emailNotifications && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>
              Configure your email notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                Email notifications are sent in real-time for urgent notifications, 
                and as daily summaries for others. You can unsubscribe from any email 
                using the link in the footer.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Privacy Notice */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Your notification preferences are stored securely and are only used to 
            deliver notifications according to your settings. You can change these 
            preferences at any time. We never share your notification data with 
            third parties.
          </p>
        </CardContent>
      </Card>

      {/* Loading overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg border shadow-lg">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Saving preferences...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Skeleton loader for preferences
function NotificationPreferencesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Delivery methods skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Categories skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}