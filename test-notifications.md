# Notification System Testing Guide

## Prerequisites
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to: http://localhost:8082 (or the port shown)

## Test Steps

### 1. Test Notification Bell Functionality ✅
- **Location**: Header of any page in the main layout
- **Expected**: 
  - Bell icon visible in top-right corner
  - Should show unread count badge (may be 0 initially)
  - Click bell to open dropdown
  - Dropdown should show loading state then notifications (may be empty)

### 2. Test Demo Page ✅  
- **Location**: Navigate to `/notifications/demo` via sidebar or URL
- **Expected**:
  - Tabbed interface showing Bell, Center, Preferences tabs
  - Buttons to simulate notifications and show toast messages
  - All notification components should render without errors

### 3. Test Notification Center ✅
- **Location**: Navigate to `/notifications` via sidebar or URL  
- **Expected**:
  - Full-page notification center
  - Filter options (All, Unread, Read)
  - Search functionality
  - Bulk action buttons
  - Notifications grouped by date

### 4. Test Notification Preferences ✅
- **Location**: Navigate to `/notifications/preferences` via URL
- **Expected**:
  - Preference toggles for different notification types
  - Email/push notification settings
  - Quiet hours configuration
  - Save functionality with visual feedback

## Features to Test

### Bell Component Features:
- ✅ Unread count display
- ✅ Dropdown with notifications list
- ✅ Mark as read functionality
- ✅ Delete notification
- ✅ "View All" link to notification center

### Center Component Features:
- ✅ Search notifications
- ✅ Filter by status (All/Unread/Read)
- ✅ Bulk select and actions
- ✅ Date grouping
- ✅ Infinite scroll (load more)
- ✅ Mark as read/delete individual notifications

### Preferences Features:
- ✅ Toggle notification categories
- ✅ Email notification settings  
- ✅ Quiet hours configuration
- ✅ Real-time saving with feedback

### Integration Features:
- ✅ Toast notifications for new alerts
- ✅ Keyboard shortcuts (Ctrl+Shift+N, Ctrl+Shift+R)
- ✅ Real-time updates via polling
- ✅ Proper authentication with JWT tokens

## Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Backend not running or token expired
2. **Components not loading**: Check exports in index.ts files
3. **Styling issues**: Verify Tailwind classes and component structure
4. **API errors**: Check backend logs and database connection

### Backend Requirements:
- Postgres database running
- JWT authentication working
- Notification routes properly configured
- CORS configured for frontend URL

### Frontend Requirements:  
- All notification components exported correctly
- Routes configured in App.tsx
- Auth store providing valid tokens
- TanStack Query configured properly