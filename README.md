<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Qwen3-AI_Engine-7C3AED?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
</p>

# 🧠 NoteMinds

> **AI-powered Study Assistant** — Upload bài giảng, tự động tạo Sơ đồ tư duy, Flashcard và Hỏi đáp AI.

NoteMinds là ứng dụng web hỗ trợ học tập thông minh, sử dụng mô hình ngôn ngữ lớn **Qwen3** để phân tích tài liệu và tạo ra các công cụ học tập hiệu quả. Sinh viên chỉ cần upload bài giảng — hệ thống sẽ tự động tóm tắt, tạo sơ đồ tư duy trực quan, flashcard ghi nhớ và cho phép hỏi đáp trực tiếp với nội dung tài liệu.

🌐 **Live Demo**: [https://loveyuna.today](https://loveyuna.today)

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|:----------|:-------|
| 📄 **Upload đa định dạng** | PDF, DOCX, PPTX, XLSX, CSV, TXT, Markdown |
| 🧠 **Sơ đồ tư duy (Mindmap)** | Tự động phân tích nội dung → tạo mindmap tương tác bằng React Flow |
| 📇 **Flashcard thông minh** | Tạo thẻ ghi nhớ Active Recall với hiệu ứng lật (flip) |
| 💬 **Chat với tài liệu** | Hỏi đáp AI trực tiếp — hệ thống trả lời dựa trên nội dung bài giảng |
| 🔐 **Hệ thống xác thực** | Đăng ký / Đăng nhập với JWT, phân quyền User & Admin |
| 💎 **Gói đăng ký (Plans)** | Free / Basic / Pro / Unlimited — giới hạn upload & chat theo gói |
| 🛡️ **Admin Panel** | Quản lý người dùng, thay đổi gói, phân quyền, ban user/IP |
| 🎨 **6 Theme màu sắc** | Hồng, Tím, Xanh dương, Xanh lá, Cam vàng, Xanh ngọc — lưu tự động |
| 📱 **Responsive** | Giao diện tối ưu cho cả desktop và mobile |

---

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18.3** — UI library
- **Vite 5.4** — Build tool siêu nhanh
- **Tailwind CSS 3.4** — Utility-first CSS, hỗ trợ theme qua CSS Variables
- **React Flow** — Render sơ đồ tư duy tương tác
- **Lucide React** — Icon system
- **Axios** — HTTP client
- **React Markdown** — Render markdown trong chat AI

### Backend
- **Node.js + Express 4.21** — REST API server
- **SQLite** (better-sqlite3) — Database nhẹ, không cần setup riêng
- **JWT** (jsonwebtoken) — Xác thực token với thời hạn 1 ngày
- **bcryptjs** — Mã hóa mật khẩu
- **Multer** — Xử lý file upload (tối đa 50MB)

### AI & Document Processing
- **Qwen3-Max** — Mô hình ngôn ngữ lớn (via Alibaba DashScope API)
- **pdf-parse** — Trích xuất văn bản từ PDF
- **mammoth** — Đọc file DOCX
- **node-pptx-parser** — Đọc file PPTX
- **xlsx** — Đọc file Excel & CSV
- **JSZip** — Hỗ trợ giải nén file Office

### Deployment
- **Azure VPS** — Virtual Private Server
- **Nginx** — Reverse proxy + SSL termination
- **PM2** — Process manager cho Node.js
- **Certbot** — SSL/TLS certificate (Let's Encrypt)

---

## 📐 Kiến trúc hệ thống

```
┌─────────────┐     HTTPS      ┌─────────┐      Proxy       ┌──────────────┐
│   Browser    │ ─────────────► │  Nginx  │ ───────────────► │  Express API │
│  (React SPA) │ ◄───────────── │  + SSL  │ ◄─────────────── │  (Port 3001) │
└─────────────┘                 └─────────┘                  └──────┬───────┘
                                                                    │
                                            ┌───────────────────────┼──────────────────┐
                                            │                       │                  │
                                     ┌──────▼──────┐     ┌─────────▼────────┐  ┌───────▼──────┐
                                     │   SQLite    │     │  Qwen3-Max API   │  │  File Store  │
                                     │  (Users,    │     │  (DashScope)     │  │  (uploads/)  │
                                     │   Plans)    │     └──────────────────┘  └──────────────┘
                                     └─────────────┘
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- **Node.js** ≥ 18
- **npm** ≥ 9
- API Key từ [Alibaba DashScope](https://dashscope.aliyun.com/) hoặc Ollama local

### 1. Clone dự án

```bash
git clone https://github.com/your-username/NoteMinds.git
cd NoteMinds
```

### 2. Cài đặt dependencies

```bash
npm run install:all
```

### 3. Cấu hình API

Tạo file `server/.env`:

```env
# === Option A: Sử dụng DashScope (Recommended) ===
QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_API_KEY=your-dashscope-api-key
QWEN_MODEL=qwen3-max

# === Option B: Sử dụng Ollama local (Free) ===
# QWEN_API_BASE_URL=http://localhost:11434/v1
# QWEN_API_KEY=ollama
# QWEN_MODEL=qwen3

# Server port
PORT=3001
```

<details>
<summary>📋 Hướng dẫn lấy API Key DashScope</summary>

1. Truy cập [DashScope Console](https://dashscope.console.aliyun.com/)
2. Đăng ký tài khoản Alibaba Cloud
3. Vào **API Keys** → Tạo key mới
4. Copy key vào `QWEN_API_KEY` trong file `.env`
</details>

<details>
<summary>📋 Chạy với Ollama (miễn phí, offline)</summary>

```bash
# 1. Cài đặt Ollama: https://ollama.com
# 2. Pull model Qwen3
ollama pull qwen3

# 3. Ollama tự động serve tại localhost:11434
# 4. Dùng Option B trong .env
```
</details>

### 4. Chạy development server

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

### 5. Build production

```bash
npm run build    # Build frontend
npm start        # Start server (serves built frontend)
```

---

## 📁 Cấu trúc dự án

```
NoteMinds/
├── client/                          # 🎨 React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # Navigation + Theme picker
│   │   │   ├── Hero.jsx             # Landing hero section
│   │   │   ├── Dashboard.jsx        # Main dashboard (tabs)
│   │   │   ├── FileUpload.jsx       # Drag & drop upload
│   │   │   ├── MindmapView.jsx      # Interactive mindmap (React Flow)
│   │   │   ├── FlashcardView.jsx    # Flashcard với flip animation
│   │   │   ├── ChatView.jsx         # Chat AI với tài liệu
│   │   │   ├── MarkdownRenderer.jsx # Render markdown response
│   │   │   ├── UserDropdown.jsx     # User menu + Settings modal
│   │   │   ├── AdminPanel.jsx       # Admin management panel
│   │   │   ├── PricingPage.jsx      # Pricing plans page
│   │   │   └── ConfirmModal.jsx     # Reusable confirm dialog
│   │   ├── ThemeContext.jsx         # Theme system (6 themes)
│   │   ├── App.jsx                  # Root component + routing
│   │   ├── api.js                   # Axios API client
│   │   ├── main.jsx                 # Entry point + ThemeProvider
│   │   └── index.css                # Global styles + CSS variables
│   ├── tailwind.config.js           # Tailwind + theme color config
│   └── vite.config.js               # Vite configuration
│
├── server/                          # ⚙️ Express Backend
│   ├── services/
│   │   ├── qwenClient.js            # Qwen3 API client wrapper
│   │   ├── documentProcessor.js     # Multi-format document parser
│   │   ├── mindmapGenerator.js      # AI mindmap generation
│   │   ├── flashcardGenerator.js    # AI flashcard generation
│   │   ├── chatService.js           # AI chat with context
│   │   ├── authService.js           # Auth, JWT, plans, bans
│   │   └── jsonParser.js            # Robust JSON extraction
│   ├── index.js                     # Express server + routes
│   ├── .env                         # Environment variables
│   └── uploads/                     # Uploaded files storage
│
└── package.json                     # Monorepo workspace config
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/register` | Đăng ký tài khoản |
| `POST` | `/api/login` | Đăng nhập → JWT token |
| `PUT` | `/api/profile` | Cập nhật hồ sơ |
| `PUT` | `/api/change-password` | Đổi mật khẩu |

### Document Processing
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/api/upload` | Upload tài liệu (multipart) |
| `GET` | `/api/status/:id` | Kiểm tra trạng thái xử lý |
| `POST` | `/api/mindmap/:id` | Tạo sơ đồ tư duy |
| `POST` | `/api/flashcards/:id` | Tạo flashcard |
| `POST` | `/api/chat/:id` | Chat với tài liệu |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/api/admin/users` | Danh sách users |
| `PUT` | `/api/admin/set-plan` | Thay đổi gói user |
| `PUT` | `/api/admin/set-role` | Thay đổi role |
| `POST` | `/api/admin/ban-user` | Ban/unban user |
| `POST` | `/api/admin/ban-ip` | Ban/unban IP |

---

## 💎 Gói đăng ký

| | Free | Basic | Pro | Unlimited |
|:--|:----:|:-----:|:---:|:---------:|
| **Giá** | 0₫ | 49.000₫/th | 99.000₫/th | 199.000₫/th |
| **Upload/ngày** | 5 | 15 | 30 | ∞ |
| **Chat/tài liệu** | 10 tin | 25 tin | 50 tin | ∞ |
| **Kích thước file** | 10MB | 25MB | 50MB | ∞ |
| **Định dạng** | PDF, TXT | + DOCX, PPTX | + XLSX, CSV | Tất cả |

---

## 🎨 Hệ thống Theme

NoteMinds hỗ trợ 6 theme màu sắc, chuyển đổi real-time bằng CSS Custom Properties:

| Theme | Màu chính | Preview |
|:------|:----------|:--------|
| 🌸 Hồng | Rose / Coral | `#f43f5e` |
| 💜 Tím | Violet / Indigo | `#8b5cf6` |
| 💙 Xanh dương | Blue / Sky | `#3b82f6` |
| 💚 Xanh lá | Emerald / Green | `#10b981` |
| 🧡 Cam vàng | Amber / Orange | `#f59e0b` |
| 🩵 Xanh ngọc | Cyan / Teal | `#06b6d4` |

Theme được lưu vào `localStorage` và áp dụng ngay lập tức trên toàn bộ giao diện — bao gồm buttons, borders, gradients, shadows, mindmap nodes, flashcards, và tất cả UI elements.

---

## 📸 Screenshots

> *Thêm screenshots vào thư mục `docs/screenshots/` và cập nhật tại đây.*

<!--
![Home](docs/screenshots/home.png)
![Mindmap](docs/screenshots/mindmap.png)
![Flashcard](docs/screenshots/flashcard.png)
![Chat](docs/screenshots/chat.png)
-->

---

## 🚢 Deployment (Production)

<details>
<summary>Hướng dẫn deploy lên VPS với Nginx + PM2 + SSL</summary>

### 1. Build frontend
```bash
npm run build
cp -r client/dist/* server/public/
```

### 2. Cài đặt PM2
```bash
npm install -g pm2
cd server
pm2 start index.js --name notemind
pm2 save
pm2 startup
```

### 3. Cấu hình Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```
</details>

---

## 👥 Đội ngũ phát triển

**Đèn giao thông** — Đội thi

---

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.

---

<p align="center">
  Made with ❤️ by <strong>Đèn Giao Thông</strong>
  Project được triển khai bởi <strong>Tùng Lâm</strong>
</p>
