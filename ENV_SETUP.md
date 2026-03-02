# 🔐 Environment Configuration Guide

NoteMind uses environment variables for configuration across different parts of the application. This guide explains how to set up your environment files correctly.

---

## 📁 Environment File Locations

```
NoteMind/
├── .env.example              # ← Root: General reference (use server or client specific)
├── server/
│   └── .env.example          # ← Server: Backend configuration (REQUIRED)
└── client/
    └── .env.example          # ← Client: Frontend configuration (OPTIONAL)
```

---

## 🚀 Quick Setup

### For Local Development

```bash
# 1. Set up server environment (REQUIRED)
cd server
cp .env.example .env
nano .env  # Edit with your values

# 2. Set up client environment (OPTIONAL)
cd ../client
cp .env.example .env
# Client works with defaults, only edit if needed

# 3. Start development
cd ../server && npm run dev
cd ../client && npm run dev
```

### For Production Deployment

```bash
# Server environment (on VPS)
cd /var/www/notemind/server
cp .env.example .env
nano .env

# Update these REQUIRED values:
# - DOMAIN=yourdomain.com
# - FRONTEND_URL=https://yourdomain.com
# - API_DOMAIN=https://api.yourdomain.com
# - JWT_SECRET=<generate-new>
# - ENCRYPTION_KEY=<generate-new>
# - QWEN_API_KEY=<your-api-key>
# - NODE_ENV=production

# Client environment (build time)
cd ../client
# If you need custom encryption key:
cp .env.example .env
nano .env
# Update VITE_ENCRYPTION_KEY to match server's ENCRYPTION_KEY

npm run build
```

---

## 📋 File Descriptions

### 🔹 Root: `.env.example`

**Purpose**: General reference template

**Usage**: 
- Reference document showing all available options
- Copy to `server/.env` for actual use
- Contains comments and documentation

**Note**: This is a **reference only**. The actual environment files should be in `server/.env` and optionally `client/.env`.

---

### 🔹 Server: `server/.env.example`

**Purpose**: Backend API server configuration

**Location**: `server/.env.example` → `server/.env`

**Required Variables**:
```env
# Essential
PORT=3001
NODE_ENV=production
QWEN_API_KEY=sk-your-api-key-here
JWT_SECRET=<32+ char random string>
ENCRYPTION_KEY=<64 char hex string>

# Production Deployment
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
API_DOMAIN=https://api.yourdomain.com
```

**Optional Variables**:
```env
# Email (for verification, password reset)
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASSWORD=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com

# Cloudflare Turnstile (bot protection)
TURNSTILE_SECRET=your-turnstile-secret
```

**Generate Secure Keys**:
```bash
# JWT Secret (any 32+ characters)
openssl rand -base64 32

# Encryption Key (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 🔹 Client: `client/.env.example`

**Purpose**: Frontend build-time configuration

**Location**: `client/.env.example` → `client/.env`

**When to Use**:
- ✅ When you need custom API URL override
- ✅ When using different encryption key than server
- ✅ When enabling/disabling frontend features
- ❌ Not needed for basic development (auto-detection works)

**Variables**:
```env
# API URL (auto-detected if not set)
VITE_API_URL=

# Encryption key (must match server)
VITE_ENCRYPTION_KEY=<same-as-server-ENCRYPTION_KEY>
```

**Important Notes**:
- ⚠️ **All VITE_ variables are PUBLIC** (embedded in client bundle)
- ⚠️ **Never put secrets** in client environment variables
- 🔄 Requires rebuild after changes (`npm run build`)
- 🔧 Dev server needs restart after changes (`npm run dev`)

---

## 🔑 Environment Variables Reference

### Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `DOMAIN` | Production | - | Main domain (e.g., yourdomain.com) |
| `FRONTEND_URL` | Production | localhost:5173 | Frontend URL for CORS |
| `API_DOMAIN` | Production | localhost:3001 | API URL for share links |
| `JWT_SECRET` | **Yes** | - | JWT signing key (32+ chars) |
| `ENCRYPTION_KEY` | **Yes** | - | AES-256 key (64 hex chars) |
| `QWEN_API_KEY` | **Yes** | - | AI model API key |
| `EMAIL_HOST` | No | - | SMTP server host |
| `EMAIL_PORT` | No | - | SMTP server port |
| `EMAIL_USER` | No | - | SMTP username |
| `EMAIL_PASSWORD` | No | - | SMTP password |
| `TURNSTILE_SECRET` | No | - | Cloudflare Turnstile secret |

### Client Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | Auto-detect | Override API base URL |
| `VITE_ENCRYPTION_KEY` | Production | - | Must match server key |

---

## 🔒 Security Best Practices

### ✅ DO

- ✅ Generate **unique** secrets for production
- ✅ Use different secrets for dev/staging/production
- ✅ Store production `.env` files securely (password manager, vault)
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Use environment variables on hosting platforms
- ✅ Rotate secrets regularly (JWT_SECRET, ENCRYPTION_KEY)
- ✅ Use strong passwords for ADMIN_PASSWORD
- ✅ Keep `.env.example` files updated as reference

### ❌ DON'T

- ❌ **Never** commit `.env` files to Git
- ❌ **Never** share `.env` files publicly
- ❌ **Never** use example/default values in production
- ❌ **Never** put secrets in client environment variables
- ❌ **Never** hardcode secrets in source code
- ❌ **Never** use same secrets across environments

---

## 🔄 Environment Variable Priority

### Server (Node.js)

1. System environment variables (highest priority)
2. `.env` file
3. Default values in code
4. Fallback values

### Client (Vite)

1. `.env.production` (production build)
2. `.env.development` (dev mode)
3. `.env` (all modes)
4. Default values in code

---

## 🐛 Troubleshooting

### Problem: "JWT_SECRET is not defined"

**Solution**: 
```bash
cd server
# Ensure .env file exists
ls -la .env

# Check if JWT_SECRET is set
cat .env | grep JWT_SECRET

# If missing, add it
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

### Problem: "CORS error" in production

**Solution**: Check server `.env`:
```env
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com  # Must match exactly
```

### Problem: Client can't connect to API

**Solution**: 
1. Check if backend is running: `curl http://localhost:3001/api/health`
2. Check client API detection in browser console
3. Override if needed: `VITE_API_URL=http://localhost:3001/api` in `client/.env`

### Problem: "Encryption key mismatch"

**Solution**: Ensure **exact same** value in both:
- `server/.env` → `ENCRYPTION_KEY=xxx`
- `client/.env` → `VITE_ENCRYPTION_KEY=xxx`

---

## 📦 Deployment Checklist

### Before Deploying

- [ ] Created `server/.env` from template
- [ ] Generated unique `JWT_SECRET`
- [ ] Generated unique `ENCRYPTION_KEY`
- [ ] Added `QWEN_API_KEY` (or configured Ollama)
- [ ] Set `NODE_ENV=production`
- [ ] Updated `DOMAIN`, `FRONTEND_URL`, `API_DOMAIN`
- [ ] Configured email settings (if using email features)
- [ ] Created `client/.env` if using custom config
- [ ] Ensured `VITE_ENCRYPTION_KEY` matches server
- [ ] Tested locally before deploying

### After Deploying

- [ ] Verified environment variables loaded (check logs)
- [ ] Tested API health endpoint
- [ ] Tested frontend loads correctly
- [ ] Tested login/registration works
- [ ] Tested file upload works
- [ ] Checked CORS allows requests
- [ ] Verified SSL/HTTPS works
- [ ] Secured `.env` files (600 permissions)

---

## 📚 Additional Resources

- **Server Setup**: See `server/README.md`
- **Client Setup**: See `client/README.md`
- **Deployment**: See `deploy/DEPLOYMENT.md`
- **Cloudflare**: See `deploy/CLOUDFLARE.md`

---

## 🆘 Need Help?

1. Check this guide first
2. Review `.env.example` files for comments
3. Check server logs: `pm2 logs` or `npm run dev`
4. Check browser console for client errors
5. Verify environment variables loaded: Add console.log in code

---

Made with 🔐 for NoteMind
