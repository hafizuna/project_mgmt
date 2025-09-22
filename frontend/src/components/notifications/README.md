# 🔔 Unified Notification System

A complete, production-ready notification system for React applications with backend integration, real-time updates, and comprehensive user experience.

## ✨ Features

### Backend Features
- **🕐 Automated Scheduling**: CRON-based report reminders and compliance alerts
- **📧 Email Service**: SMTP integration with template system and HTML emails  
- **📊 Report Notifications**: Weekly plan/report reminders with overdue tracking
- **👥 Admin Controls**: Scheduler management, notification statistics, manual triggers
- **🔄 Queue Processing**: Background job processing with retry mechanisms
- **📈 Compliance Monitoring**: Automatic tracking and alerts for low compliance

### Frontend Features  
- **🔔 Notification Bell**: Header component with unread count badge and dropdown
- **📋 Notification Center**: Full-page management with filtering and bulk actions
- **⚙️ User Preferences**: Granular control over notification types and delivery methods
- **🍞 Toast Notifications**: Real-time in-app notifications using Sonner
- **📱 Responsive Design**: Works seamlessly on desktop and mobile
- **⌨️ Keyboard Shortcuts**: Power user features for quick actions

## 🏗️ Architecture

```
📦 Notification System
├── 🔙 Backend
│   ├── 📄 Database Schema (Prisma)
│   │   ├── Notification
│   │   ├── NotificationPreference  
│   │   ├── NotificationTemplate
│   │   └── NotificationQueue
│   ├── 🔧 Services
│   │   ├── NotificationService
│   │   ├── EmailService
│   │   ├── TemplateService
│   │   ├── ReportNotificationService
│   │   └── TaskScheduler
│   └── 🌐 API Routes
│       ├── /api/notifications
│       └── /api/scheduler
└── 🎨 Frontend
    ├── 🧩 Components
    │   ├── NotificationBell
    │   ├── NotificationDropdown
    │   ├── NotificationCenter
    │   ├── NotificationPreferences
    │   └── NotificationItem
    ├── 🏪 State Management (Zustand)
    │   └── notification-store.ts
    ├── 🎣 Custom Hooks
    │   └── useNotificationManager.ts
    └── 📡 API Client
        └── notifications-api.ts
```

## 🚀 Quick Start

### 1. Import Components

```typescript
import { 
  NotificationBell,
  NotificationCenter, 
  NotificationPreferences,
  useNotificationManager 
} from '@/components/notifications'
```

### 2. Add Bell to Layout

```tsx
// In your main layout component
import { NotificationBell } from '@/components/notifications'

export function MainLayout() {
  return (
    <header>
      {/* Other header items */}
      <NotificationBell />
    </header>
  )
}
```

### 3. Initialize Notification Manager

```tsx
// In your app root or layout
import { useNotificationManager } from '@/hooks/useNotificationManager'

export function App() {
  // Enable real-time polling and toasts
  useNotificationManager({ 
    enablePolling: true,
    enableToasts: true 
  })
  
  return (
    <div>
      {/* Your app content */}
      <Toaster position="top-right" />
    </div>
  )
}
```

## 📋 Component Usage

### Notification Bell

```tsx
import { NotificationBell } from '@/components/notifications'

// Basic usage
<NotificationBell />

// With custom props
<NotificationBell 
  size="lg"
  variant="outline" 
  showBadge={true}
  maxBadgeCount={99}
/>

// Compact version
<NotificationBellCompact />
```

### Notification Center

```tsx
import { NotificationCenter } from '@/components/notifications'

// Full-page notification management
<NotificationCenter className="h-screen" />
```

### Notification Preferences

```tsx
import { NotificationPreferences } from '@/components/notifications'

// User settings panel
<NotificationPreferences />
```

## 🎣 Custom Hooks

### useNotificationManager

Primary hook for notification functionality:

```tsx
const { 
  unreadCount,
  showNotificationToast,
  simulateNewNotification,
  showToast 
} = useNotificationManager({
  enableToasts: true,      // Enable toast notifications
  enablePolling: true,     // Poll for new notifications
  pollingInterval: 30000,  // 30 seconds
  toastDuration: 5000      // 5 seconds
})

// Show custom toast
showToast('Success!', { type: 'success' })

// Simulate notification (for testing)
simulateNewNotification(
  NotificationType.TASK_ASSIGNED,
  'New task assigned',
  'Check your inbox'
)
```

### useNotificationPreferences

Manage user notification preferences:

```tsx
const { 
  preferences, 
  updatePreference, 
  isLoading 
} = useNotificationPreferences()

// Toggle email notifications
await updatePreference('emailNotifications', true)
```

### useNotificationShortcuts

Adds keyboard shortcuts automatically:

```tsx
useNotificationShortcuts() // Adds Ctrl+Shift+N and Ctrl+Shift+R
```

## 🏪 State Management

The notification system uses Zustand for state management:

```tsx
import { useNotificationStore } from '@/stores/notification-store'

const {
  notifications,
  unreadCount,
  isLoading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = useNotificationStore()
```

## 📡 API Integration  

### Backend Endpoints

```bash
# Notifications CRUD
GET    /api/notifications              # List notifications  
POST   /api/notifications              # Create notification
GET    /api/notifications/:id          # Get notification
POST   /api/notifications/:id/read     # Mark as read
DELETE /api/notifications/:id          # Delete notification

# Bulk Operations
POST   /api/notifications/bulk         # Bulk actions
POST   /api/notifications/read-all     # Mark all as read

# User Preferences  
GET    /api/notifications/preferences  # Get preferences
PUT    /api/notifications/preferences  # Update preferences

# Admin/Statistics
GET    /api/notifications/stats        # Notification statistics
GET    /api/notifications/unread-count # Unread count only

# Scheduler Management (Admin only)
GET    /api/scheduler/status           # Scheduler status
POST   /api/scheduler/initialize       # Start scheduler
POST   /api/scheduler/stop             # Stop scheduler
POST   /api/scheduler/run-check/:type  # Manual trigger
```

### API Client Usage

```tsx
import { notificationsApi } from '@/lib/notifications-api'

// Fetch notifications
const response = await notificationsApi.getNotifications({
  page: 1,
  limit: 20,
  filters: { isRead: false }
})

// Mark as read
await notificationsApi.markAsRead(notificationId)

// Update preferences
await notificationsApi.updatePreferences({ 
  emailNotifications: true 
})
```

## 🎨 Customization

### Theme Support

The notification system supports your application's theme system:

```tsx
// Components automatically adapt to light/dark mode
// Use CSS variables for consistent theming
:root {
  --notification-bell-bg: hsl(var(--background));
  --notification-unread-bg: hsl(var(--blue-50));
  --notification-badge-bg: hsl(var(--destructive));
}
```

### Custom Icons

Customize notification type icons:

```tsx
import { NOTIFICATION_ICONS } from '@/types/notifications'

// Icons are automatically mapped to Lucide React icons
// Modify NOTIFICATION_ICONS to change icons per type
```

### Email Templates

Backend email templates are customizable in the TemplateService:

```typescript
// Backend: src/services/TemplateService.ts
const template = await templateService.renderTemplate(
  'weekly-plan-reminder',
  { 
    userName: 'John',
    dueDate: '2024-01-15' 
  }
)
```

## 📱 Responsive Design

All components are fully responsive:

- **Desktop**: Full-featured with all controls visible
- **Tablet**: Optimized layout with collapsible sections  
- **Mobile**: Touch-friendly with simplified interface

## ♿ Accessibility

The notification system includes full accessibility support:

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support for all actions
- **Screen Reader**: Compatible with screen reading software
- **Focus Management**: Proper focus handling in dropdowns/modals
- **Color Contrast**: WCAG AA compliant color combinations

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# Frontend (.env)
VITE_API_URL=http://localhost:4000/api
```

### Default Settings

```typescript
// Default notification preferences
{
  taskNotifications: true,
  projectNotifications: true,
  meetingNotifications: true, 
  reportNotifications: true,
  systemNotifications: true,
  emailNotifications: false,
  pushNotifications: false
}

// Default scheduler settings  
{
  planDueDay: 1,        // Monday
  planDueTime: '10:00',
  reportDueDay: 5,      // Friday  
  reportDueTime: '17:00',
  isEnforced: true,
  gracePeriodHours: 24
}
```

## 🧪 Testing

### Component Testing

```tsx
import { render, screen } from '@testing-library/react'
import { NotificationBell } from '@/components/notifications'

test('displays unread count', () => {
  render(<NotificationBell />)
  expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument()
})
```

### Hook Testing  

```tsx
import { renderHook } from '@testing-library/react'
import { useNotificationManager } from '@/hooks/useNotificationManager'

test('manages notification state', () => {
  const { result } = renderHook(() => useNotificationManager())
  expect(result.current.unreadCount).toBe(0)
})
```

## 🚀 Production Deployment

### Backend Deployment

1. **Environment Setup**: Configure SMTP settings
2. **Database Migration**: Run Prisma migrations  
3. **Scheduler Initialization**: Ensure TaskScheduler starts on boot
4. **Monitor Jobs**: Set up logging for CRON jobs

### Frontend Deployment

1. **Build**: `npm run build`
2. **Environment Variables**: Set VITE_API_URL
3. **Bundle Analysis**: Check for optimal bundle size
4. **CDN Setup**: Host assets on CDN for better performance

### Performance Optimization

- **Backend**: Use connection pooling, Redis for caching
- **Frontend**: Lazy load notification center, optimize bundle size
- **Database**: Index notification queries, cleanup old notifications

## 🐛 Troubleshooting

### Common Issues

**Notifications not appearing**
- Check API connection in browser network tab
- Verify notification preferences are enabled
- Ensure backend scheduler is running

**Email not sending**
- Verify SMTP credentials and configuration
- Check spam folder for test emails
- Review email service logs

**Toast notifications not showing**
- Confirm Toaster component is rendered
- Check useNotificationManager is initialized  
- Verify Sonner import and CSS

**Scheduler not running**
- Check backend logs for initialization errors
- Verify node-schedule package is installed
- Ensure proper error handling in CRON jobs

## 📚 API Reference

Complete API documentation is available in the source code with TypeScript types and JSDoc comments.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

Made with ❤️ for modern React applications