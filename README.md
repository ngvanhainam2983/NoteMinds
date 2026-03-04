# NoteMind

> Nền tảng học tập thông minh: ghi chú, AI chat, flashcard, quiz, mindmap, theo dõi tiến độ và cộng đồng học tập trong một hệ thống full-stack.

## ⚠️ Tuyên bố bản quyền & quyền sử dụng

**Dự án này KHÔNG phải mã nguồn mở (NOT open-source).**  
Mã nguồn chỉ được dùng nội bộ và chỉ nhằm mục đích **chứng minh tôi là maintainer/chủ sở hữu dự án**.  
Mọi hành vi sao chép, tái phân phối, chỉnh sửa, thương mại hóa hoặc sử dụng lại khi chưa có cho phép bằng văn bản đều **không được phép**.

---

## ✨ Tổng quan

NoteMind là ứng dụng web full-stack giúp người học chuyển tài liệu thành kiến thức có cấu trúc và dễ ôn tập:

- Ghi chú + AI hỗ trợ học tập theo ngữ cảnh
- Tạo Flashcard / Quiz / Mindmap tự động
- Upload tài liệu đa định dạng (PDF, DOCX, PPTX, XLSX, OCR)
- Theo dõi hiệu suất học tập, lịch sử và bảng xếp hạng
- Hỗ trợ tính năng cộng đồng, hồ sơ công khai, chia sẻ tài liệu
- Bảo mật với JWT, mã hóa dữ liệu và các lớp middleware bảo vệ

---

## 🧱 Kiến trúc dự án

Monorepo gồm 2 phần chính:

- `client/`: React + Vite + Tailwind (giao diện người dùng)
- `server/`: Node.js + Express + SQLite (API, xử lý tài liệu, AI services)

Các thành phần triển khai:

- `Dockerfile`, `docker-compose.yml`: chạy bằng container
- `deploy/`: cấu hình Nginx/PM2 và script deploy VPS
- `ENV_SETUP.md`: hướng dẫn cấu hình môi trường chi tiết

---

## 🛠️ Công nghệ chính

- Frontend: React 18, Vite 5, Tailwind CSS
- Backend: Node.js (ESM), Express 4
- Database: better-sqlite3
- AI & tài liệu: OpenAI SDK, OCR (Tesseract), xử lý PDF/DOCX/PPTX/XLSX
- Auth/Bảo mật: JWT, bcrypt, WebAuthn, encryption service

---

## 🚀 Chạy local nhanh

### 1) Cài dependencies

```bash
npm run install:all
```

### 2) Cấu hình môi trường

Xem hướng dẫn đầy đủ tại `ENV_SETUP.md`.

Tối thiểu cần tạo file:

- `server/.env` (bắt buộc)
- `client/.env` (bắt buộc)

Bạn có thể bắt đầu bằng cách copy từ `.env.example` tương ứng.

### 3) Chạy development

```bash
npm run dev
```

- Frontend mặc định: `http://localhost:5173`
- Backend mặc định: `http://localhost:3001`

---

## 📜 Scripts chính (root)

- `npm run dev`: chạy đồng thời client + server
- `npm run dev:client`: chạy Vite frontend
- `npm run dev:server`: chạy backend với watch mode
- `npm run build`: build frontend production
- `npm run start`: chạy backend production
- `npm run install:all`: cài dependencies toàn bộ workspace

---

## 🐳 Docker (tuỳ chọn)

Dự án có sẵn `Dockerfile` và `docker-compose.yml`.  
Bạn có thể dùng Docker để chuẩn hóa môi trường chạy/staging theo hạ tầng hiện tại.

---

## 🔐 Lưu ý bảo mật

- Không commit file `.env`
- Luôn thay `JWT_SECRET`, `ENCRYPTION_KEY`, `QWEN_API_KEY` bằng giá trị thực
- Không đặt secret trong biến `VITE_*` phía client
- Dùng biến môi trường riêng cho dev/staging/production

---

## 👤 Maintainer

**Tài liệu README này xác nhận dự án NoteMind là tài sản riêng, không open-source, và được duy trì bởi maintainer/chủ sở hữu hợp pháp.**

Nếu bạn cần quyền truy cập, quyền sử dụng hoặc hợp tác, vui lòng liên hệ trực tiếp maintainer.

<center>
  <p>Được phát triển bởi đội Đèn Giao Thông</p>
</center>
