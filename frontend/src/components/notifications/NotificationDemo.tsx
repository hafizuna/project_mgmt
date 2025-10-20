import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  PlayCircle, 
  Settings,
  Zap,
  Users,
  FileText,
  Calendar
} from 'lucide-react'
import { 
  NotificationBell,
  NotificationCenter,
  NotificationPreferences,
  NotificationType,
  NotificationPriority
} from './index'
import { useNotificationManager } from '@/hooks/useNotificationManager'

export function NotificationDemo() {
  const { simulateNewNotification, showToast } = useNotificationManager()
  const [activeDemo, setActiveDemo] = useState<'bell' | 'center' | 'preferences'>('bell')

  const demoNotifications = [
    {
      type: NotificationType.TASK_ASSIGNED,
      title: 'New task assigned: Update project documentation',
      message: 'John assigned you a new task with high priority. Due date: Tomorrow at 5:00 PM'
    },
    {
      type: NotificationType.WEEKLY_REPORT_DUE,
      title: 'Weekly report due soon',
      message: 'Your weekly report is due in 2 hours. Please submit it before the deadline.'
    },
    {
      type: NotificationType.MEETING_REMINDER,
      title: 'Meeting starting in 15 minutes',
      message: 'Team standup meeting with Sarah, Mike, and 3 others starts at 2:00 PM'
    },
    {
      type: NotificationType.PROJECT_UPDATED,
      title: 'Project updated: Website Redesign',
      message: 'Great progress! The project timeline has been updated with new milestones.'
    },
    {
      type: NotificationType.LOW_COMPLIANCE_ALERT,
      title: 'Low compliance alert',
      message: 'Weekly report compliance has dropped to 65%. Immediate action required.'
    }
  ]

  const simulateRandomNotification = () => {
    const randomNotification = demoNotifications[Math.floor(Math.random() * demoNotifications.length)]
    simulateNewNotification(
      randomNotification.type,
      randomNotification.title,
      randomNotification.message
    )
  }

  const showCustomToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: 'Task completed successfully!',
      error: 'Failed to save changes. Please try again.',
      warning: 'Meeting will start in 5 minutes',
      info: 'New feature available: Dark mode'
    }
    
    showToast(messages[type], { type })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Bell className="h-8 w-8" />
          Notification System Demo
        </h1>
        <p className="text-muted-foreground">
          Explore the complete notification system with interactive examples
        </p>
      </div>

      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Interactive Demo Controls
          </CardTitle>
          <CardDescription>
            Try out the notification system with these demo buttons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={simulateRandomNotification} className="gap-2">
              <Zap className="h-4 w-4" />
              Simulate Notification
            </Button>
            
            <Button onClick={() => showCustomToast('success')} variant="outline" className="gap-2">
              Success Toast
            </Button>
            
            <Button onClick={() => showCustomToast('error')} variant="outline" className="gap-2">
              Error Toast
            </Button>
            
            <Button onClick={() => showCustomToast('warning')} variant="outline" className="gap-2">
              Warning Toast
            </Button>
            
            <Button onClick={() => showCustomToast('info')} variant="outline" className="gap-2">
              Info Toast
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Tip:</strong> Try the notification bell in the top right corner after simulating notifications!</p>
          </div>
        </CardContent>
      </Card>

      {/* Component Showcase */}
      <Tabs value={activeDemo} onValueChange={(value) => setActiveDemo(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bell" className="gap-2">
            <Bell className="h-4 w-4" />
            Notification Bell
          </TabsTrigger>
          <TabsTrigger value="center" className="gap-2">
            <Users className="h-4 w-4" />
            Notification Center
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bell" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Bell Component</CardTitle>
              <CardDescription>
                The notification bell appears in the header and shows unread count with a dropdown menu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Live notification bell:</span>
                <NotificationBell />
                <Badge variant="outline" className="text-xs">
                  Integrated in header
                </Badge>
              </div>
              
              <div className="text-sm space-y-2">
                <h4 className="font-medium">Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Real-time unread count badge</li>
                  <li>Dropdown with recent notifications</li>
                  <li>Mark all as read functionality</li>
                  <li>Infinite scroll for older notifications</li>
                  <li>Quick action buttons per notification</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="center" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Center</CardTitle>
              <CardDescription>
                Full-page notification management with advanced filtering and bulk actions
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px] border rounded-lg overflow-hidden">
              <NotificationCenter />
            </CardContent>
          </Card>
          
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Advanced search and filtering by type, status, priority, and date range</li>
              <li>Bulk selection and actions (mark as read, delete)</li>
              <li>Grouped by date for better organization</li>
              <li>Infinite scroll with load more functionality</li>
              <li>Responsive design for mobile and desktop</li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                User preferences panel for customizing notification delivery and types
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <NotificationPreferences />
            </CardContent>
          </Card>
          
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Toggle notification categories (Tasks, Meetings, Reports, System)</li>
              <li>Configure delivery methods (In-app, Email, Push)</li>
              <li>Real-time saving with visual feedback</li>
              <li>Detailed view of included notification types</li>
              <li>Privacy and data usage information</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Technical Implementation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Backend Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• CRON-based automated reminders</li>
                <li>• Email service with SMTP support</li>
                <li>• Template system for notifications</li>
                <li>• Bulk operations and queue processing</li>
                <li>• Admin controls and compliance monitoring</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Frontend Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Zustand state management</li>
                <li>• Real-time toast notifications</li>
                <li>• Infinite scroll and pagination</li>
                <li>• Responsive design with Tailwind CSS</li>
                <li>• TypeScript for type safety</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">React 18</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="secondary">Zustand</Badge>
            <Badge variant="secondary">Radix UI</Badge>
            <Badge variant="secondary">Tailwind CSS</Badge>
            <Badge variant="secondary">Sonner</Badge>
            <Badge variant="secondary">Express.js</Badge>
            <Badge variant="secondary">Prisma</Badge>
            <Badge variant="secondary">Node Schedule</Badge>
            <Badge variant="secondary">Nodemailer</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span>Mark all as read</span>
                <Badge variant="outline" className="text-xs font-mono">
                  Ctrl + Shift + N
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span>Refresh notifications</span>
                <Badge variant="outline" className="text-xs font-mono">
                  Ctrl + Shift + R
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}