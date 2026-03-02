# 🚀 NoteMind Deployment Files

This directory contains all the configuration files needed to deploy NoteMind to a production server with Nginx, Cloudflare DDoS protection, and subdomain API architecture.

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `nginx.conf` | Nginx reverse proxy configuration for domain and api subdomain |
| `ecosystem.config.cjs` | PM2 process manager configuration |
| `setup-vps.sh` | Automated VPS setup script |
| `DEPLOYMENT.md` | Complete deployment guide with step-by-step instructions |
| `CLOUDFLARE.md` | Cloudflare configuration guide for DDoS protection |

---

## 🌐 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                       │
│            (DDoS Protection + SSL/TLS)                  │
└─────────────────┬───────────────────────┬───────────────┘
                  │                       │
        ┌─────────▼─────────┐   ┌────────▼──────────┐
        │  yourdomain.com   │   │ api.yourdomain.com│
        │    (Frontend)     │   │    (Backend API)  │
        └─────────┬─────────┘   └────────┬──────────┘
                  │                       │
        ┌─────────▼─────────────────────┬─▼──────────┐
        │         Nginx Reverse Proxy               │
        │  - SSL Termination                        │
        │  - Rate Limiting                          │
        │  - Static File Serving                    │
        │  - API Proxying                           │
        └─────────┬─────────────────────┬───────────┘
                  │                     │
        ┌─────────▼─────────┐   ┌───────▼───────────┐
        │  React App        │   │  Node.js API      │
        │  (Static Files)   │   │  (Port 3001)      │
        │  /dist            │   │  Managed by PM2   │
        └───────────────────┘   └───────────────────┘
```

---

## ⚡ Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# On your VPS (as root)
wget https://raw.githubusercontent.com/yourusername/NoteMind/main/deploy/setup-vps.sh
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

This will automatically:
- ✅ Install all dependencies (Node.js, Nginx, Certbot, PM2)
- ✅ Configure SSL certificates
- ✅ Set up Nginx with subdomain routing
- ✅ Build and deploy the application
- ✅ Configure firewall
- ✅ Start the backend with PM2

### Option 2: Manual Setup

Follow the detailed guide in [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🔧 Configuration

### 1. Update Domain in nginx.conf

```bash
sed -i 's/yourdomain.com/YOUR_DOMAIN/g' nginx.conf
```

### 2. Configure Environment Variables

Copy and edit server/.env:
```bash
cd ../server
cp ../.env.example .env
nano .env
```

Required variables:
- `DOMAIN=yourdomain.com`
- `FRONTEND_URL=https://yourdomain.com`
- `API_DOMAIN=https://api.yourdomain.com`
- `JWT_SECRET` (generate new)
- `ENCRYPTION_KEY` (generate new)
- `QWEN_API_KEY` (for AI features)

### 3. Build Frontend

```bash
cd ../client
npm install
npm run build
```

### 4. Start Backend

```bash
cd ../server
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

---

## ☁️ Cloudflare Setup

### Required DNS Records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_SERVER_IP | ☁️ On |
| A | api | YOUR_SERVER_IP | ☁️ On |
| A | www | YOUR_SERVER_IP | ☁️ On |

### Essential Settings

1. **SSL/TLS**: Set to "Full (strict)"
2. **Always Use HTTPS**: Enabled
3. **Bot Fight Mode**: Enabled
4. **HTTP/2 & HTTP/3**: Enabled

For detailed Cloudflare configuration, see [CLOUDFLARE.md](CLOUDFLARE.md)

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# Backend logs
pm2 logs notemind-api

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Monitor Performance

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Server resources
htop
```

### Update Application

```bash
cd /var/www/notemind
git pull origin main

# Update backend
cd server
npm install
pm2 restart notemind-api

# Update frontend
cd ../client
npm install
npm run build
```

---

## 🛡️ Security Features

### Nginx
- ✅ Rate limiting (API: 10 req/s, Uploads: 2 req/s)
- ✅ Cloudflare IP restoration
- ✅ Security headers
- ✅ SSL/TLS optimization

### Cloudflare
- ✅ DDoS protection (Layer 3, 4, 7)
- ✅ Bot mitigation
- ✅ WAF (Web Application Firewall)
- ✅ Rate limiting
- ✅ Geographic restrictions (optional)

### Application
- ✅ CORS configuration
- ✅ JWT authentication
- ✅ AES-256 encryption
- ✅ Input validation
- ✅ SQL injection protection

---

## 🔥 Troubleshooting

### Issue: API calls fail

**Check:**
```bash
# Is backend running?
pm2 status

# Check backend logs
pm2 logs notemind-api

# Test backend directly
curl http://localhost:3001/api/health
```

### Issue: 502 Bad Gateway

**Solutions:**
```bash
# Restart backend
pm2 restart notemind-api

# Check nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Issue: SSL errors

**Solutions:**
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Issue: Real IP not detected

**Solution:** Update Cloudflare IPs in nginx.conf
```bash
# Get latest IPs
curl https://www.cloudflare.com/ips-v4
curl https://www.cloudflare.com/ips-v6
```

---

## 📈 Performance Optimization

### Nginx Optimizations
- ✅ Gzip compression (level 6)
- ✅ Brotli support (via Cloudflare)
- ✅ Static file caching (1 year)
- ✅ HTTP/2 enabled
- ✅ Keep-alive connections

### Cloudflare Optimizations
- ✅ Asset minification (JS, CSS, HTML)
- ✅ Brotli compression
- ✅ HTTP/3 (QUIC)
- ✅ Early Hints
- ✅ Global CDN caching

### Application Optimizations
- ✅ PM2 cluster mode (optional)
- ✅ Database indexing
- ✅ Response caching
- ✅ Asset optimization

---

## 💾 Backup Recommendations

### Database Backup

```bash
# Create backup script
cat > /usr/local/bin/backup-notemind.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/notemind"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
sqlite3 /var/www/notemind/server/data/notemind.db ".backup '$BACKUP_DIR/notemind_$DATE.db'"
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-notemind.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-notemind.sh" | sudo crontab -
```

### Full Backup

```bash
# Backup entire application
tar -czf notemind_backup_$(date +%Y%m%d).tar.gz \
  -C /var/www \
  --exclude='notemind/node_modules' \
  --exclude='notemind/client/node_modules' \
  --exclude='notemind/server/node_modules' \
  notemind
```

---

## 📞 Support

- **Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Cloudflare Guide**: [CLOUDFLARE.md](CLOUDFLARE.md)
- **GitHub Issues**: [Your Repository]
- **Email**: support@yourdomain.com

---

## 📝 Checklist

### Pre-Deployment
- [ ] Domain registered and pointed to Cloudflare
- [ ] VPS/Server provisioned (2GB RAM minimum)
- [ ] SSL certificate method chosen (Let's Encrypt or Cloudflare Origin)
- [ ] API keys obtained (QWEN/OpenAI)

### Installation
- [ ] Dependencies installed (Node.js, Nginx, PM2)
- [ ] SSL certificates configured
- [ ] Nginx configuration updated with domain
- [ ] Environment variables configured
- [ ] Frontend built
- [ ] Backend started with PM2

### Cloudflare
- [ ] DNS records created (A records for @, api, www)
- [ ] Proxy enabled (orange cloud)
- [ ] SSL/TLS set to Full (strict)
- [ ] Security features enabled
- [ ] Caching configured

### Testing
- [ ] Frontend accessible at https://yourdomain.com
- [ ] API accessible at https://api.yourdomain.com
- [ ] SSL certificate valid (A+ on SSL Labs)
- [ ] API calls working from frontend
- [ ] File uploads working
- [ ] Admin panel accessible

### Security
- [ ] Firewall configured (UFW or cloud provider)
- [ ] Only ports 22, 80, 443 exposed
- [ ] SSH key-based authentication
- [ ] Generated new JWT_SECRET
- [ ] Generated new ENCRYPTION_KEY
- [ ] Cloudflare bot protection enabled
- [ ] Rate limiting configured

### Monitoring
- [ ] PM2 monitoring active
- [ ] Nginx logs accessible
- [ ] Cloudflare analytics enabled
- [ ] Backup script configured
- [ ] SSL auto-renewal tested

---

## 🎯 Performance Targets

- **Time to First Byte (TTFB)**: < 200ms
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **API Response Time**: < 100ms (non-AI endpoints)
- **Uptime**: > 99.9%
- **SSL Labs Rating**: A+
- **Security Headers Rating**: A+

---

Made with 🚀 for NoteMind
