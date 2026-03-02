# 🚀 NoteMind Deployment Guide
## Nginx + Cloudflare + Subdomain API Setup

This guide will help you deploy NoteMind with:
- **Main domain**: `yourdomain.com` → Frontend
- **API subdomain**: `api.yourdomain.com` → Backend
- **Cloudflare**: DDoS protection & CDN
- **Nginx**: Reverse proxy & SSL termination

---

## 📋 Prerequisites

- VPS/Server with Ubuntu 20.04+ (2GB RAM minimum)
- Domain name with DNS access
- Cloudflare account (free tier is fine)

---

## 🌐 Step 1: Cloudflare Setup

### 1.1 Add Your Domain to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site"
3. Enter your domain name
4. Choose FREE plan
5. Update your domain's nameservers to Cloudflare's

### 1.2 DNS Configuration

Add the following DNS records in Cloudflare:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | Your_Server_IP | Proxied (orange cloud) | Auto |
| A | api | Your_Server_IP | Proxied (orange cloud) | Auto |
| A | www | Your_Server_IP | Proxied (orange cloud) | Auto |

### 1.3 SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to **Full (strict)** or **Full**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

### 1.4 Security Settings (Optional but Recommended)

1. **Firewall Rules**:
   - Go to **Security** → **WAF**
   - Enable Bot Fight Mode (free)
   - Enable Browser Integrity Check

2. **Rate Limiting** (for extra protection):
   - Go to **Security** → **WAF** → **Rate limiting rules**
   - Create rule: Block requests > 20/minute per IP

---

## 🖥️ Step 2: Server Setup

### 2.1 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install Git & PM2
sudo npm install -g pm2
sudo apt install -y git
```

### 2.2 Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/yourusername/NoteMind.git notemind
cd notemind
sudo chown -R $USER:$USER /var/www/notemind
```

---

## 🔧 Step 3: Application Configuration

### 3.1 Backend Setup

```bash
cd /var/www/notemind/server

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env
nano .env
```

Update these values in `.env`:

```env
NODE_ENV=production
PORT=3001

# Domain Configuration
DOMAIN=yourdomain.com
FRONTEND_URL=https://yourdomain.com
API_DOMAIN=https://api.yourdomain.com

# Security (GENERATE NEW VALUES!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
ENCRYPTION_KEY=<generated-with-command-below>

# AI API (choose one)
QWEN_API_KEY=sk-your-dashscope-api-key

# Email (optional)
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USER=resend
EMAIL_PASSWORD=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.2 Frontend Build

```bash
cd /var/www/notemind/client

# Install dependencies
npm install

# Build for production
npm run build
```

The built files will be in `/var/www/notemind/client/dist`

### 3.3 Start Backend with PM2

```bash
cd /var/www/notemind/server
pm2 start index.js --name notemind-api
pm2 save
pm2 startup
```

---

## 🔐 Step 4: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificate for both domain and subdomain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Start nginx
sudo systemctl start nginx
```

### Option B: Cloudflare Origin Certificate

1. Go to Cloudflare → **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Select both hostnames: `yourdomain.com`, `*.yourdomain.com`
4. Save the certificate and private key:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/cert.pem  # Paste certificate
sudo nano /etc/ssl/cloudflare/key.pem   # Paste private key
sudo chmod 600 /etc/ssl/cloudflare/key.pem
```

Update nginx.conf SSL paths:
```nginx
ssl_certificate /etc/ssl/cloudflare/cert.pem;
ssl_certificate_key /etc/ssl/cloudflare/key.pem;
```

---

## 🌍 Step 5: Nginx Configuration

### 5.1 Update Domain in nginx.conf

```bash
cd /var/www/notemind/deploy
nano nginx.conf
```

Replace all instances of `yourdomain.com` with your actual domain.

### 5.2 Install Nginx Config

```bash
# Backup default config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Link NoteMind config
sudo ln -sf /var/www/notemind/deploy/nginx.conf /etc/nginx/sites-available/notemind
sudo ln -sf /etc/nginx/sites-available/notemind /etc/nginx/sites-enabled/

# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## ✅ Step 6: Verify Deployment

### 6.1 Check Backend

```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}
```

### 6.2 Check Frontend

Visit `https://yourdomain.com` in your browser

### 6.3 Check API Subdomain

```bash
curl https://api.yourdomain.com/api/health
# Should return: {"status":"ok"}
```

### 6.4 Test in Browser DevTools

1. Open `https://yourdomain.com`
2. Open browser DevTools → Network tab
3. Try uploading a document
4. Verify API calls go to `api.yourdomain.com`

---

## 🔄 Step 7: Auto-Updates (Optional)

Create update script:

```bash
nano /var/www/notemind/update.sh
```

```bash
#!/bin/bash
cd /var/www/notemind

# Pull latest changes
git pull origin main

# Update backend
cd server
npm install
pm2 restart notemind-api

# Update frontend
cd ../client
npm install
npm run build

echo "✅ Update complete!"
```

Make executable:
```bash
chmod +x /var/www/notemind/update.sh
```

---

## 🛡️ Security Checklist

- [ ] Changed all default passwords in `.env`
- [ ] Generated new `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Enabled Cloudflare proxy (orange cloud)
- [ ] SSL/TLS set to "Full (strict)"
- [ ] Firewall configured (ufw or cloud provider)
- [ ] PM2 running as non-root user
- [ ] Database backups configured
- [ ] Rate limiting enabled in Cloudflare
- [ ] Bot protection enabled

---

## 📊 Monitoring

### View Backend Logs
```bash
pm2 logs notemind-api
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor Performance
```bash
pm2 monit
```

---

## 🔥 Troubleshooting

### Issue: API calls fail with CORS error

**Solution**: Check CORS settings in `server/index.js` and ensure `FRONTEND_URL` matches exactly.

### Issue: 502 Bad Gateway

**Solution**: 
```bash
# Check if backend is running
pm2 status

# Restart backend
pm2 restart notemind-api

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: SSL certificate errors

**Solution**: 
```bash
# Verify certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew --dry-run
```

### Issue: Can't get real client IP

**Solution**: Ensure Cloudflare IP ranges are up to date in nginx.conf:
```bash
# Update Cloudflare IPs
wget https://www.cloudflare.com/ips-v4 -O /tmp/cf-ips-v4.txt
```

---

## 🎯 Performance Optimization

### Enable Cloudflare Caching

1. Go to **Caching** → **Configuration**
2. Set caching level to **Standard**
3. Create page rules for static assets:
   - `yourdomain.com/assets/*` → Cache Everything

### Enable Brotli Compression

In Cloudflare: **Speed** → **Optimization** → Enable Brotli

### Database Optimization

```bash
# Vacuum database monthly
sqlite3 /var/www/notemind/server/data/notemind.db "VACUUM;"
```

---

## 📞 Support

- GitHub Issues: [Your Repo Issues]
- Documentation: [Your Docs]

---

## 📝 Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | https://yourdomain.com | React SPA |
| API | https://api.yourdomain.com | Backend REST API |
| Admin | https://yourdomain.com/admin | Admin panel |

**Server Locations:**
- Application: `/var/www/notemind`
- Nginx config: `/etc/nginx/sites-available/notemind`
- SSL certs: `/etc/letsencrypt/live/yourdomain.com`
- Logs: `/var/www/notemind/server/logs`

---

Made with ❤️ for NoteMind
