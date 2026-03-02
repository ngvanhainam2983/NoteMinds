# 🎨 Client Environment Setup

Quick reference for frontend environment configuration.

## 📝 Setup Instructions

```bash
# For most cases, you DON'T need a .env file
# The client auto-detects API URL based on environment

# Only create .env if you need to:
# - Override API URL
# - Use custom encryption key
# - Enable/disable specific features

# 1. Copy template (optional)
cp .env.example .env

# 2. Edit if needed
nano .env

# 3. Important: VITE_ENCRYPTION_KEY must match server's ENCRYPTION_KEY
```

## ⚙️ Environment Variables

### Auto-Detection (Default - Recommended)

The client automatically detects the correct API URL:
- **Development**: Uses `/api` → proxied to `http://localhost:3001`
- **Production**: Uses `https://api.yourdomain.com`

### Manual Override (Optional)

If you need to override:

```env
# Force specific API URL (not recommended)
VITE_API_URL=http://localhost:3001/api

# Encryption key (must match server)
VITE_ENCRYPTION_KEY=0123456789abcdef...
```

## 🚨 Security Reminders

- ⚠️ **All VITE_ variables are PUBLIC** (visible in browser)
- ⚠️ **NEVER put secrets** in client .env
- ⚠️ Variables are embedded at **build time** (not runtime)
- 🔄 Changes require dev server restart or rebuild

## 🔄 When to Restart

After changing `.env` file:

```bash
# Development
npm run dev  # Stop and restart

# Production
npm run build  # Rebuild bundle
```

## 📚 Full Documentation

See `/ENV_SETUP.md` in the root folder for complete guide.

## 💡 Tips

- Leave `.env` empty for local development
- Only configure for production builds if needed
- Check browser console to verify detected API URL
- Use browser DevTools → Network tab to confirm API calls
