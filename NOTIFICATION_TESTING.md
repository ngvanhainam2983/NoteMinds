# Notification System - Testing & Verification Guide

## ✅ Verification Steps

### Step 1: Database Verification

**Verify notifications table exists:**
```bash
# Connect to SQLite database
cd server/data
sqlite3 notemind.db

# Check if table exists
.tables
# Should show: notifications

# Check schema
.schema notifications
# Should show the table structure with all columns

# Check indexes
.indexes notifications
# Should show: idx_notifications_user_id, idx_notifications_user_read, idx_notifications_created
```

### Step 2: Backend Startup Verification

**Start the server and check logs:**
```bash
cd server
npm start

# Look for these messages in logs:
# ✓ "Notifications table initialized" 
# ✓ Server listening on port 3001
```

**Test that routes are registered:**
```bash
# In another terminal, test the notifications endpoint
curl -X GET http://localhost:3001/api/notifications \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Should return:
# {
#   "notifications": [],
#   "total": 0,
#   "limit": 20,
#   "offset": 0
# }
```

### Step 3: Frontend Verification

**Start the client:**
```bash
cd client
npm run dev

# Visit http://localhost:5173 in browser
```

**Check that NotificationBell appears:**
1. Open browser DevTools (F12)
2. Go to Elements/Inspector
3. Search for "NotificationBell" in HTML
4. Should see the component in the header

### Step 4: Manual End-to-End Testing

#### Test 1: Generate Mindmap and Receive Notification

1. Login to the app
2. Upload a PDF or document
3. Wait for processing to complete  
4. Click "Generate Mindmap"
5. Wait for generation to complete
6. **Verify**: Bell icon shows notification count badge
7. **Verify**: Click bell to open dropdown
8. **Verify**: See "Mindmap Generated" notification
9. **Verify**: Click notification navigates to document

#### Test 2: Publish Document and Receive Notification

1. Go to a document (create one if needed)
2. Click the share/publish button
3. Toggle "Make Public" or publish to community
4. **Verify**: Bell icon badge updates
5. **Verify**: New notification appears in dropdown
6. **Verify**: Title says "Document Published"

#### Test 3: Admin Plan Change Notification

1. Login with admin account
2. Go to Admin Panel
3. Find a user and change their plan
4. **Verify**: User receives notification
5. Login as that user
6. **Verify**: See "Plan Updated" notification

#### Test 4: Mark as Read

1. Open notification dropdown
2. Click an unread notification (background is blue)
3. **Verify**: Notification background changes to gray
4. **Verify**: Unread badge count decreases

#### Test 5: Delete Notification

1. Open notification dropdown
2. Click the ✕ button on a notification
3. **Verify**: Notification disappears from list
4. **Verify**: Unread count updates if it was unread

#### Test 6: Filtering

1. Open notification dropdown
2. Click "Unread" tab
3. **Verify**: Only unread notifications show
4. Click "All" tab
5. **Verify**: All notifications show

#### Test 7: Pagination

1. Have many notifications (create test ones)
2. Open notification dropdown
3. Scroll to bottom
4. **Verify**: "Load more" button appears
5. Click "Load more"
6. **Verify**: More notifications load

## 🧪 Automated Testing Scripts

### Test 1: Create Test Notification (Manual API Call)

```bash
#!/bin/bash

# Set your JWT token
TOKEN="your_jwt_token_here"
USER_ID=1

# Test notification creation
curl -X POST http://localhost:3001/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '$USER_ID',
    "type": "test_event",
    "title": "Test Notification",
    "message": "This is a test notification",
    "icon": "mindmap"
  }' 2>/dev/null | jq .
```

### Test 2: Fetch Notifications

```bash
#!/bin/bash

TOKEN="your_jwt_token_here"

# Fetch first 20 notifications
curl -X GET 'http://localhost:3001/api/notifications?limit=20&offset=0' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cookie: token=$TOKEN" 2>/dev/null | jq .
```

### Test 3: Get Unread Count

```bash
#!/bin/bash

TOKEN="your_jwt_token_here"

curl -X GET http://localhost:3001/api/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cookie: token=$TOKEN" 2>/dev/null | jq .
```

### Test 4: Mark as Read

```bash
#!/bin/bash

TOKEN="your_jwt_token_here"
NOTIFICATION_ID=1

curl -X PUT http://localhost:3001/api/notifications/$NOTIFICATION_ID/read \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cookie: token=$TOKEN" \
  -H "Content-Type: application/json" 2>/dev/null | jq .
```

### Test 5: Delete Notification

```bash
#!/bin/bash

TOKEN="your_jwt_token_here"
NOTIFICATION_ID=1

curl -X DELETE http://localhost:3001/api/notifications/$NOTIFICATION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cookie: token=$TOKEN" 2>/dev/null | jq .
```

## 🔍 Performance Testing

### Load Test: Create 1000 Notifications

```javascript
// Run in Node.js environment with access to database
import { createBulkNotifications, NOTIFICATION_TYPES } from './services/notificationService.js';

// Create 1000 notifications for user 1
const userIds = [1, 1, 1, ...]; // Repeat user ID 1000 times
console.time('Create 1000 notifications');
createBulkNotifications(userIds, NOTIFICATION_TYPES.MINDMAP_READY, 
  'Test Mindmap', 'This is a test notification');
console.timeEnd('Create 1000 notifications');

// Typical result: ~50-100ms
```

### Query Performance Test

```sql
-- Test pagination query performance
.timer on

SELECT * FROM notifications 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 20;

-- Should return instantly (<5ms)

-- Test unread count query
SELECT COUNT(*) FROM notifications 
WHERE user_id = 1 AND is_read = 0;

-- Should return instantly (<2ms)
```

## 🐛 Debugging Checklist

### Issue: Notifications not appearing

**Checks:**
- [ ] Is server running? Check for "Notifications table initialized" in logs
- [ ] Are you logged in? Notifications only visible for authenticated users
- [ ] Check browser console for JavaScript errors
- [ ] Check browser Network tab for `/api/notifications` requests
- [ ] Verify JWT token is valid (check in console: `document.cookie`)
- [ ] Check database: `SELECT COUNT(*) FROM notifications;`

**Fix:**
```javascript
// In browser console
fetch('/api/notifications', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log(d))
```

### Issue: Bell icon not showing

**Checks:**
- [ ] Are you logged in? (NotificationBell only shows for auth users)
- [ ] Check console for component errors
- [ ] Check DOM for element: `document.querySelector('[title="Notifications"]')`

**Fix:**
```javascript
// In browser console
// Verify NotificationBell is in DOM
document.body.innerHTML.includes('NotificationBell')

// Verify user is logged in
console.log(document.cookie) // Should have 'token=...'
```

### Issue: Unread count not updating

**Checks:**
- [ ] Wait 30 seconds (polling interval) or refresh page
- [ ] Check Network tab for `/api/notifications/unread-count` requests
- [ ] Check that notifications are actually being created
- [ ] Verify `is_read` field in database is 0 for unread notifications

**Fix:**
```javascript
// In browser console
// Force refresh unread count
fetch('/api/notifications/unread-count', { 
  credentials: 'include' 
}).then(r => r.json()).then(d => console.log(d))
```

### Issue: Database errors

**Checks:**
- [ ] Is database file accessible? Check `server/data/notemind.db`
- [ ] Are there disk space issues?
- [ ] Check for database corruption: `sqlite3 notemind.db "PRAGMA integrity_check;"`

**Fix:**
```bash
# Rebuild database indexes
sqlite3 notemind.db
REINDEX;
.quit
```

## 📊 Monitoring Commands

### Monitor notification growth
```sql
-- Check notification count over time
SELECT 
  DATE(created_at) as date, 
  COUNT(*) as count,
  SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
FROM notifications
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### Monitor database size
```bash
# Check SQLite database file size
ls -lh server/data/notemind.db

# Get record count
sqlite3 server/data/notemind.db "SELECT COUNT(*) FROM notifications;"
```

### Monitor performance
```javascript
// In server code, add benchmarking
console.time('fetch-notifications');
const result = getUserNotifications(userId, { limit: 20 });
console.timeEnd('fetch-notifications');
```

## ✨ Success Criteria

All of the following should be true:

- ✅ Notifications table exists with proper schema
- ✅ Notification API endpoints return 200 status
- ✅ Bell icon appears in authenticated header
- ✅ Notification dropdown opens and loads data
- ✅ Notifications appear for document generation events
- ✅ Notifications appear for admin actions
- ✅ Users can mark notifications as read
- ✅ Users can delete notifications
- ✅ Unread count badge updates
- ✅ Notifications are filterable (All/Unread)
- ✅ Pagination works for large notification lists
- ✅ Database queries execute in <10ms
- ✅ No console errors or warnings
- ✅ Notifications persist after page reload

## 🚀 Ready to Deploy

Once all verification and testing steps pass, the system is ready for:
1. Production deployment
2. User testing
3. Integration with analytics
4. Future enhancements

