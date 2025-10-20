import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationItem } from './NotificationItem'
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory 
} from '@/types/notifications'

// Sample test notifications with all the required fields
const testNotifications: Notification[] = [
  {
    id: '1',
    userId: 'test-user',
    orgId: 'test-org',
    type: NotificationType.TASK_ASSIGNED,
    category: NotificationCategory.TASK,
    title: 'New task assigned to you',
    message: 'You have been assigned a new task: Complete project documentation',
    priority: NotificationPriority.High,
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com'
    }
  },
  {
    id: '2',
    userId: 'test-user',
    orgId: 'test-org',
    type: NotificationType.MEETING_REMINDER,
    category: NotificationCategory.MEETING,
    title: 'Meeting reminder',
    message: 'Daily standup meeting starts in 15 minutes',
    priority: NotificationPriority.Medium,
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    readAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com'
    }
  },
  {
    id: '3',
    userId: 'test-user',
    orgId: 'test-org',
    type: NotificationType.TASK_OVERDUE,
    category: NotificationCategory.TASK,
    title: 'Task overdue',
    message: 'Task "Update website design" is now overdue by 2 days',
    priority: NotificationPriority.Critical,
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com'
    }
  },
  {
    id: '4',
    userId: 'test-user',
    orgId: 'test-org',
    type: NotificationType.PROJECT_MEMBER_ADDED,
    category: NotificationCategory.PROJECT,
    title: 'Added to project',
    message: 'You have been added to the "Website Redesign" project',
    priority: NotificationPriority.Low,
    isRead: false,
    createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    updatedAt: new Date(Date.now() - 10800000).toISOString(),
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com'
    }
  }
]

export function NotificationTest() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Components Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => console.log('Notification clicked:', notification)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Types Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Task Related</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>✅ TASK_ASSIGNED</li>
                <li>✅ TASK_OVERDUE</li>
                <li>⚠️ TASK_DUE_SOON</li>
                <li>⚠️ TASK_STATUS_CHANGED</li>
                <li>⚠️ TASK_COMMENT_ADDED</li>
                <li>⚠️ TASK_MENTION</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Project Related</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>⚠️ PROJECT_CREATED</li>
                <li>⚠️ PROJECT_UPDATED</li>
                <li>✅ PROJECT_MEMBER_ADDED</li>
                <li>⚠️ PROJECT_DEADLINE_APPROACHING</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Meeting Related</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>⚠️ MEETING_SCHEDULED</li>
                <li>✅ MEETING_REMINDER</li>
                <li>⚠️ MEETING_CANCELLED</li>
                <li>⚠️ MEETING_UPDATED</li>
                <li>⚠️ MEETING_STARTING_SOON</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">System Related</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>⚠️ SYSTEM_MAINTENANCE</li>
                <li>⚠️ ACCOUNT_UPDATED</li>
                <li>⚠️ SECURITY_ALERT</li>
                <li>⚠️ WELCOME</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            ✅ = Tested above, ⚠️ = Icons configured but not tested
          </div>
        </CardContent>
      </Card>
    </div>
  )
}