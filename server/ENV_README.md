# 🔧 Server Environment Setup

Quick reference for backend environment configuration.

## 📝 Setup Instructions

```bash
# 1. Copy template
cp .env.example .env

# 2. Generate secure keys
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# 3. Edit .env file
nano .env

# 4. Required values to update:
# - QWEN_API_KEY (get from https://dashscope.console.aliyun.com/)
# - JWT_SECRET (use generated value above)
# - ENCRYPTION_KEY (use generated value above)

# 5. Optional: Email configuration
# - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD

# 6. For production: Update deployment URLs
# - DOMAIN=yourdomain.com
# - FRONTEND_URL=https://yourdomain.com
# - API_DOMAIN=https://api.yourdomain.com
# - NODE_ENV=production
```

## 🚨 Security Reminders

- ⚠️ **NEVER commit .env file to Git** (already in .gitignore)
- 🔐 Always generate NEW secrets for production
- 🔄 Use different secrets for dev/staging/production
- 📝 Store production .env securely (password manager)

## 📚 Full Documentation

See `/ENV_SETUP.md` in the root folder for complete guide.
