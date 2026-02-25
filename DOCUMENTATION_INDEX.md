# 📋 Project Documentation Index

## 📚 Main Documentation Files

### 🚀 Getting Started
- **[README.md](./README.md)** - Project overview, features, quick start guide
- **[.env.example](./.env.example)** - Environment configuration template
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Developer quick start

### 🔌 API & Features
- **[API.md](./API.md)** - Complete API endpoint reference (47 endpoints)
- **[FEATURES.md](./FEATURES.md)** - Detailed feature documentation (11 advanced features)
- **[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** - Git & version control guide

### 🛠️ Technical
- **[ENCRYPTION_AND_UPDATES.md](./ENCRYPTION_AND_UPDATES.md)** - Encryption system & auto-updates
- **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** - Performance optimization details
- **[DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)** - Docker deployment guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Feature implementation details
- **[OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md)** - Optimization summary

### ✅ Verification
- **[VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)** - Testing & validation checklist

---

## 🎯 Quick Navigation

### For New Developers
1. Read **[README.md](./README.md)** - Understand the project
2. Read **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Setup and run locally
3. Check **[FEATURES.md](./FEATURES.md)** - Understand available features
4. Reference **[API.md](./API.md)** - When building frontend/integrations
5. See **[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** - Before making commits

### For Deployment
1. Read **[README.md](./README.md)** - Overview
2. Follow **[DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)** - For containerized deployment
3. Or **[DEPLOYMENT.md](./DEPLOYMENT.md)** (coming soon) - For VPS setup
4. Reference **[ENCRYPTION_AND_UPDATES.md](./ENCRYPTION_AND_UPDATES.md)** - Security & updates

### For Integration/API Usage
1. Start with **[API.md](./API.md)** - Complete reference
2. Check **[FEATURES.md](./FEATURES.md)** - For feature details
3. Use **[.env.example](./.env.example)** - For configuration

### For Performance Tuning
1. Read **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** - Complete optimization details
2. Check **[OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md)** - Quick summary
3. Review **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details

---

## 📂 Directory Structure

```
NoteMind/
├── 📚 Documentation Files
│   ├── README.md                    (Project overview & quick start)
│   ├── API.md                       (47 API endpoints)
│   ├── FEATURES.md                  (11 advanced features guide)
│   ├── GIT_WORKFLOW.md              (Version control guide)
│   ├── QUICK_REFERENCE.md           (Developer quick start)
│   ├── ENCRYPTION_AND_UPDATES.md    (Security & auto-update)
│   ├── OPTIMIZATION_GUIDE.md        (Performance tuning)
│   ├── OPTIMIZATION_SUMMARY.md      (Optimization summary)
│   ├── DOCKER_QUICKSTART.md         (Docker deployment)
│   ├── IMPLEMENTATION_SUMMARY.md    (Technical details)
│   └── VALIDATION_CHECKLIST.md      (Testing checklist)
│
├── 🔧 Configuration Files
│   ├── .env.example                 (Environment template)
│   ├── .env                         (Actual config - NOT in git)
│   ├── .gitignore                   (Git ignore rules)
│   ├── docker-compose.yml           (Docker compose config)
│   ├── Dockerfile                   (Container image)
│   ├── .dockerignore                (Docker ignore rules)
│   ├── package.json                 (Root dependencies)
│   ├── package-lock.json            (Dependency lock)
│   └── .env (not in git)            (Actual secrets - security)
│
├── 🎨 client/ (React Frontend)
│   ├── src/
│   │   ├── components/              (React components)
│   │   ├── App.jsx                  (Root component)
│   │   ├── api.js                   (Axios + encryption)
│   │   ├── ThemeContext.jsx         (6 themes)
│   │   └── index.css                (Global styles)
│   ├── package.json
│   ├── vite.config.js               (Vite config)
│   └── tailwind.config.js           (Tailwind config)
│
├── ⚙️ server/ (Express Backend)
│   ├── services/
│   │   ├── authService.js           (Auth & plans)
│   │   ├── chatService.js           (AI chat)
│   │   ├── qwenClient.js            (Qwen3 API)
│   │   ├── documentProcessor.js     (Parse docs)
│   │   ├── mindmapGenerator.js      (Create mindmaps)
│   │   ├── flashcardGenerator.js    (Create cards)
│   │   ├── encryptionService.js     (Crypto util)
│   │   ├── featureService.js        (Chat, favs, tags)
│   │   ├── advancedFeatureService.js (Search, share)
│   │   ├── syncAndExportService.js  (Export, sync)
│   │   ├── logger.js                (Winston logging)
│   │   ├── enhancedDatabase.js      (14 new tables)
│   │   ├── databaseIndexes.js       (DB optimization)
│   │   └── jsonParser.js            (JSON extraction)
│   ├── routes/
│   │   └── featuresRoutes.js        (47 API endpoints)
│   ├── middleware/
│   │   └── encryptionMiddleware.js  (Decrypt requests)
│   ├── index.js                     (Express app)
│   ├── uploads/                     (User documents - NOT in git)
│   ├── exports/                     (Generated files - NOT in git)
│   ├── logs/                        (Application logs - NOT in git)
│   ├── data/                        (SQLite database - NOT in git)
│   └── package.json
│
├── 🚀 deploy/ (Deployment configs)
│   ├── nginx.conf                   (Nginx reverse proxy)
│   ├── ecosystem.config.cjs         (PM2 configuration)
│   ├── setup-vps.sh                 (VPS automation)
│   └── (More deployment tools)
│
└── 🔄 Automation Scripts
    ├── update-auto.sh               (Linux auto-updater)
    ├── update-auto.ps1              (Windows auto-updater)
    └── gen-og.ps1                   (OG image generator)
```

---

## 🔐 Security Notes

### Secrets NOT in Git
```
.env                    ❌ Never commit
server/.env            ❌ Never commit
server/uploads/        ❌ User documents
server/data/*.db       ❌ Database files
server/logs/           ❌ Application logs
node_modules/          ❌ Dependencies
```

### Secrets in .gitignore
Properly configured to exclude:
- Environment variables
- API keys
- Encryption keys
- Database files
- Uploaded documents
- Compiled code

---

## 📊 Project Statistics

### Code & Features
- **Total Features**: 8 core + 11 advanced = **19 features**
- **Total API Endpoints**: **47 endpoints**
- **Database Tables**: **28 tables** with proper indexing
- **Service Files**: **12 service modules**
- **Documentation Pages**: **11 comprehensive guides**

### Technology Stack
- **Frontend**: React 18.3, Vite, Tailwind CSS
- **Backend**: Node.js, Express 4.21, SQLite3
- **Database**: SQLite (better-sqlite3) with 28 tables
- **Encryption**: AES-256-CBC
- **Logging**: Winston 3.11.0
- **Auth**: JWT + bcryptjs
- **Export**: PDFKit, Canvas
- **AI**: Qwen3-Max (DashScope)
- **DevOps**: Docker, Compose, Nginx, PM2

### Lines of Code
- Core services: **~2000 LOC**
- API routes: **~500 LOC**
- Frontend components: **~3000 LOC**
- Configuration & setup: **~1000 LOC**
- **Total**: ~6500+ lines

---

## 🔄 Last Updated

| Component | Version | Date |
|-----------|---------|------|
| Core Features | 1.0.0 | 2026-02-25 |
| Advanced Features | 1.0.0 | 2026-02-25 |
| Encryption | 1.0.0 | 2026-02-25 |
| Documentation | 1.0.0 | 2026-02-25 |
| Dependencies | Latest | 2026-02-25 |

---

## 📞 Support & Resources

### Documentation
- 📖 [API Reference](./API.md)
- 🎯 [Feature Guide](./FEATURES.md)
- 🚀 [Quick Start](./README.md)
- 🔧 [Developer Guide](./QUICK_REFERENCE.md)

### Communication
- 📧 Email: support@notemind.app
- 💬 GitHub Issues: Report bugs
- 🌐 Website: https://loveyuna.today

### External Resources
- [Qwen3 Docs](https://dashscope.aliyun.com/)
- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [Docker Docs](https://docs.docker.com/)

---

## ✅ Checklist for New Developers

### First Time Setup
- [ ] Clone repository
- [ ] Read README.md
- [ ] Copy .env.example to server/.env
- [ ] Run `npm run install:all`
- [ ] Run `npm run dev`
- [ ] Visit http://localhost:5173
- [ ] Check API health at http://localhost:3001/api/health

### Before First Commit
- [ ] Read GIT_WORKFLOW.md
- [ ] Configure Git user
- [ ] Create feature branch
- [ ] Follow commit message format
- [ ] Test changes locally
- [ ] Create pull request

### Understanding the Project
- [ ] Understand 8 core features
- [ ] Learn 11 advanced features
- [ ] Review API endpoints
- [ ] Understand database schema
- [ ] Know security implications
- [ ] Check deployment options

---

## 🎓 Learning Resources

### For Backend Development
1. Service architecture in `server/services/`
2. API routes in `server/routes/featuresRoutes.js`
3. Middleware in `server/middleware/`
4. Database schema in `server/services/enhancedDatabase.js`

### For Frontend Development
1. Components in `client/src/components/`
2. API client in `client/src/api.js`
3. Theme system in `client/src/ThemeContext.jsx`
4. Encryption in `client/src/encryptionService.js`

### For DevOps/Deployment
1. Docker files: `Dockerfile`, `docker-compose.yml`
2. Nginx config: `deploy/nginx.conf`
3. PM2 config: `deploy/ecosystem.config.cjs`
4. VPS setup: `deploy/setup-vps.sh`

---

## 🚀 Deployment Summary

### Three Deployment Options

**Option 1: Docker (Recommended)**
```bash
docker-compose up -d
```

**Option 2: VPS with PM2**
```bash
bash deploy/setup-vps.sh
```

**Option 3: Manual**
```bash
npm run build && npm start
```

See **[DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)** for details.

---

## 📝 File Modification Guide

### Safe to Modify (Tracked)
- ✅ Source code in `client/src/` and `server/services/`
- ✅ Configuration files (Dockerfile, nginx.conf, etc.)
- ✅ Documentation files

### DO NOT Commit (Ignored)
- ❌ `.env` files (use .env.example)
- ❌ Database files (`*.db`)
- ❌ Uploaded documents (`server/uploads/`)
- ❌ Generated files (`dist/`, `node_modules/`)
- ❌ Logs (`server/logs/`)

---

## 💡 Pro Tips

1. **Before coding**: Read `QUICK_REFERENCE.md`
2. **Building APIs**: Check `API.md` for endpoint patterns
3. **Implementing features**: refer to `FEATURES.md`
4. **Deploying**: Follow `DOCKER_QUICKSTART.md`
5. **Git commits**: Follow `GIT_WORKFLOW.md` format
6. **Performance**: Review `OPTIMIZATION_GUIDE.md`
7. **Security**: Check `ENCRYPTION_AND_UPDATES.md`

---

## 🎉 You're All Set!

NoteMind is fully configured and ready for development and deployment!

**Next Steps:**
1. Complete checklist above ✅
2. Start with [README.md](./README.md) 📖
3. Run `npm run dev` 🚀
4. Build awesome features! 💪

**Questions?** Check the relevant documentation file or create an issue on GitHub.

---

*Documentation Last Updated: February 25, 2026*
*Created with ❤️ by Đèn Giao Thông Team*
