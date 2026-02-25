# 🎯 Complete Features Guide

## Table of Contents
1. [Core Features](#core-features)
2. [Chat History & Persistence](#chat-history--persistence)
3. [Favorites & Bookmarks](#favorites--bookmarks)
4. [Document Tags](#document-tags)
5. [Full-Text Search](#full-text-search)
6. [Analytics Dashboard](#analytics-dashboard)
7. [Share & Collaboration](#share--collaboration)
8. [Spaced Repetition (SM-2)](#spaced-repetition-sm-2)
9. [Offline Support](#offline-support)
10. [Multi-Device Sync](#multi-device-sync)
11. [Export Features](#export-features)
12. [AI Recommendations](#ai-recommendations)

---

## Core Features

### ✅ Upload & Processing
- **Supported Formats**: PDF, DOCX, PPTX, XLSX, CSV, TXT, Markdown
- **File Size Limit**: Free (10MB), Basic (25MB), Pro (50MB), Unlimited (∞)
- **Processing**: Async queue with real-time status updates
- **Extraction**: Intelligent text extraction with metadata preservation

### ✅ Mind Maps
- **Generation**: AI-powered concept extraction
- **Visualization**: Interactive React Flow diagrams
- **Customization**: Drag-to-reposition nodes
- **Export**: PNG image export capability

### ✅ Flashcards
- **Creation**: Automatic Q&A pair generation
- **Display**: Flip-card animation UI
- **Learning**: Active recall methodology
- **Tracking**: Performance metrics per card

### ✅ AI Chat
- **Context**: Chat with full document context
- **History**: Conversations saved by document
- **Limits**: Plan-based message quotas
- **Rendering**: Markdown formatted responses

---

## Chat History & Persistence

### Overview
Save all conversations with your documents for future reference and continued learning.

### API Endpoints
```
POST   /api/conversations              Create new conversation
GET    /api/conversations              List all conversations
GET    /api/conversations/:docId       Get conversations for document
POST   /api/conversations/:convId/messages   Add message
DELETE /api/conversations/:convId      Delete conversation
```

### Database Schema
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  title TEXT,
  messageCount INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (documentId) REFERENCES documents(id)
);

CREATE TABLE conversation_messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id)
);
```

### Usage Example
```javascript
// Create conversation
const convRes = await fetch('/api/conversations', {
  method: 'POST',
  body: JSON.stringify({
    documentId: 'doc-123',
    title: 'Biology Chapter 5 Questions'
  })
});

// Add message
await fetch(`/api/conversations/${convId}/messages`, {
  method: 'POST',
  body: JSON.stringify({
    role: 'user',
    content: 'Explain photosynthesis'
  })
});
```

### Benefits
- ✅ Review past discussions
- ✅ Continue learning sessions
- ✅ Track understanding progress
- ✅ Reference previous answers

---

## Favorites & Bookmarks

### Overview
Quickly access frequently used documents without scrolling through your entire library.

### API Endpoints
```
POST   /api/favorites/:docId           Add to favorites
DELETE /api/favorites/:docId           Remove from favorites
GET    /api/favorites                  List favorite documents
```

### Database Schema
```sql
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, documentId),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (documentId) REFERENCES documents(id)
);
```

### Features
- ⭐ One-click bookmarking
- 🏷️ Separate favorites view
- 📝 Pin important documents
- ⚡ Fast access from dashboard

---

## Document Tags

### Overview
Organize documents with custom color-coded tags for better categorization.

### API Endpoints
```
POST   /api/tags                       Create new tag
GET    /api/tags                       List user tags
POST   /api/tags/:tagId/documents/:docId   Tag a document
DELETE /api/tags/:tagId/documents/:docId   Remove tag
GET    /api/documents/:docId/tags      Get document tags
```

### Database Schema
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, name),
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE document_tags (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  tagId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(documentId, tagId),
  FOREIGN KEY (documentId) REFERENCES documents(id),
  FOREIGN KEY (tagId) REFERENCES tags(id)
);
```

### Predefined Colors
- 🟥 Red: `#ef4444`
- 🟧 Orange: `#f97316`
- 🟨 Amber: `#eab308`
- 🟩 Green: `#22c55e`
- 🟦 Blue: `#3b82f6`
- 🟪 Purple: `#a855f7`

### Usage Example
```javascript
// Create tag
const tag = await fetch('/api/tags', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Biology',
    color: '#ef4444'
  })
});

// Tag document
await fetch(`/api/tags/${tagId}/documents/${docId}`, {
  method: 'POST'
});
```

---

## Full-Text Search

### Overview
Search across all your documents and conversations instantly.

### API Endpoints
```
POST   /api/search                     Search documents
POST   /api/search/conversations       Search conversations
```

### Search Features
- 🔍 Search document titles and content
- 💬 Search conversation history
- 📊 Relevance scoring
- ⚡ Fast results with indexing

### Request Format
```json
{
  "query": "photosynthesis",
  "limit": 10
}
```

### Response
```json
{
  "results": [
    {
      "id": "doc-123",
      "title": "Biology Chapter 5",
      "excerpt": "...photosynthesis is the process...",
      "relevance": 0.95,
      "type": "document"
    }
  ]
}
```

### Implementation
- Uses LIKE queries with relevance scoring
- Indexes: document titles, content, conversation content
- Case-insensitive matching
- Fuzzy matching ready (FTS5 upgrade available)

---

## Analytics Dashboard

### Overview
Track your learning metrics and activity trends.

### API Endpoint
```
GET    /api/analytics                  Get analytics data
```

### Metrics Tracked
- 📊 Documents viewed (count)
- 💬 Chat interactions (by document)
- 📇 Flashcards reviewed
- ⏱️ Average session duration
- 📈 Learning trends

### Response Format
```json
{
  "documentsViewed": 24,
  "chatInteractions": 156,
  "flashcardsReviewed": 342,
  "topDocuments": [
    {
      "id": "doc-123",
      "title": "Biology Ch5",
      "interactions": 45
    }
  ],
  "weeklyActivity": [
    { "day": "Monday", "interactions": 23 },
    ...
  ]
}
```

### Database Schema
```sql
CREATE TABLE analytics_logs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  documentId TEXT,
  action TEXT NOT NULL,
  metadata JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (documentId) REFERENCES documents(id)
);
```

### Actions Logged
- `upload` - Document uploaded
- `view` - Document viewed
- `chat` - Chat message sent
- `flashcard_review` - Flashcard reviewed
- `generate` - Mindmap/Flashcard generated
- `export` - Document exported

---

## Share & Collaboration

### Overview
Securely share documents with classmates using expiring tokens.

### API Endpoints
```
POST   /api/share/:docId               Create share link
POST   /api/share/validate             Validate share token
GET    /api/share/:token               Access shared document
DELETE /api/share/:shareId             Revoke share link
```

### Features
- 🔐 Secure token-based sharing (32-byte random)
- ⏰ Set expiration dates
- 🛡️ View-only or edit access
- 📊 Access tracking logs

### Request Format
```json
{
  "shareType": "view",
  "expiresIn": 7
}
```

### Response
```json
{
  "shareLink": "https://notemind.app/share/a1b2c3d4e5f6...",
  "token": "a1b2c3d4e5f6...",
  "expiresAt": "2026-03-04T10:30:00Z"
}
```

### Database Schema
```sql
CREATE TABLE shared_documents (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  shareType TEXT DEFAULT 'view',
  expiresAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documentId) REFERENCES documents(id),
  FOREIGN KEY (ownerId) REFERENCES users(id)
);

CREATE TABLE shared_access_logs (
  id TEXT PRIMARY KEY,
  shareId TEXT NOT NULL,
  accessorId TEXT,
  accessedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shareId) REFERENCES shared_documents(id)
);
```

---

## Spaced Repetition (SM-2)

### Overview
Scientifically-optimized flashcard scheduling using the SM-2 algorithm.

### API Endpoints
```
POST   /api/flashcards/:docId/metrics  Record flashcard review
GET    /api/flashcards/:docId/due      Get due flashcards
GET    /api/flashcards/:docId/stats    Get learning statistics
```

### SM-2 Algorithm Details
The SuperMemo-2 algorithm optimizes review scheduling:

**Ease Factor Calculation:**
```
EF' = EF + (0.1 - (5 - g) × (0.08 + (5 - g) × 0.02))

Where:
- EF = Previous ease factor
- g = Quality grade (0-5)
```

**Quality Grades:**
- 0 = Complete blackout, complete inability to recall
- 1 = Incorrect response, but upon seeing correct answer, recalls it
- 2 = Incorrect response, but good recollection of information
- 3 = Correct response, but after serious difficulty
- 4 = Correct response after some hesitation
- 5 = Correct response without difficulty

**Review Intervals:**
```
I(1) = 1 day
I(2) = 3 days
I(n) = I(n-1) × EF

If quality < 3:
  Restart interval to 1 day
  Reset ease factor to 2.5
```

### Request Format
```json
{
  "flashcardId": "card-123",
  "qualityGrade": 4,
  "timeSpentMs": 25000
}
```

### Response
```json
{
  "nextReviewDate": "2026-03-05",
  "interval": 3,
  "easeFactor": 2.45,
  "totalReviews": 5
}
```

### Database Schema
```sql
CREATE TABLE flashcard_metrics (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  flashcardId TEXT NOT NULL,
  interval INTEGER DEFAULT 1,
  easeFactor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  nextReviewDate DATE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (documentId) REFERENCES documents(id)
);

CREATE TABLE flashcard_reviews (
  id TEXT PRIMARY KEY,
  metricId TEXT NOT NULL,
  qualityGrade INTEGER CHECK(qualityGrade BETWEEN 0 AND 5),
  reviewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (metricId) REFERENCES flashcard_metrics(id)
);
```

### Benefits
- ✅ Optimal review timing
- ✅ Minimum study time
- ✅ Maximum retention
- ✅ Scientifically proven

---

## Offline Support

### Overview
Queue actions while offline and auto-sync when connection returns.

### API Endpoints
```
POST   /api/sync/queue                 Queue action for sync
GET    /api/sync/pending               Get pending actions
POST   /api/sync/confirm               Mark as synced
```

### Supported Actions
- 📝 Create/update notes
- 💬 Queue chat messages
- 📇 Create flashcard reviews
- ⭐ Add/remove favorites
- 🏷️ Add/remove tags

### Database Schema
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  action TEXT NOT NULL,
  data JSON NOT NULL,
  synced BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  syncedAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Client-Side Flow
```javascript
// Detect online/offline
window.addEventListener('offline', () => {
  localStorage.setItem('isOffline', 'true');
});

window.addEventListener('online', () => {
  localStorage.removeItem('isOffline');
  // Trigger sync
  await syncPendingActions();
});

// Queue action if offline
async function performAction(action) {
  if (navigator.onLine) {
    return await apiCall(action);
  } else {
    // Queue for later
    localStorage.setItem('pendingAction_' + Date.now(), JSON.stringify(action));
  }
}
```

---

## Multi-Device Sync

### Overview
Sync user preferences and settings across all devices.

### API Endpoints
```
GET    /api/preferences                Get user settings
PUT    /api/preferences                Update user settings
```

### Settings Synced
- 🎨 Theme preference
- 🔔 Notification settings
- ⌨️ Keyboard shortcuts
- 💾 Offline mode toggle
- 🌙 Dark/Light mode

### Database Schema
```sql
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL UNIQUE,
  theme TEXT DEFAULT 'rose',
  offlineModeEnabled BOOLEAN DEFAULT TRUE,
  notifications BOOLEAN DEFAULT TRUE,
  emailUpdates BOOLEAN DEFAULT FALSE,
  metadata JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Request Format
```json
{
  "theme": "violet",
  "offlineModeEnabled": true,
  "notifications": true
}
```

---

## Export Features

### Overview
Export your documents and flashcards in multiple formats.

### API Endpoints
```
POST   /api/export/flashcards/:docId       Export as CSV
POST   /api/export/conversations/:convId   Export as PDF
POST   /api/export/mindmap/:docId          Export as PNG
```

### CSV Export (Flashcards)
**Columns:**
- Question
- Answer
- Ease Factor
- Interval
- Next Review Date

**Example:**
```csv
"What is photosynthesis?","Process of converting light to chemical energy",2.5,1,2026-03-05
"Name the 3 stages of photosynthesis","Light reactions, Calvin cycle, Regeneration",2.45,3,2026-03-07
```

### PDF Export (Conversations)
- 📄 Document title page
- 💬 All conversation Q&A pairs
- 📅 Timestamps
- 📊 Formatted for printing

### PNG Export (Mind Maps)
- 🖼️ High-resolution diagram
- 📏 Scalable vector format
- 🎨 Full color rendering
- 💾 1200x800px minimum

### Implementation
```javascript
// PDFKit for PDF generation
const PDFDocument = require('pdfkit');

// Canvas for PNG export
const { createCanvas } = require('canvas');

// Export directory
const exportDir = './server/exports';
fs.mkdirSync(exportDir, { recursive: true });
```

---

## AI Recommendations

### Overview
Get personalized learning paths and document suggestions based on your activity.

### API Endpoints
```
POST   /api/learning-paths              Generate learning path
GET    /api/learning-paths              List user paths
POST   /api/learning-paths/:pathId/complete   Mark path complete
GET    /api/suggestions/documents       Get suggested documents
```

### Learning Path Generation
Paths are created based on:
- 📊 User action history
- 📚 Document complexity
- ⏱️ Available time
- 🎯 Learning goals
- 📈 Mastery gaps

### Response Format
```json
{
  "pathId": "path-123",
  "title": "Biology Fundamentals",
  "description": "Complete guide to basic biology",
  "estimatedDays": 14,
  "stages": [
    {
      "order": 1,
      "documentId": "doc-101",
      "title": "Cell Structure",
      "description": "Understand cell components",
      "estimatedMinutes": 45
    },
    {
      "order": 2,
      "documentId": "doc-102",
      "title": "Cell Division",
      "estimatedMinutes": 50
    }
  ]
}
```

### Database Schema
```sql
CREATE TABLE learning_paths (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimatedDays INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  completedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE learning_path_stages (
  id TEXT PRIMARY KEY,
  pathId TEXT NOT NULL,
  documentId TEXT NOT NULL,
  stageOrder INTEGER NOT NULL,
  estimatedMinutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  completedAt DATETIME,
  FOREIGN KEY (pathId) REFERENCES learning_paths(id),
  FOREIGN KEY (documentId) REFERENCES documents(id)
);
```

### AI Logic
```javascript
// Analyze user behavior
const userStats = {
  documentsViewed: 24,
  chatInteractions: 156,
  averageSessionTime: 45,
  topTags: ['Biology', 'Chemistry', 'Physics']
};

// Generate recommendations
const recommendations = await generateLearningPath(userId, userStats);

// Sort by:
// 1. Tag relevance
// 2. Complexity level
// 3. User progress
// 4. Prerequisite status
```

---

## Performance Optimization

### Database Indexes
All feature tables include optimized indexes:
```sql
CREATE INDEX idx_conversations_userId ON conversations(userId);
CREATE INDEX idx_favorites_userId ON favorites(userId);
CREATE INDEX idx_tags_userId ON tags(userId);
CREATE INDEX idx_document_tags_documentId ON document_tags(documentId);
CREATE INDEX idx_search_index_content ON search_index(documentId);
CREATE INDEX idx_analytics_userId ON analytics_logs(userId);
CREATE INDEX idx_flashcard_metrics_userId ON flashcard_metrics(userId);
```

### Query Optimization
- ✅ Foreign key constraints for data integrity
- ✅ Cascading deletes for cleanup
- ✅ Unique constraints where needed
- ✅ Proper column types (TEXT, INTEGER, DATETIME, BOOLEAN, JSON, REAL)

---

## Security Considerations

### Data Protection
- ✅ All user data encrypted at rest in SQLite
- ✅ API requests/responses encrypted with AES-256
- ✅ Share tokens use 32-byte random generation
- ✅ Password hashing with bcryptjs (salt: 10)

### Access Control
- ✅ JWT authentication (24-hour expiry)
- ✅ Role-based authorization
- ✅ Document ownership verification
- ✅ Share token validation

### Audit Trail
- ✅ All analytics logged
- ✅ Access logs for shared documents
- ✅ Activity timestamps preserved
- ✅ Error logging with context

---

## Future Enhancements

- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced ML recommendations  
- [ ] Video content support
- [ ] Audio transcription
- [ ] Social features (friend groups)
- [ ] Custom quiz generation
- [ ] Gamification (badges, streaks)
- [ ] Browser context menu integration

