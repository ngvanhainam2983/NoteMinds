# ☁️ Cloudflare Configuration Guide for NoteMind

This guide covers Cloudflare settings for optimal performance, security, and DDoS protection.

---

## 🎯 Quick Setup Checklist

- [ ] Domain added to Cloudflare
- [ ] Nameservers updated
- [ ] DNS records configured
- [ ] SSL/TLS set to Full (strict)
- [ ] Bot protection enabled
- [ ] Rate limiting configured
- [ ] Caching rules set up

---

## 1️⃣ DNS Configuration

### Required DNS Records

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | YOUR_SERVER_IP | ☁️ Proxied | Auto |
| A | api | YOUR_SERVER_IP | ☁️ Proxied | Auto |
| A | www | YOUR_SERVER_IP | ☁️ Proxied | Auto |

> **Important**: Enable Cloudflare proxy (orange cloud ☁️) for DDoS protection

### Optional Records

```
CNAME www    @           Proxied  Auto  # Redirect www to main domain
TXT   @      "v=spf1 include:_spf.mx.cloudflare.net ~all"  # For email
```

---

## 2️⃣ SSL/TLS Configuration

### Overview Settings

**Path**: SSL/TLS → Overview

- **Encryption Mode**: `Full (strict)` ⭐ Recommended
  - Full: For self-signed certificates
  - Full (strict): For valid certificates (Let's Encrypt or Cloudflare Origin)

### Edge Certificates

**Path**: SSL/TLS → Edge Certificates

Enable these settings:

- ✅ **Always Use HTTPS** - Force HTTPS redirect
- ✅ **HTTP Strict Transport Security (HSTS)** 
  - Max Age: 6 months (15768000)
  - Include subdomains: Yes
  - Preload: Yes (optional)
- ✅ **Minimum TLS Version**: TLS 1.2
- ✅ **Opportunistic Encryption**: Enabled
- ✅ **TLS 1.3**: Enabled
- ✅ **Automatic HTTPS Rewrites**: Enabled
- ✅ **Certificate Transparency Monitoring**: Enabled

### Origin Server (Recommended)

**Path**: SSL/TLS → Origin Server

1. Click **Create Certificate**
2. Select:
   - Hostnames: `yourdomain.com`, `*.yourdomain.com`
   - Validity: 15 years
3. Create and save both certificate and private key
4. Install on your server (see DEPLOYMENT.md)

---

## 3️⃣ Security Settings

### Firewall Rules

**Path**: Security → WAF → Firewall rules

#### Rule 1: Block Bad Bots
```
Field: Known Bots
Operator: equals
Value: Off

Action: Block
```

#### Rule 2: Rate Limit API
```
Field: Hostname
Operator: equals
Value: api.yourdomain.com

AND

Field: Requests
Operator: greater than
Value: 50 per minute

Action: Challenge (Managed Challenge)
```

#### Rule 3: Block Common Attacks
```
Field: Threat Score
Operator: greater than
Value: 10

Action: Block
```

#### Rule 4: Geographic Protection (Optional)
```
Field: Country
Operator: not in
Value: [Your allowed countries]

Action: Challenge
```

### Security Level

**Path**: Security → Settings

- **Security Level**: `Medium` (can increase to High if under attack)
- **Challenge Passage**: 30 minutes
- **Browser Integrity Check**: ✅ Enabled
- **Privacy Pass Support**: ✅ Enabled

### Bot Fight Mode

**Path**: Security → Bots

- ✅ **Bot Fight Mode**: Enabled (FREE plan)
- ✅ **Super Bot Fight Mode**: If on paid plan

### DDoS Protection

**Path**: Security → DDoS

- ✅ **HTTP DDoS Attack Prevention**: Enabled (automatic)
- ✅ **Network-layer DDoS Attack Protection**: Enabled (automatic)

---

## 4️⃣ Speed & Optimization

### Caching Configuration

**Path**: Caching → Configuration

- **Caching Level**: `Standard`
- **Browser Cache TTL**: `4 hours`
- **Crawler Hints**: ✅ Enabled
- **Always Online**: ✅ Enabled

### Configuration Rules

**Path**: Rules → Configuration Rules

#### Rule 1: Cache Static Assets
```
When: Hostname is yourdomain.com
  AND File extension matches: js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|webp

Then:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

#### Rule 2: Don't Cache API
```
When: Hostname is api.yourdomain.com

Then:
  - Cache Level: Bypass
  - Disable Apps
  - Disable Zaraz
```

#### Rule 3: Don't Cache Dynamic Pages
```
When: Hostname is yourdomain.com
  AND URI Path matches: /(login|register|profile|admin).*

Then:
  - Cache Level: Bypass
```

### Speed Settings

**Path**: Speed → Optimization

- ✅ **Auto Minify**: JavaScript, CSS, HTML
- ✅ **Brotli**: Enabled
- ✅ **Early Hints**: Enabled
- ✅ **HTTP/2**: Enabled
- ✅ **HTTP/3 (with QUIC)**: Enabled
- ✅ **0-RTT Connection Resumption**: Enabled
- ✅ **Rocket Loader**: ⚠️ Disabled (can break React apps)
- ✅ **Mirage**: Enabled (image optimization)

---

## 5️⃣ Page Rules (Alternative to Configuration Rules)

**Path**: Rules → Page Rules

If using FREE plan (limited to 3 page rules):

### Rule 1: Cache Static Assets
```
URL: *yourdomain.com/*.{js,css,jpg,png,gif,svg,woff,woff2}

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 month
```

### Rule 2: API - No Cache
```
URL: api.yourdomain.com/*

Settings:
- Cache Level: Bypass
- Security Level: High
- Disable Apps
```

### Rule 3: Force HTTPS
```
URL: http://*yourdomain.com/*

Settings:
- Always Use HTTPS: On
```

---

## 6️⃣ Rate Limiting (Advanced)

**Path**: Security → WAF → Rate limiting rules

### API Protection
```
Rule name: API Rate Limit
When: Hostname equals api.yourdomain.com

Requests matching: All requests

With the same:
- IP Address

Increment counter when: All requests to API

Rate limit:
- 100 requests per 1 minute
- For 10 minutes

When rate exceeds limit:
- Choose action: Block
- For duration: 1 hour
```

### Upload Protection
```
Rule name: Upload Rate Limit
When: URI Path contains /upload

Rate limit:
- 5 requests per 1 minute
- For 5 minutes

When rate exceeds limit:
- Choose action: Managed Challenge
- For duration: 30 minutes
```

### Login Protection
```
Rule name: Login Rate Limit
When: URI Path matches /api/(login|register)

Rate limit:
- 5 requests per 5 minutes
- For 15 minutes

When rate exceeds limit:
- Choose action: Block
- For duration: 1 hour
```

---

## 7️⃣ Analytics & Monitoring

### Web Analytics

**Path**: Analytics & Logs → Web Analytics

- ✅ Enable Web Analytics
- View traffic patterns, top pages, visitors

### Security Analytics

**Path**: Security → Analytics

Monitor:
- Threats blocked
- Challenge solve rate
- Bot traffic
- Top threats by country

---

## 8️⃣ Advanced Settings

### Network

**Path**: Network

- ✅ **HTTP/2**: Enabled
- ✅ **HTTP/3 (with QUIC)**: Enabled
- ✅ **0-RTT Connection Resumption**: Enabled
- ✅ **IPv6 Compatibility**: Enabled
- ✅ **WebSockets**: Enabled (required for real-time features)
- ✅ **gRPC**: Enabled
- ⚠️ **Onion Routing**: Disabled (unless you want Tor access)

### Scrape Shield

**Path**: Scrape Shield

- ✅ **Email Address Obfuscation**: Enabled
- ✅ **Server-side Excludes**: Enabled
- ✅ **Hotlink Protection**: Enabled (protects images)

---

## 9️⃣ Email Routing (Optional)

**Path**: Email Routing

If you want to use your domain for email:

1. Enable Email Routing
2. Add destination email address
3. Create email routes (e.g., admin@yourdomain.com → your@gmail.com)

---

## 🔟 Custom Error Pages (Pro/Business Plans)

**Path**: Customization → Custom Error Pages

Customize:
- 500 Internal Server Error
- 1000 DNS points to prohibited IP
- Other error pages

---

## ⚡ Performance Testing

### Test Your Setup

1. **SSL Test**: https://www.ssllabs.com/ssltest/
   - Target: A+ rating

2. **Speed Test**: https://www.webpagetest.org/
   - Check TTFB, load time

3. **Security Headers**: https://securityheaders.com/
   - Target: A+ rating

4. **DDoS Simulation**: (Use with caution!)
   ```bash
   # Test rate limiting (small scale only)
   ab -n 1000 -c 10 https://api.yourdomain.com/api/health
   ```

---

## 🚨 Under Attack Mode

If experiencing DDoS attack:

1. **Path**: Security → Settings
2. Enable **"I'm Under Attack Mode"**
3. All visitors will see challenge page before accessing site
4. Disable once attack subsides

---

## 📊 Recommended Free Plan Settings

For most users on FREE plan:

### Must Enable
- ✅ Always Use HTTPS
- ✅ Auto Minify (JS, CSS, HTML)
- ✅ Brotli
- ✅ Bot Fight Mode
- ✅ Browser Integrity Check
- ✅ SSL/TLS: Full (strict)

### Use Wisely (3 Page Rules Total)
1. Cache static assets
2. Bypass cache for API
3. Security for login endpoints

### Monitor Regularly
- Check Analytics weekly
- Review security events
- Monitor performance

---

## 🆙 When to Upgrade

Consider paid plans if you need:
- **Pro ($20/mo)**:
  - 20 Page Rules (vs 3)
  - WAF
  - Image optimization
  - Mobile optimization

- **Business ($200/mo)**:
  - 50 Page Rules
  - Custom SSL for Business
  - Advanced DDoS
  - Guaranteed 100% uptime

- **Enterprise (Custom)**:
  - Unlimited Page Rules
  - Custom WAF rules
  - 24/7 phone support
  - Dedicated SSL certificates

---

## 📞 Support

- Cloudflare Community: https://community.cloudflare.com/
- Status: https://www.cloudflarestatus.com/
- Documentation: https://developers.cloudflare.com/

---

## ✅ Post-Setup Checklist

- [ ] SSL/TLS A+ rating on SSL Labs
- [ ] HTTPS working on main domain
- [ ] HTTPS working on api subdomain
- [ ] Static assets loading fast (check Network tab)
- [ ] API calls working correctly
- [ ] Rate limiting tested
- [ ] Bot protection active
- [ ] Analytics enabled and tracking
- [ ] Security events monitored

---

Made with ☁️ for NoteMind + Cloudflare
