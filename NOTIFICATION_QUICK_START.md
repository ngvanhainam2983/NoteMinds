# Notification System - Quick Start Guide

## For Developers

### Adding Notifications to New Events

#### Step 1: Import the notification service
```javascript
import {
  createNotification, createBulkNotifications,
  NOTIFICATION_TYPES, getNotificationTemplate
} from './services/notificationService.js';
```

#### Step 2: Emit notification at the right place
```javascript
// Inside your endpoint or service function
const template = getNotificationTemplate(NOTIFICATION_TYPES.QUIZ_READY, 'Document Name');
if (template) {
  createNotification(userId, NOTIFICATION_TYPES.QUIZ_READY, template.title, template.message, {
    actionUrl: `/documents/${docId}`,
    icon: template.icon || 'quiz',
    data: { docId, fileName: 'Document Name' }
  });
}
```

#### Step 3: Add notification type if needed
```javascript
// Edit NOTIFICATION_TYPES in notificationService.js
export const NOTIFICATION_TYPES = {
  YOUR_NEW_TYPE: 'your_new_type',
  // ...
};

// Add template
export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.YOUR_NEW_TYPE]: (arg1, arg2) => ({
    title: 'Your Title',
    message: `Your message with ${arg1} and ${arg2}`,
    icon: 'icon-name',
  }),
};
```

### Common Notification Icons
- `mindmap` - 🗺️
- `flashcard` - 🎴
- `quiz` - ❓
- `summary` - 📄
- `share` - 📤
- `globe` - 🌐
- `trophy` - 🏆
- `flame` - 🔥
- `lock` - 🔒
- `upgrade` - ⬆️
- `alert` - ⚠️
- `admin` - 👨‍💼
- `check` - ✓
- `default` - 🔔

## For Users

### Accessing Notifications

1. **See unread count** - Bell icon in header shows count badge
2. **Open notifications panel** - Click the bell icon
3. **Filter notifications** - Use "All" / "Unread" tabs
4. **Mark as read** - Click notification or use "Mark all as read"
5. **Delete notification** - Click the ✕ button
6. **Navigate to item** - Click notification to go to related page

## API Endpoints

### Fetch Notifications
```bash
GET /api/notifications?limit=20&offset=0&unreadOnly=false

Response:
{
  "notifications": [
    {
      "id": 1,
      "user_id": 123,
      "type": "mindmap_ready",
      "title": "Mindmap Generated",
      "message": "Your mindmap for \"Chapter 5.pdf\" is ready!",
      "is_read": 0,
      "action_url": "/documents/456",
      "icon": "mindmap",
      "created_at": "2024-03-07T10:30:00.000Z",
      "read_at": null,
      "data": {
        "docId": "456",
        "fileName": "Chapter 5.pdf"
      }
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### Get Unread Count
```bash
GET /api/notifications/unread-count

Response:
{
  "unread_count": 5
}
```

### Mark as Read
```bash
PUT /api/notifications/:id/read

Response:
{
  "success": true
}
```

### Mark All as Read
```bash
POST /api/notifications/mark-all-read

Response:
{
  "success": true,
  "marked_count": 5
}
```

### Delete Notification
```bash
DELETE /api/notifications/:id

Response:
{
  "success": true
}
```

### Delete All Notifications
```bash
DELETE /api/notifications

Response:
{
  "success": true,
  "deleted_count": 42
}
```

## Current Notification Triggers

### ✅ Document Generation
- Document mindmap ready
- Flashcards ready
- Quiz ready
- Summary ready

### ✅ Document Sharing
- Document published to public

### ✅ Admin Actions
- User plan changed
- User account banned

### ✅ Authentication
- Email verified
- Password reset requested
- Password reset completed

## Testing Notifications Manually

### 1. Create a test notification via API (admin only)
```bash
# Using curl (replace TOKEN with your JWT)
curl -X POST http://localhost:3001/api/notifications \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "type": "test",
    "title": "Test Notification",
    "message": "This is a test",
    "icon": "mindmap"
  }'
```

### 2. Generate mindmap to test (user flow)
1. Upload a PDF/document
2. Once processing completes, click "Generate Mindmap"
3. Check notification bell for "Mindmap Generated" notification

### 3. Publish document (user flow)
1. Go to a document you own
2. Click the share/publish button
3. Toggle "Make Public"
4. Check notification bell for "Document Published" notification

## Troubleshooting

### Notification Bell Not Showing
- Make sure you're logged in
- Check browser console for errors
- Verify NotificationBell component is in Header.jsx

### Notifications Not Appearing
- Ensure server started (logs show "Notifications table initialized")
- Check that `/api/notifications` endpoint is working (test in Postman/curl)
- Verify user ID is being passed correctly

### Unread Count Not Updating
- Wait for 30-second poll interval or refresh page
- Check browser network tab for `/api/notifications/unread-count` requests
- Verify authentication cookies are set

## Performance Stats

- **Database queries**: ~5-10ms for notification list fetch
- **Unread count poll**: 30-second interval (configurable)
- **Notification retention**: 30 days for read notifications
- **Max notifications per request**: 100 (default: 20)

