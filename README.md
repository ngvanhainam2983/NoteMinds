<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Qwen3-AI_Engine-7C3AED?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Encryption-AES256-FF6B6B?style=for-the-badge&logo=security&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Deployment-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

# 🧠 NoteMind - AI-Powered Study Assistant

> **Transform your documents into interactive learning tools** — Upload PDFs, auto-generate mind maps, flashcards, create summaries, and chat with your content using advanced AI. With 11 enterprise-grade features including encryption, offline sync, and collaborative sharing.

NoteMind is a comprehensive learning platform combining document processing, AI generation, and interactive learning tools. Students and professionals upload educational materials and instantly get mind maps, flashcards, test practice, analytics, and more.

🌐 **Live Demo**: [https://loveyuna.today](https://loveyuna.today)

---

## 🌟 What Makes NoteMind Different?

- ✅ **11 Advanced Features** — From chat history to AI learning paths
- 🔒 **Enterprise Security** — End-to-end AES-256 encryption for all API calls
- 📱 **Offline-First** — Queue actions offline, auto-sync when online
- 🌍 **Multi-Device** — Seamlessly sync across all your devices
- 🤖 **SM-2 Algorithm** — Scientifically-proven spaced repetition for memorization
- 🎨 **6 Beautiful Themes** — Customizable UI with instant theme switching
- 📊 **Analytics** — Track your learning progress with detailed metrics
- 🔄 **Auto-Update System** — PowerShell & Bash scripts for easy deployment updates
- 🐳 **Docker Ready** — Production-ready containers   for instant deployment
- 💾 **Multiple Exports** — PDF, CSV, PNG image formats supported

---

## ✨ Complete Feature Set

### 🎯 Core Features

| Feature | Status | Description |
|---------|:------:|-----------|
| 📄 **Multi-Format Upload** | ✅ | PDF, DOCX, PPTX, XLSX, CSV, TXT, Markdown up to 50MB |
| 🧠 **Mind Maps** | ✅ | AI-generated interactive visual diagrams (React Flow) |
| 📇 **Flashcards** | ✅ | Smart study cards with flip animations |
| 💬 **AI Chat** | ✅ | Natural conversations with your document content |
| 🔐 **Auth & Billing** | ✅ | JWT auth, 4 subscription tiers, plan management |
| 🛡️ **Admin Panel** | ✅ | Full user management, role assignment, banning |
| 🎨 **6 Themes** | ✅ | Customizable colors with auto-save to localStorage |
| 📱 **Responsive UI** | ✅ | Mobile, tablet, and desktop optimized |

### 🚀 Advanced Features (11 New)

| # | Feature | Endpoints | Key Benefit |
|:--|---------|:---------:|-----------|
| 1️⃣ | **Chat History** | 5 | Save and retrieve all conversations per document |
| 2️⃣ | **Favorites** | 4 | Quick bookmarking system for important documents |
| 3️⃣ | **Tags** | 5 | Custom tags for document organization & filtering |
| 4️⃣ | **Full-Text Search** | 2 | Search anything across documents & conversations |
| 5️⃣ | **Analytics** | 1 | Track learning metrics & activity trends |
| 6️⃣ | **Share & Collab** | 4 | Secure token-based sharing with expiration |
| 7️⃣ | **Spaced Repetition** | 3 | SM-2 algorithm for optimal flashcard scheduling |
| 8️⃣ | **Offline Sync** | 3 | Queue actions offline, auto-sync when online |
| 9️⃣ | **Multi-Device** | 2 | Sync preferences & data across all devices |
| 🔟 | **Export** | 3 | PDF conversations, CSV flashcards, PNG mindmaps |
| 🔟➕ | **AI Recommendations** | 4 | Personalized learning paths & document suggestions |

**Total: 47 API endpoints across all features**

---

## 🛠️ Technology Stack

### Frontend
- **React 18.3** — Modern UI library with hooks
- **Vite 5.4** — Lightning-fast build tool
- **Tailwind CSS 3.4** — Utility-first CSS with 6 color themes
- **React Flow** — Interactive diagram rendering for mind maps
- **crypto-js** — Client-side AES-256 encryption
- **Axios** — HTTP client with request/response interceptors
- **Lucide React** — Beautiful icon library
- **React Markdown** — Markdown rendering for AI responses

### Backend
- **Node.js + Express 4.21** — RESTful API server
- **SQLite3 (better-sqlite3)** — 28 tables with optimized indexes
- **JWT (jsonwebtoken)** — 24-hour token authentication
- **bcryptjs** — Secure password hashing (salt rounds: 10)
- **Node.js crypto** — Server-side AES-256-CBC encryption
- **Winston 3.11.0** — Structured logging with daily rotation
- **Canvas & PDFKit** — PDF and PNG export generation
- **Multer** — Multipart file upload handling

### AI & Document Processing
- **Qwen3-Max** — Advanced language model (DashScope API)
- **pdf-parse** — PDF text extraction
- **mammoth** — DOCX parsing library
- **node-pptx-parser** — PPTX presentation reading
- **xlsx** — Excel & CSV parsing  
- **JSZip** — ZIP/Office format decompression

### Infrastructure & DevOps
- **Docker & Docker Compose** — Containerized deployment
- **Nginx** — Reverse proxy & SSL termination
- **PM2** — Node.js process manager
- **Certbot** — Let's Encrypt SSL automation

---

## 📐 System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     🌐 CLIENT LAYER (React SPA)                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ • 6 Theme System (Rose, Violet, Blue, Emerald, Amber, Cyan)  │   │
│  │ • Offline Queue Management + Local Sync State                │   │
│  │ • AES-256 Request/Response Encryption (crypto-js)            │   │
│  │ • LocalStorage: Prefs, Theme, Sync Queue                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────┬────────────────────────────────────────────────────┬──┘
               │         HTTPS + AES-256 Encrypted Body            │
┌──────────────▼────────────────────────────────────────────────────▼──┐
│                    🔒 SECURITY & AUTH LAYER                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ • AES-256-CBC Decryption (Node.js crypto)                  │    │
│  │ • JWT Verification (24-hour expiry)                        │    │
│  │ • Role-Based Access Control (User/Admin)                   │    │
│  │ • IP/User Rate Limiting                                    │    │
│  │ • Request Logging & Activity Tracking                      │    │
│  │ • Error Logging with Winston (daily rotation)              │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────┬────────────────────────────────────────────────────┬──┘
               │
┌──────────────▼──────────────────────────────────────────────────────▼─┐
│                  ⚙️ EXPRESS API LAYER (Port 3001)                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 📚 Core Routes: Upload, Chat, Mindmap, Flashcards (5 routes)   │ │
│  │ 🎯 Feature Routes: 47 Advanced Endpoints                       │ │
│  │                                                                 │ │
│  │    💬 Chat History (5)      ⭐ Favorites (4)                    │ │
│  │    🏷️ Tags (5)              🔍 Search (2)                       │ │
│  │    📊 Analytics (1)         🔐 Sharing (4)                      │ │
│  │    🧩 Spaced Repetition (3) 💾 Export (3)                       │ │
│  │    🔄 Offline Sync (3)      ⚙️ Preferences (2)                  │ │
│  │    🤖 Learning Paths (4)                                        │ │
│  │                                                                 │ │
│  │ 🛡️ Admin Routes (8 endpoints)                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────┬────────────────────────────────────────────────────┬───┘
               │
    ┌──────────┼───────────┬────────────────┬──────────────┐
    │          │           │                │              │
    ▼          ▼           ▼                ▼              ▼
┌────────┐ ┌────────┐ ┌────────┐  ┌───────────┐  ┌──────────────┐
│ SQLite │ │ Uploads│ │Winston │  │ Qwen3-Max │  │ Exports Dir  │
│ 28 Tbl │ │ Store  │ │ Logs   │  │ (DashScope│  │(PDF/CSV/PNG) │
│+Indexes│ │        │ │ Rotate │  │  API)     │  │              │
└────────┘ └────────┘ └────────┘  └───────────┘  └──────────────┘

DATABASE: 28 Tables with Proper Indexing
├─ Core: users, documents, user_plans, admin_logs
├─ Chat: conversations, conversation_messages
├─ Org: favorites, tags, document_tags, search_index
├─ Analytics: analytics_logs, flashcard_metrics, flashcard_reviews
├─ Sharing: shared_documents, shared_access_logs
├─ Sync: sync_queue, user_preferences, learning_paths
└─ Admin: user_bans, ip_bans, error_logs, log_events
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** ≥ 18 LTS
- **npm** ≥ 9
- **API Key** from [Alibaba DashScope](https://dashscope.aliyun.com/) (free tier)

### Installation (3 Easy Steps)

**Step 1: Clone & Install**
```bash
git clone https://github.com/your-username/NoteMind.git
cd NoteMind
npm run install:all
```

**Step 2: Configure API**

Create `server/.env`:
```env
# AI Model Configuration
QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_API_KEY=sk-your-api-key-here
QWEN_MODEL=qwen3-max
PORT=3001
NODE_ENV=development

# Encryption (generates if not set)
ENCRYPTION_ALGORITHM=aes-256-cbc
```

**Step 3: Run**
```bash
npm run dev
```

| Component | URL |
|-----------|-----|
| 🎨 React Frontend | http://localhost:5173 |  
| ⚙️ API Backend | http://localhost:3001 |
| 📊 Health Check | http://localhost:3001/api/health |

---

## 📚 API Quick Reference

### Authentication (4 endpoints)
| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/register` | Create account |
| `POST` | `/api/login` | Get JWT token |
| `PUT` | `/api/profile` | Update user info |
| `PUT` | `/api/change-password` | Change password |

### Core Document Features (5 endpoints)
| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/upload` | Upload document |
| `GET` | `/api/documents` | List user docs |
| `GET` | `/api/status/:id` | Check processing |
| `POST` | `/api/documents/:id/mindmap` | Generate mind map |
| `POST` | `/api/documents/:id/flashcards` | Generate flashcards |

### Chat History (5 endpoints)
| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations` | List all chats |
| `POST` | `/api/conversations/:id/messages` | Add message |
| `DELETE` | `/api/conversations/:id` | Delete chat |

### Favorites / Tags / Search (6 endpoints)
| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/favorites/:docId` | Bookmark doc |
| `POST` | `/api/tags` | Create tag |
| `POST` | `/api/tags/:id/docs/:docId` | Tag document |
| `POST` | `/api/search` | Full-text search |

### Spaced Repetition (SM-2 Algorithm) (3 endpoints)
| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/flashcards/:docId/metrics` | Record review |
| `GET` | `/api/flashcards/:docId/due` | Get due cards |
| `GET` | `/api/flashcards/:docId/stats` | Get stats |

### Sharing / Export / Sync (11 endpoints)
| Method | Endpoint | Description |
|--------|----------|-----------|
| `POST` | `/api/share/:docId` | Create share link |
| `POST` | `/api/export/flashcards/:docId` | Export CSV |
| `POST` | `/api/export/conversations/:convId` | Export PDF |
| `POST` | `/api/sync/queue` | Queue offline action |

**➜ Full API Docs**: See [API.md](./API.md)

---

## 🔒 Security & Encryption

### End-to-End Encryption
- **Algorithm**: AES-256-CBC (Advanced Encryption Standard)
- **Key Length**: 256 bits (32 bytes)
- **IV**: Randomly generated 16 bytes per request
- **Client-Side**: crypto-js library
- **Server-Side**: Node.js native crypto module
- **Coverage**: ALL API requests & responses encrypted

### Authentication & Authorization
- **JWT**: 24-hour token expiration
- **Password**: bcryptjs with 10 salt rounds
- **Roles**: User / Admin with RBAC
- **IP Banning**: Admin can block IP addresses
- **User Banning**: Suspend accounts

### Audit & Logging  
- **Winston Logger**: Structured logs with daily rotation
- **Request Logging**: Timestamp, IP, userId, endpoint, status
- **Error Tracking**: Full stack traces  with context
- **Activity Analytics**: Learning metrics per user
- **Retention**: 7-day log retention

---

## 🎨 Beautiful Themes

Six color themes automatically applied across entire UI:

| Theme | Color | Variables |
|:------|:-----:|-----------|
| 🌸 **Rose** | `#f43f5e` | pink-500 tones |
| 💜 **Violet** | `#8b5cf6` | purple-500 tones |
| 💙 **Blue** | `#3b82f6` | blue-500 tones |
| 💚 **Emerald** | `#10b981` | green-500 tones |
| 🧡 **Amber** | `#f59e0b` | amber-500 tones |
| 🩵 **Cyan** | `#06b6d4` | cyan-500 tones |

Theme persists across device sessions via localStorage.

---

## 💎 Pricing & Plans

| Feature | Free | Basic | Pro | Unlimited |
|:--------|:----:|:-----:|:---:|:---------:|
| **Price** | $0 | $4.90/mo | $9.90/mo | $19.90/mo |
| **Docs/day** | 5 | 15 | 30 | ∞ |
| **File size** | 10MB | 25MB | 50MB | ∞ |
| **Chat msgs** | 10/doc | 25/doc | 50/doc | ∞ |
| **PDF** | ✅ | ✅ | ✅ | ✅ |
| **DOCX/PPTX** | ❌ | ✅ | ✅ | ✅ |
| **XLSX/CSV** | ❌ | ❌ | ✅ | ✅ |
| **Mind Maps** | ✅ | ✅ | ✅ | ✅ |
| **Flashcards** | ✅ | ✅ | ✅ | ✅ |
| **Chat History** | ✅ | ✅ | ✅ | ✅ |
| **Sharing** | ✅ | ✅ | ✅ | ✅ |
| **Analytics** | ✅ | ✅ | ✅ | ✅ |
| **Offline Sync** | ✅ | ✅ | ✅ | ✅ |

---

## 📁 Project Structure

```
NoteMind/
├── README.md                    This file
├── API.md                       47 endpoint docs
├── FEATURES.md                  Detailed features
├── DEPLOYMENT.md                Deploy guide
├── .gitignore                   Git ignore rules
├── .env.example                 Config template
│
├── client/                      React Frontend (Vite)
│   ├── src/
│   │   ├── components/          UI components
│   │   ├── api.js               Axios + encryption
│   │   ├── ThemeContext.jsx     6 themes
│   │   └── App.jsx              Root
│   └── vite.config.js
│
├── server/                      Express Backend
│   ├── services/
│   │   ├── chatService.js       AI chat
│   │   ├── qwenClient.js        Qwen3 API
│   │   ├── documentProcessor.js Parse docs
│   │   ├── mindmapGenerator.js  Create mindmaps
│   │   ├── flashcardGenerator.js Create cards
│   │   ├── authService.js       JWT & plans
│   │   ├── featureService.js    Chat, favs, tags
│   │   ├── advancedFeatureService.js Search, share
│   │   ├── syncAndExportService.js Export, sync
│   │   ├── encryptionService.js Crypto util
│   │   ├── logger.js            Winston logging
│   │   ├── enhancedDatabase.js  14 new tables
│   │   └── databaseIndexes.js   DB optimization
│   ├── routes/
│   │   └── featuresRoutes.js    47 endpoints
│   ├── middleware/
│   │   └── encryptionMiddleware.js Request decrypt
│   ├── uploads/                 User documents
│   ├── exports/                 Generated files
│   ├── logs/                    Winston logs
│   └── index.js                 Express app
│
├── deploy/                      Deployment
│   ├── nginx.conf               Reverse proxy
│   ├── ecosystem.config.cjs     PM2 config
│   └── setup-vps.sh             VPS automation
│
├── Dockerfile                   Container image
├── docker-compose.yml           Full stack
├── update-auto.sh               Linux updater
└── update-auto.ps1              Windows updater
```

---

## 🚀 Advanced Features Explained

### SM-2 Spaced Repetition Algorithm
Scientifically proven scheduling for optimal memorization:
- Quality grades: 0-5 (0-2 = wrong, 3-5 = correct)
- Ease factor: Starts at 2.5, adjusted per review
- Intervals: 1 day → 3 days → (interval × ease factor)
- Automatic reset on mistakes
- Due cards shown based on schedule

### Offline-First Sync
- Queue actions when offline
- Auto-sync when connection restored
- Conflict resolution (last-write-wins)
- Per-document sync state tracking

### Analytics Dashboard
- Documents viewed
- Total chat interactions
- Average review interval
- Flashcard mastery rate
- Learning time trends

### Learning Paths
AI generates personalized study sequences based on:
- User's activity patterns
- Document complexity
- Mastery gaps
- Time availability

---

## 🐳 Deployment Options

### Docker (1 command)
```bash
docker-compose up -d
# App accessible at https://your-domain
```
See: [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)

### VPS with PM2 (Automated)
```bash
bash deploy/setup-vps.sh
# Auto configures Nginx, SSL, PM2
```
See: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Manual Deploy
```bash
npm run build
npm start
# Runs at http://localhost:3001
```

---

## 🔄 Auto-Update System

PowerShell (Windows):
```powershell
.\update-auto.ps1
# Pulls latest, installs deps, restarts PM2
```

Bash (Linux/VPS):
```bash
bash update-auto.sh  
# Same functionality on Linux
```

---

## 🛡️ Admin Panel Features

- 👥 User management (view, edit, delete)
- 💎 Plan assignment (Free → Unlimited)
- 🔑 Role assignment (User → Admin)
- 🚫 Ban users or IP addresses
- 📊 System statistics
- 🔍 User activity logs

---

## 🧪 Testing & Validation

```bash
# Check API health
curl http://localhost:3001/api/health

# View database
sqlite3 server/data/notemind.db ".tables"

# Check logs
tail -f server/logs/app.log

# Database stats
curl http://localhost:3001/api/health | jq '.database'
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [README.md](./README.md) | Project overview (you are here) |
| [API.md](./API.md) | Complete API endpoint documentation |
| [FEATURES.md](./FEATURES.md) | Detailed feature guides |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment |
| [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md) | Docker setup guide |
| [ENCRYPTION_AND_UPDATES.md](./ENCRYPTION_AND_UPDATES.md) | Encryption & updates |
| [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) | Performance tuning |

---

## 🤝 Contributing

1. Fork the repository  
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📝 License

Educational & research purposes. MIT License.

---

## 🆘 Support

- 📧 **Email**: support@notemind.app
- 💬 **GitHub Issues**: [Report bugs](https://github.com/your-username/NoteMind/issues)
- 📔 **Docs**: [Full documentation](#)
- 🌐 **Website**: [loveyuna.today](https://loveyuna.today)

---

## 🎯 Future Roadmap

- [ ] Mobile app (React Native)
- [ ] Real-time collaboration  
- [x] End-to-end encryption
- [x] 11 advanced features
- [ ] Browser extension
- [ ] Desktop app (Electron)
- [ ] Video transcription
- [ ] Advanced ML personalization
- [ ] API for developers
- [ ] White-label solution

---

<p align="center">
  <strong>❤️ Made for students, researchers, and lifelong learners</strong>
  <br><br>
  <a href="https://github.com/your-username/NoteMind">⭐ Star on GitHub</a>
  &nbsp;•&nbsp;
  <a href="https://loveyuna.today">🌐 Visit Website</a>
  <br><br>
  Built by <strong>Đèn Giao Thông</strong> Team
  <br>
  Lead Developer: <strong>Tùng Lâm</strong>
</p>
