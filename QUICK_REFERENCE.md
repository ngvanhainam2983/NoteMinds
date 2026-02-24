# NoteMind Quick Reference Guide

## 🎯 Quick Start (5 Minutes)

### Install & Setup
```bash
# 1. Install dependencies
npm run install:all

# 2. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Configure server
cp .env.example server/.env
# Edit server/.env and paste your encryption key

# 4. Start development
npm run dev
```

---

## 🔐 Encryption - For Developers

### Automatic (No Code Changes Needed!)

The client API automatically encrypts/decrypts everything:

```javascript
// These requests are automatically encrypted:
await register(username, email, password);
await login(email, password);
await chatWithDocument(docId, message);
await updateProfile(displayName, email);
```

### Manual Encryption (If Needed)

```javascript
import { encryptDataForServer, decryptDataFromServer } from './encryptionService.js';

// Encrypt data
const encrypted = encryptDataForServer({
  username: 'john',
  email: 'john@example.com'
});
// Returns: { encrypted: "...", iv: "..." }

// Decrypt response
const data = decryptDataFromServer({
  encrypted: "...",
  iv: "..."
});
```

---

## 🔄 Auto-Updates - For DevOps

### Linux/macOS

```bash
# Manual update - pulls from GitHub
bash update-auto.sh

# Check for updates only
bash update-auto.sh --check

# Schedule (add to crontab)
0 2 * * * cd /opt/notemind && bash update-auto.sh --scheduled
```

### Windows

```powershell
# Manual update
powershell.exe -ExecutionPolicy Bypass -File update-auto.ps1

# Schedule via Task Scheduler (GUI)
# Program: C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
# Arguments: -ExecutionPolicy Bypass -File "C:\path\to\update-auto.ps1"
```

---

## 🛠️ Common Tasks

### Generate New Encryption Key

```bash
# Linux/macOS
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell
node -e "[Convert]::ToHexString((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))"
```

### Check Update Logs

**Linux:**
```bash
tail -f /var/log/notemind-update.log
```

**Windows:**
```powershell
Get-Content -Path "logs\*-update.log" -Tail 20
```

### View Encryption in Action

Start server and watch console:
```bash
npm run dev:server
```

Look for messages like:
```
[Encryption] Decrypted request to /api/auth/login
```

### Manually Restart Application

```bash
# With PM2
pm2 restart notemind

# Or view all PM2 apps
pm2 list

# Stop all apps
pm2 kill
```

---

## 📋 Checklist: First-Time Setup

- [ ] Install dependencies: `npm run install:all`
- [ ] Generate encryption key
- [ ] Create `server/.env` from `.env.example`
- [ ] Add `ENCRYPTION_KEY` to `server/.env`
- [ ] Test with `npm run dev`
- [ ] See encryption logs in console
- [ ] Stage to GitHub
- [ ] Run `bash update-auto.sh --check` to test update script
- [ ] Configure cron/Task Scheduler for auto-updates
- [ ] Deploy to production

---

## 🚨 Important Security Notes

1. **Never commit `.env` to Git:**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Encryption key should be:**
   - 32 bytes (256 bits)
   - Randomly generated
   - Different for each environment
   - Stored as environment variable, not in code

3. **Always use HTTPS in production:**
   - Encryption is app-level (compliments TLS)
   - Both encryption layers together = maximum security

4. **Rotate keys periodically:**
   - Old encrypted data won't decrypt with new key
   - Plan ahead before rotating

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Decryption failed | Check `ENCRYPTION_KEY` matches server & client |
| Update script fails | Ensure git is installed: `git --version` |
| PM2 not found | Install: `npm install -g pm2` |
| npm install errors | Clear cache: `npm cache clean --force` |
| Port already in use | Change `PORT` in `.env` or kill process |
| File not found | Run from app root directory |

---

## 📚 Full Documentation

- **Detailed Setup:** See `ENCRYPTION_AND_UPDATES.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Environment Config:** See `.env.example`

---

## 🔗 Useful Commands

```bash
# Development
npm run dev              # Start both server and client
npm run dev:server      # Start server only
npm run dev:client      # Start client only
npm run build            # Build for production

# Dependencies
npm run install:all     # Install all dependencies

# PM2 Management
pm2 start server/index.js --name notemind
pm2 stop notemind
pm2 restart notemind
pm2 logs notemind
pm2 kill

# Git & Updates
git status              # Check changes
git log --oneline       # View commits
bash update-auto.sh     # Run update
```

---

## 📞 Emergency Operations

### Restore from Backup
```bash
# Backup location: backups/backup-YYYYMMDD-HHMMSS/
# Restore important files (package.json, etc.)
cp backups/backup-20240101-100000/package.json ./

# Reinstall if needed
npm install
```

### Rollback Update
```bash
# View recent commits
git log --oneline -n 10

# Rollback to previous version
git revert <commit-hash>
git push origin main

# Run update script to pull reverted code
bash update-auto.sh
```

### Force Restart
```bash
pm2 kill
pm2 start server/index.js --name notemind
pm2 save
```

---

**Last Updated:** February 2024
**For help:** See ENCRYPTION_AND_UPDATES.md
