# NoteMind - Encryption & Auto-Update Setup Guide

## Overview

This guide explains how to set up end-to-end encryption for all API requests/responses and configure automatic updates when pulling from GitHub.

## 📋 Features Added

1. **Request/Response Encryption**
   - All POST, PUT, PATCH API requests are automatically encrypted
   - Server decrypts incoming requests and encrypts responses
   - Client transparently handles encryption/decryption
   - Uses AES-256 encryption with random IVs

2. **Automatic Updates**
   - Scripts that pull from GitHub automatically
   - Install dependencies when `package.json` changes
   - Rebuild client application
   - Restart application via PM2
   - Create backups before updating
   - Available for both Linux (bash) and Windows (PowerShell)

---

## 🔐 Encryption Setup

### 1. Generate Encryption Key

Generate a secure 32-byte hex encryption key:

```bash
# On Linux/macOS
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# On Windows PowerShell
node -e "[Convert]::ToHexString((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))"
```

Example output:
```
a7f8c2d9e4b1f6a3c8d2e9f4a7b1c8d5e2f9a4b7c1d8e5f2a9b3c6d9e2f5a8
```

### 2. Configure Environment

1. Create `.env` file in the server directory from `.env.example`:
   ```bash
   cp .env.example server/.env
   ```

2. Add your encryption key to `server/.env`:
   ```env
   ENCRYPTION_KEY=a7f8c2d9e4b1f6a3c8d2e9f4a7b1c8d5e2f9a4b7c1d8e5f2a9b3c6d9e2f5a8
   ```

3. Add the same key to `client/.env` (for Vite):
   ```env
   VITE_ENCRYPTION_KEY=a7f8c2d9e4b1f6a3c8d2e9f4a7b1c8d5e2f9a4b7c1d8e5f2a9b3c6d9e2f5a8
   ```

### 3. Install Dependencies

```bash
# Install new encryption libraries
npm run install:all

# Or manually:
cd server && npm install
cd ../client && npm install
```

### 4. Test Encryption

Start the development server and monitor the console:

```bash
npm run dev
```

You should see logs like:
```
[Encryption] Decrypted request to /api/auth/login
```

---

## 🔄 Auto-Update Setup

### Linux/macOS Setup

1. **Make script executable:**
   ```bash
   chmod +x update-auto.sh
   ```

2. **Configure Git:**
   ```bash
   # Set the repository URL
   git remote set-url origin https://github.com/yourusername/NoteMind.git
   git branch main
   ```

3. **Manual Update:**
   ```bash
   bash update-auto.sh
   ```

4. **Check for Updates Only:**
   ```bash
   bash update-auto.sh --check
   ```

5. **Schedule with Cron (Optional):**
   
   Edit your crontab:
   ```bash
   crontab -e
   ```
   
   Add one of these:
   ```bash
   # Update every 30 minutes
   */30 * * * * cd /opt/notemind && bash update-auto.sh --scheduled >> /var/log/notemind-update.log 2>&1
   
   # Update daily at 2 AM
   0 2 * * * cd /opt/notemind && bash update-auto.sh --scheduled >> /var/log/notemind-update.log 2>&1
   
   # Update every 6 hours
   0 */6 * * * cd /opt/notemind && bash update-auto.sh --scheduled >> /var/log/notemind-update.log 2>&1
   ```

### Windows PowerShell Setup

1. **Allow Script Execution:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Run Update Manually:**
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File update-auto.ps1
   ```

3. **Schedule with Task Scheduler:**
   
   a. Open Task Scheduler (search "Task Scheduler" in Start menu)
   
   b. Click "Create Basic Task"
   
   c. Set up the task:
      - **Name:** NoteMind Auto-Update
      - **Description:** Automatically update NoteMind from GitHub
      - **Trigger:** Choose your schedule (Daily, Hourly, etc.)
      - **Action:** 
        - **Program:** `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
        - **Arguments:** `-ExecutionPolicy Bypass -File "C:\path\to\NoteMind\update-auto.ps1"`
        - **Start in:** `C:\path\to\NoteMind`

### What the Update Script Does

1. ✅ Fetches latest changes from GitHub
2. ✅ Checks for updates
3. ✅ Creates backup of configuration files
4. ✅ Pulls latest code
5. ✅ Detects `package.json` changes
6. ✅ Installs new dependencies automatically
7. ✅ Rebuilds client application
8. ✅ Restarts application via PM2
9. ✅ Logs all actions to file

---

## 🛡️ Security Best Practices

### Encryption Key Management

1. **Never commit `.env` to Git:**
   ```bash
   echo ".env" >> .gitignore
   echo "*.local" >> .gitignore
   ```

2. **Use strong keys** - Generate 32-byte random keys

3. **Rotate keys periodically:**
   - Generate new key
   - Update in `.env` and `.env.example`
   - Redeploy application
   - Old encrypted data won't be readable (plan accordingly)

4. **Production Deployment:**
   - Set `ENCRYPTION_KEY` via environment variables, not in `.env`
   - Use secrets management tools (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Never expose keys in logs or version control

### Auto-Update Safety

1. **Backups are created** before each update in `backups/` directory
2. **Review changes** before pulling:
   ```bash
   git log --oneline origin/main..main
   git diff origin/main
   ```

3. **Test updates** in development first:
   ```bash
   git checkout -b test-update
   git pull origin main
   npm run dev
   ```

4. **Keep backups** for at least 30 days

---

## 📊 Monitoring & Logs

### Encryption Logs

Server logs will show:
```
[Encryption] Decrypted request to /api/documents/docId/chat
[Encryption] Response encryption applied
```

Watch real-time logs:
```bash
# On Linux/macOS
npm run dev:server

# Or with PM2
pm2 logs notemind
```

### Update Logs

**Linux/macOS:**
```bash
tail -f /var/log/notemind-update.log
```

**Windows:**
```powershell
Get-Content -Path "$AppDir\logs\update-*.log" -Tail 20 -Wait
```

---

## 🔧 Troubleshooting

### Encryption Issues

**Problem:** "Decryption failed" error
- **Solution:** Ensure `ENCRYPTION_KEY` matches between client and server

**Problem:** Requests not being encrypted
- **Solution:** Check browser console for errors, ensure `crypto-js` is installed

### Update Issues

**Problem:** Git pull fails
- **Solution:** Ensure git is installed and repository URL is correct

**Problem:** Dependencies won't install
- **Solution:** Check npm/node version with `node -v` && `npm -v`

**Problem:** PM2 restart fails
- **Solution:** Check PM2 status with `pm2 list` and manually restart if needed:
  ```bash
  pm2 kill
  pm2 start server/index.js --name notemind
  pm2 save
  ```

---

## 📱 Client-Side Implementation

The client API automatically handles encryption:

```javascript
import { register, login, chatWithDocument } from './api.js';

// No changes needed! Encryption is transparent:
const user = await register(username, email, password, displayName);
const response = await chatWithDocument(docId, message, history);

// Data is automatically encrypted before sending
// and decrypted when received
```

---

## 🚀 Deployment Checklist

- [ ] Generate and secure encryption key
- [ ] Set `ENCRYPTION_KEY` in server `.env`
- [ ] Install dependencies: `npm run install:all`
- [ ] Test encryption in development
- [ ] Set up Git repository for auto-updates
- [ ] Configure PM2 for process management
- [ ] Schedule auto-update cron job or Task Scheduler
- [ ] Set up log rotation for update logs
- [ ] Test update process in staging environment
- [ ] Monitor first production update

---

## 📞 Support

For issues or questions:
1. Check logs in `/var/log/notemind-update.log` (Linux) or `logs/` folder (Windows)
2. Review this documentation
3. Check GitHub issues if using a public repository
4. Review encryption configuration in `.env`

---

**Last Updated:** 2024-12-21
**Version:** 1.0.0
