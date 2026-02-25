# 📚 Complete API Reference

## Overview

NoteMind API provides 47 endpoints across 11 advanced features plus core document processing.

**Base URL**: `http://localhost:3001/api` (dev) or `https://your-domain.com/api` (production)

**Authentication**: JWT token in `Authorization: Bearer {token}` header

**Encryption**: All requests/responses encrypted with AES-256-CBC (auto-handled by client SDK)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Documents](#documents)
3. [Chat History](#chat-history)
4. [Favorites](#favorites)
5. [Tags](#tags)
6. [Search](#search)
7. [Analytics](#analytics)
8. [Sharing](#sharing)
9. [Spaced Repetition](#spaced-repetition)
10. [Export](#export)
11. [Offline Sync](#offline-sync)
12. [Preferences](#preferences)
13. [Learning Paths](#learning-paths)
14. [Admin](#admin)

---

## Authentication

### Register
Create a new user account.

```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status Codes:**
- `201` - User created successfully
- `400` - Invalid email or password
- `409` - Email already exists

---

### Login
Authenticate and get JWT token.

```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "pro"
  }
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `404` - User not found

---

### Update Profile
Update user information.

```http
PUT /api/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "name": "Jane Doe",
    "email": "newemail@example.com"
  }
}
```

---

### Change Password
Change user password.

```http
PUT /api/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## Documents

### Upload Document
Upload a document for processing.

```http
POST /api/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [PDF/DOCX/PPTX/XLSX/CSV/TXT/Markdown file]
```

**Response:**
```json
{
  "success": true,
  "documentId": "doc-123",
  "fileName": "Biology_101.pdf",
  "status": "processing",
  "message": "Document uploaded. Processing started..."
}
```

**Status Codes:**
- `200` - Upload successful
- `400` - Invalid file type or size
- `429` - Upload limit reached
- `413` - File too large

---

### Get Documents
List all user documents.

```http
GET /api/documents
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "doc-123",
      "fileName": "Biology_101.pdf",
      "status": "ready",
      "uploadedAt": "2026-02-25T10:30:00Z",
      "fileSize": 2048576,
      "conversationCount": 5,
      "isFavorite": true
    }
  ],
  "total": 24
}
```

---

### Check Processing Status
Get document processing status.

```http
GET /api/status/:docId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "status": "ready",
  "documentId": "doc-123",
  "fileName": "Biology_101.pdf",
  "text": "Complete extracted text...",
  "chatCount": 12,
  "flashcardCount": 25,
  "mindmapGenerated": true
}
```

---

### Generate Mind Map
Generate mind map from document.

```http
POST /api/documents/:docId/mindmap
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "mindmap": {
    "nodes": [
      {
        "id": "node-1",
        "label": "Photosynthesis",
        "type": "root",
        "position": { "x": 0, "y": 0 }
      },
      {
        "id": "node-2",
        "label": "Light Reactions",
        "type": "branch"
      }
    ],
    "edges": [
      {
        "source": "node-1",
        "target": "node-2"
      }
    ]
  }
}
```

---

### Generate Flashcards
Generate flashcards from document.

```http
POST /api/documents/:docId/flashcards
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "flashcards": [
    {
      "id": "card-1",
      "question": "What is photosynthesis?",
      "answer": "Process of converting light energy to chemical energy",
      "difficulty": "medium"
    },
    {
      "id": "card-2",
      "question": "Name the stages of photosynthesis",
      "answer": "Light reactions, Calvin cycle, Regeneration",
      "difficulty": "hard"
    }
  ],
  "total": 25
}
```

---

### Chat with Document
Send chat message to AI about document.

```http
POST /api/documents/:docId/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Explain the Calvin cycle",
  "history": [
    { "role": "user", "content": "What is photosynthesis?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "reply": "The Calvin cycle is the light-independent reactions of photosynthesis...",
  "chatCount": 13,
  "chatLimit": 50
}
```

---

## Chat History

### Create Conversation
Start a new conversation about a document.

```http
POST /api/conversations
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentId": "doc-123",
  "title": "Chapter 5 Questions"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conv-123",
    "documentId": "doc-123",
    "title": "Chapter 5 Questions",
    "createdAt": "2026-02-25T10:30:00Z"
  }
}
```

---

### Get All Conversations
List user conversations.

```http
GET /api/conversations
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-123",
      "documentId": "doc-123",
      "title": "Chapter 5 Questions",
      "messageCount": 12,
      "createdAt": "2026-02-25T10:30:00Z",
      "updatedAt": "2026-02-25T15:45:00Z"
    }
  ],
  "total": 5
}
```

---

### Get Conversations for Document
Get conversations for specific document.

```http
GET /api/conversations/:docId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-123",
      "title": "Chapter 5 Questions",
      "messageCount": 12,
      "createdAt": "2026-02-25T10:30:00Z"
    }
  ]
}
```

---

### Add Message to Conversation
Add message to conversation.

```http
POST /api/conversations/:convId/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "user",
  "content": "What is ATP?"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg-456",
    "role": "user",
    "content": "What is ATP?",
    "createdAt": "2026-02-25T15:45:00Z"
  }
}
```

---

### Delete Conversation
Delete entire conversation.

```http
DELETE /api/conversations/:convId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

---

## Favorites

### Add to Favorites
Add document to favorites.

```http
POST /api/favorites/:docId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "documentId": "doc-123",
  "message": "Document added to favorites"
}
```

---

### Remove from Favorites
Remove document from favorites.

```http
DELETE /api/favorites/:docId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Document removed from favorites"
}
```

---

### Get Favorites
List favorite documents.

```http
GET /api/favorites
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "favorites": [
    {
      "id": "doc-123",
      "fileName": "Biology_101.pdf",
      "addedAt": "2026-02-25T10:30:00Z"
    }
  ],
  "total": 8
}
```

---

## Tags

### Create Tag
Create a new tag.

```http
POST /api/tags
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Biology",
  "color": "#ef4444"
}
```

**Response:**
```json
{
  "success": true,
  "tag": {
    "id": "tag-123",
    "name": "Biology",
    "color": "#ef4444",
    "createdAt": "2026-02-25T10:30:00Z"
  }
}
```

---

### Get Tags
List user tags.

```http
GET /api/tags
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "tags": [
    {
      "id": "tag-123",
      "name": "Biology",
      "color": "#ef4444",
      "documentCount": 5
    }
  ],
  "total": 12
}
```

---

### Add Tag to Document
Tag a document.

```http
POST /api/tags/:tagId/documents/:docId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Tag added to document"
}
```

---

### Remove Tag from Document
Remove tag from document.

```http
DELETE /api/tags/:tagId/documents/:docId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Tag removed from document"
}
```

---

### Get Document Tags
Get all tags for a document.

```http
GET /api/documents/:docId/tags
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "tags": [
    {
      "id": "tag-123",
      "name": "Biology",
      "color": "#ef4444"
    }
  ]
}
```

---

## Search

### Search Documents
Full-text search documents. **

```http
POST /api/search
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "photosynthesis",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "doc-123",
      "title": "Biology Chapter 5",
      "excerpt": "Photosynthesis is the process of...",
      "relevance": 0.95,
      "type": "document"
    }
  ],
  "total": 3
}
```

---

### Search Conversations
Search conversation history.

```http
POST /api/search/conversations
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "Calvin cycle",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "conv-123",
      "title": "Chapter 5 Questions",
      "documentId": "doc-123",
      "excerpt": "The Calvin cycle is...",
      "relevance": 0.87,
      "type": "conversation"
    }
  ],
  "total": 2
}
```

---

## Analytics

### Get Analytics
Get user analytics data.

```http
GET /api/analytics
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "documentsViewed": 24,
    "chatInteractions": 156,
    "flashcardsReviewed": 342,
    "averageSessionTime": 45,
    "topDocuments": [
      {
        "id": "doc-123",
        "title": "Biology Ch5",
        "interactions": 45,
        "lastViewed": "2026-02-25T15:30:00Z"
      }
    ],
    "weeklyActivity": [
      { "day": "Monday", "interactions": 23 },
      { "day": "Tuesday", "interactions": 31 },
      { "day": "Wednesday", "interactions": 18 }
    ]
  }
}
```

---

## Sharing

### Create Share Link
Create a shareable link for document.

```http
POST /api/share/:docId
Authorization: Bearer {token}
Content-Type: application/json

{
  "shareType": "view",
  "expiresIn": 7
}
```

**Response:**
```json
{
  "success": true,
  "share": {
    "id": "share-123",
    "documentId": "doc-123",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "shareLink": "https://notemind.app/share/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "shareType": "view",
    "expiresAt": "2026-03-03T23:59:59Z"
  }
}
```

---

### Validate Share Token
Check if share token is valid.

```http
POST /api/share/validate
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "documentId": "doc-123",
  "fileName": "Biology_101.pdf",
  "expiresAt": "2026-03-03T23:59:59Z"
}
```

---

### Get Shared Document
Access shared document using token.

```http
GET /api/share/:token
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc-123",
    "fileName": "Biology_101.pdf",
    "fileSize": 2048576,
    "text": "Full document text...",
    "mindmap": {...},
    "flashcards": [...]
  }
}
```

---

### Delete Share Link
Revoke a share link.

```http
DELETE /api/share/:shareId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Share link revoked"
}
```

---

## Spaced Repetition

### Record Flashcard Review
Record flashcard performance.

```http
POST /api/flashcards/:docId/metrics
Authorization: Bearer {token}
Content-Type: application/json

{
  "flashcardId": "card-123",
  "qualityGrade": 4,
  "timeSpentMs": 25000
}
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "flashcardId": "card-123",
    "nextReviewDate": "2026-02-28",
    "interval": 3,
    "easeFactor": 2.45,
    "totalReviews": 5
  }
}
```

---

### Get Due Flashcards
Get flashcards due for review.

```http
GET /api/flashcards/:docId/due
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "dueFlashcards": [
    {
      "id": "card-123",
      "question": "What is photosynthesis?",
      "answer": "Process of converting light to chemical energy",
      "nextReviewDate": "2026-02-25",
      "interval": 3,
      "easeFactor": 2.45
    }
  ],
  "total": 12
}
```

---

### Get Flashcard Statistics
Get learning statistics.

```http
GET /api/flashcards/:docId/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFlashcards": 25,
    "learned": 12,
    "learning": 8,
    "new": 5,
    "averageEaseFactor": 2.51,
    "totalReviews": 156,
    "masteryRate": 0.48
  }
}
```

---

## Export

### Export Flashcards as CSV
Export flashcards to CSV format.

```http
POST /api/export/flashcards/:docId
Authorization: Bearer {token}
```

**Response:**
File download: `flashcards.csv`

**CSV Format:**
```csv
"Question","Answer","Ease Factor","Interval","Next Review"
"What is photosynthesis?","Process of converting light to chemical energy",2.5,1,2026-02-26
"Stages of photosynthesis?","Light reactions, Calvin cycle",2.45,3,2026-02-28
```

---

### Export Conversation as PDF
Export conversation to PDF format.

```http
POST /api/export/conversations/:convId
Authorization: Bearer {token}
```

**Response:**
File download: `conversation.pdf`

---

### Export Mind Map as Image
Export mind map to PNG image.

```http
POST /api/export/mindmap/:docId
Authorization: Bearer {token}
```

**Response:**
File download: `mindmap.png`

---

## Offline Sync

### Queue Action for Sync
Queue an action to be synced later.

```http
POST /api/sync/queue
Authorization: Bearer {token}
Content-Type: application/json

{
  "entityType": "flashcard_review",
  "entityId": "card-123",
  "action": "review",
  "data": {
    "qualityGrade": 4,
    "timeSpentMs": 25000
  }
}
```

**Response:**
```json
{
  "success": true,
  "queueId": "queue-123",
  "status": "queued"
}
```

---

### Get Pending Sync Actions
Get all pending actions.

```http
GET /api/sync/pending
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "pending": [
    {
      "id": "queue-123",
      "entityType": "flashcard_review",
      "action": "review",
      "createdAt": "2026-02-25T10:30:00Z"
    }
  ],
  "total": 3
}
```

---

### Mark Actions as Synced
Mark actions as successfully synced.

```http
POST /api/sync/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "queueIds": ["queue-123", "queue-124"]
}
```

**Response:**
```json
{
  "success": true,
  "syncedCount": 2
}
```

---

## Preferences

### Get User Preferences
Get user settings.

```http
GET /api/preferences
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "theme": "violet",
    "offlineModeEnabled": true,
    "notifications": true,
    "emailUpdates": false
  }
}
```

---

### Update User Preferences
Update user settings.

```http
PUT /api/preferences
Authorization: Bearer {token}
Content-Type: application/json

{
  "theme": "emerald",
  "offlineModeEnabled": false,
  "notifications": true
}
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "theme": "emerald",
    "offlineModeEnabled": false
  }
}
```

---

## Learning Paths

### Generate Learning Path
Generate AI-recommended learning path.

```http
POST /api/learning-paths
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "path": {
    "id": "path-123",
    "title": "Biology Fundamentals",
    "description": "Complete guide to basic biology",
    "estimatedDays": 14,
    "stages": [
      {
        "order": 1,
        "documentId": "doc-101",
        "title": "Cell Structure",
        "estimatedMinutes": 45
      }
    ]
  }
}
```

---

### Get Learning Paths
List user learning paths.

```http
GET /api/learning-paths
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "paths": [
    {
      "id": "path-123",
      "title": "Biology Fundamentals",
      "estimatedDays": 14,
      "completed": false,
      "progress": 0.47
    }
  ],
  "total": 3
}
```

---

### Mark Path Complete
Mark learning path as completed.

```http
POST /api/learning-paths/:pathId/complete
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "path": {
    "id": "path-123",
    "completed": true,
    "completedAt": "2026-02-25T15:45:00Z"
  }
}
```

---

### Get Suggested Documents
Get AI-recommended documents.

```http
GET /api/suggestions/documents
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "id": "doc-456",
      "fileName": "Advanced Biology.pdf",
      "reason": "Complements your Biology studies",
      "relevance": 0.89
    }
  ]
}
```

---

## Admin

### List Users
List all users (Admin only).

```http
GET /api/admin/users
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro",
      "role": "user",
      "createdAt": "2026-01-15T10:30:00Z",
      "isBanned": false
    }
  ],
  "total": 147
}
```

---

### Set User Plan
Change user subscription plan.

```http
PUT /api/admin/set-plan
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-123",
  "plan": "unlimited"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "plan": "unlimited"
  }
}
```

---

### Set User Role
Change user role.

```http
PUT /api/admin/set-role
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-456",
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-456",
    "role": "admin"
  }
}
```

---

### Ban User
Ban or unban a user.

```http
POST /api/admin/ban-user
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-123",
  "banned": true,
  "reason": "Violating terms of service"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "isBanned": true
  }
}
```

---

### Ban IP Address
Ban or unban an IP address.

```http
POST /api/admin/ban-ip
Authorization: Bearer {token}
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "banned": true,
  "reason": "Suspicious activity"
}
```

**Response:**
```json
{
  "success": true,
  "ip": "192.168.1.100",
  "isBanned": true
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `LIMIT_EXCEEDED` | 429 | Rate limit or quota exceeded |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

Endpoints are rate-limited per user/IP:
- **Authentication**: 5 requests per minute
- **Documents**: 10 requests per minute  
- **Chat**: 30 requests per minute
- **Others**: 60 requests per minute

Limits vary by plan.

---

## Pagination

List endpoints support pagination:

```http
GET /api/documents?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "pages": 8
  }
}
```

---

## Webhooks (Coming Soon)

Subscribe to events:
- `document.uploaded`
- `chat.message`
- `flashcard.reviewed`
- `path.completed`

---

## SDK Usage

JavaScript/TypeScript:
```javascript
import { NoteMindClient } from '@notemind/sdk';

const client = new NoteMindClient({
  apiUrl: 'https://api.notemind.app',
  apiKey: 'your-api-key'
});

// Usage
const documents = await client.documents.list();
const conv = await client.chats.createConversation(docId);
await client.chats.addMessage(convId, 'What is photosynthesis?');
```

---

## Support

- 📧 Email: api-support@notemind.app
- 📖 Docs: https://docs.notemind.app
- 💬 Discord: https://discord.gg/notemind
- 🐛 Issues: https://github.com/your-username/NoteMind/issues
