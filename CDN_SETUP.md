# CDN Setup Guide - FREE Testing

For **free testing**, keep your existing local storage. It's already working in your Docker setup. Here's how to optimize it.

---

## ✅ Current Setup (Already Free)

Your project already serves avatars locally:

```
server/
├── uploads/
│   ├── avatars/           ← Avatar storage (free)
│   └── [documents]
└── index.js
```

**In docker-compose.yml:**
```yaml
volumes:
  - ./server/uploads:/app/uploads        # Persists avatars locally
  - ./server/data:/app/data
  - ./server/exports:/app/exports
```

**In server/index.js:**
```javascript
app.use('/uploads/avatars', express.static(avatarsDir));
```

✅ **This is free and works perfectly for testing!**

---

## Optimization Tips (No Extra Cost)

### 1. Add Cache Headers

Modify `server/index.js` to cache avatars:

```javascript
// Serve avatar files with proper caching
app.use('/uploads/avatars', express.static(avatarsDir, {
  maxAge: '1y',                    // Browser cache 1 year
  etag: false,                     // Disable etag (files are immutable)
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));
```

### 2. Use Cloudflare Free Tier (Optional)

If you add your domain to Cloudflare (free):
- Automatic caching of avatars
- Compression on-the-fly
- DDoS protection
- No additional cost

Just point DNS to Cloudflare and it reuses your existing `https://yourdomain.com/uploads/avatars/filename.jpg`

### 3. Compress Images on Upload

Add to `server/index.js` for smaller files:

```javascript
import sharp from 'sharp';

app.post('/api/users/profile/avatar', requireAuth, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    // Compress image
    const filename = `user_${req.user.id}_${Date.now()}.jpg`;
    const filepath = path.join(avatarsDir, filename);

    await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    res.json({ avatar: `/uploads/avatars/${filename}` });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

Install `sharp`:
```bash
cd server && npm install sharp
```

---

## File Sizing for Local Storage

For testing, expect:

| Users | Avatar Storage | Total |
|-------|---|-----|
| 10 | ~5 MB | OK |
| 100 | ~50 MB | OK |
| 1,000 | ~500 MB | OK |
| 10,000 | ~5 GB | Getting tight |

For your Docker volume in `docker-compose.yml`:
```yaml
volumes:
  - ./server/uploads:/app/uploads    # Usually 10-100 MB for testing
```

---

## When to Switch to CDN Later

**Upgrade to Cloudflare R2 / AWS S3 when:**
- Production launch with $$ budget
- Need global CDN
- Users > 10,000
- Avatar storage > 10 GB

---

## What You Have Now (Free)

✅ Avatars stored locally in Docker volume  
✅ Served at `https://localhost:3001/uploads/avatars/filename` (dev)  
✅ Served at `https://yourdomain.com/uploads/avatars/filename` (prod)  
✅ Persistent across container restarts  
✅ Zero cost  

**No additional setup needed. You're good to test!**

---

## To Upgrade Later

When ready for production CDN (not now):
1. Create [Cloudflare R2](https://dash.cloudflare.com) bucket ($0.15/GB)
2. Or use [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) ($0.006/GB) + Cloudflare
3. Update `server/index.js` to upload to external service

For now: **Just keep testing with local storage.**

