# NoteMind Notification System Documentation

## Overview

The NoteMind notification system provides real-time notifications to users for important events like document generation completion, sharing, admin actions, and security alerts.

## Architecture

### Backend Components

#### 1. **Notification Service** (`server/services/notificationService.js`)
Core service for managing notifications with the following capabilities:

- **Database**: SQLite table `notifications` with user ownership and read status
- **CRUD Operations**: Create, read, update, delete notifications
- **Bulk Operations**: Send notifications to multiple users at once
- **Templates**: Predefined message templates for common notification types
- **Cleanup**: Automatic removal of old read notifications

**Key Functions:**
```javascript
// Create a single notification
createNotification(userId, type, title, message, options)

// Create notifications for multiple users
createBulkNotifications(userIds, type, title, message, options)

// Get user's notifications with pagination
getUserNotifications(userId, options)

// Mark as read/unread
markNotificationAsRead(notificationId, userId)
markAllNotificationsAsRead(userId)

// Delete notifications
deleteNotification(notificationId, userId)
deleteAllNotifications(userId)

// Fetch unread count
getUnreadCount(userId)
```

#### 2. **Notification Routes** (`server/routes/notificationRoutes.js`)
RESTful API endpoints for notification management:

- `GET /api/notifications` - Fetch user's notifications (paginated, filterable)
- `GET /api/notifications/unread-count` - Get unread notification count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete single notification
- `DELETE /api/notifications` - Delete all notifications

#### 3. **Notification Types** (Defined in `notificationService.js`)

```javascript
NOTIFICATION_TYPES = {
  // Document events
  DOCUMENT_GENERATED: 'document_generated',
  MINDMAP_READY: 'mindmap_ready',
  FLASHCARDS_READY: 'flashcards_ready',
  QUIZ_READY: 'quiz_ready',
  SUMMARY_READY: 'summary_ready',
  DOCUMENT_PROCESSED: 'document_processed',

  // Sharing & collaboration
  DOCUMENT_SHARED: 'document_shared',
  DOCUMENT_PUBLISHED: 'document_published',
  SHARED_DOCUMENT_VIEWED: 'shared_document_viewed',

  // Profile & engagement
  PROFILE_VIEWED: 'profile_viewed',
  LEADERBOARD_ACHIEVEMENT: 'leaderboard_achievement',
  LEARNING_GOAL_ACHIEVED: 'learning_goal_achieved',
  STREAK_MILESTONE: 'streak_milestone',

  // Auth & security
  EMAIL_VERIFICATION_NEEDED: 'email_verification_needed',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  NEW_DEVICE_LOGIN: 'new_device_login',
  SECURITY_ALERT: 'security_alert',

  // Admin
  ADMIN_MESSAGE: 'admin_message',
  PLAN_CHANGED: 'plan_changed',
  PLAN_EXPIRING: 'plan_expiring',
  ACCOUNT_BANNED: 'account_banned',

  // Community
  COMMUNITY_ACTIVITY: 'community_activity',
}
```

### Frontend Components

#### 1. **NotificationBell Component** (`client/src/components/NotificationBell.jsx`)

A React component providing the notification UI with:

**Features:**
- Notification bell icon with unread count badge
- Dropdown menu showing recent notifications
- Filter tabs (All / Unread)
- Load more pagination
- Mark single/all as read
- Delete notifications
- Real-time unread count polling (30s interval)
- Click-to-navigate for actionable notifications

**Usage:**
```jsx
import { NotificationBell } from './NotificationBell';

<NotificationBell userId={user.id} className="mr-2" />
```

**Props:**
- `userId` (number, required) - User ID for fetching notifications
- `className` (string, optional) - Additional CSS classes

## Implemented Events

### Document Generation (✅ Complete)
Notifications are sent when:
- Mindmap generation completes → `MINDMAP_READY`
- Flashcards generation completes → `FLASHCARDS_READY`
- Quiz generation completes → `QUIZ_READY`
- Summary generation completes → `SUMMARY_READY`

**Endpoints:**
- `POST /api/documents/:docId/mindmap`
- `POST /api/documents/:docId/flashcards`
- `POST /api/documents/:docId/quiz`
- `POST /api/documents/:docId/summary`

### Document Publishing (✅ Complete)
Notification sent when document is made public:
- `PUT /api/documents/:id/public` → `DOCUMENT_PUBLISHED`

### Admin Actions (✅ Complete)
- Plan change → `PLAN_CHANGED`
- Account ban → `ACCOUNT_BANNED`

**Endpoints:**
- `PUT /api/admin/users/:userId/plan`
- `PUT /api/admin/users/:userId/ban`

### Auth & Security (✅ Complete)
- Email verification completed → `email_verified`
- Password reset requested → `PASSWORD_RESET_REQUESTED`
- Password successfully reset → `password_reset_success`

**Endpoints:**
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Database Schema

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data TEXT,  -- JSON stringified
  is_read INTEGER DEFAULT 0,
  action_url TEXT,
  icon TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

## Example Usage

### Creating a Notification from Backend

```javascript
import { createNotification, NOTIFICATION_TYPES, getNotificationTemplate } from './services/notificationService.js';

// Using template
const template = getNotificationTemplate(NOTIFICATION_TYPES.MINDMAP_READY, 'My Document.pdf');
createNotification(userId, NOTIFICATION_TYPES.MINDMAP_READY, template.title, template.message, {
  actionUrl: `/documents/${docId}`,
  icon: template.icon,
  data: { docId, fileName: 'My Document.pdf' }
});

// Custom notification
createNotification(userId, 'custom_event', 'Custom Title', 'Custom message', {
  actionUrl: '/path/to/page',
  icon: 'custom-icon',
  data: { customField: 'value' }
});
```

### Fetching Notifications from Frontend

```javascript
// Get all notifications
const response = await fetch('/api/notifications?limit=20&offset=0', {
  credentials: 'include'
});
const { notifications, total } = await response.json();

// Get unread count
const countResponse = await fetch('/api/notifications/unread-count', {
  credentials: 'include'
});
const { unread_count } = await countResponse.json();

// Mark as read
await fetch('/api/notifications/123/read', {
  method: 'PUT',
  credentials: 'include'
});

// Delete notification
await fetch('/api/notifications/123', {
  method: 'DELETE',
  credentials: 'include'
});
```

## Integration Points

### In Header
The `NotificationBell` component is integrated in `client/src/components/Header.jsx`:
```jsx
{user ? (
  <>
    <NotificationBell userId={user.id} />
    <UserDropdown {...props} />
  </>
) : ...}
```

### In Server
All notification events are emitted in `server/index.js` at relevant endpoints.

## Future Enhancements

1. **Real-time Updates via WebSocket/SSE**
   - Replace polling with server-sent events
   - Instant notification delivery

2. **Notification Preferences**
   - Let users control which notifications they receive
   - Notification frequency settings
   - Email notification options

3. **Toast Notifications**
   - Display toast popups for urgent notifications
   - Sound/browser notifications

4. **Notification Categories**
   - Group notifications by type
   - Advanced filtering options

5. **Email Notifications**
   - Send important notifications via email
   - Digest emails with daily/weekly summaries

6. **Multi-language Support**
   - Add i18n keys for all notification messages
   - Translate notification templates

## Performance Considerations

- **Indexes**: Database indexes on `user_id`, `(user_id, is_read)`, and `created_at` for fast queries
- **Pagination**: Default limit of 20, max 100 notifications per request
- **Cleanup**: Old read notifications are auto-deleted after 30 days
- **Polling**: Frontend polls unread count every 30 seconds (configurable)

## Security

- User can only view their own notifications
- Notifications are deleted with user account (ON DELETE CASCADE)
- Read status is per-user (verified in API with requireAuth)
- Action URLs are stored but not executed server-side

## Troubleshooting

### Notifications not appearing
1. Check if `initNotificationsTable()` is called on server startup
2. Verify notification routes are registered: `app.use('/api/notifications', notificationRoutes)`
3. Check browser console for API errors
4. Verify user is authenticated (credentials: 'include')

### High database usage
1. Run cleanup: `cleanupOldNotifications(30)` to remove old notifications
2. Check notification creation frequency
3. Consider implementing retention policies

### Frontend performance
1. Reduce polling frequency if needed
2. Implement virtual scrolling for large notification lists
3. Cache notifications locally in Frontend

