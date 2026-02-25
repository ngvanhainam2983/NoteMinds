# Docker & Optimization Quick Start

## Installation

### 1. Install Docker
```bash
# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# macOS
brew install docker docker-compose

# Windows
Download Docker Desktop from docker.com
```

### 2. Verify Installation
```bash
docker --version
docker-compose --version
```

---

## Quick Deploy (6 steps)

### Step 1: Prepare
```bash
cd /path/to/NoteMind
npm run install:all
```

### Step 2: Create Environment
```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### Step 3: Build Image
```bash
docker build -t notemind:latest .
```

### Step 4: Run with Docker Compose
```bash
# Minimal (app only)
docker-compose up -d

# Or with database
docker-compose --profile postgres up -d
```

### Step 5: Verify
```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs -f notemind

# Health check
curl http://localhost:3001/health
```

### Step 6: Monitor
```bash
# Watch logs
docker-compose logs -f

# View resource usage
docker stats

# Check database
docker-compose exec notemind sqlite3 server/data/notemind.db "SELECT COUNT(*) FROM documents;"
```

---

## Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart notemind

# View logs
docker-compose logs -f notemind

# Execute command
docker-compose exec notemind npm run build

# Update code and redeploy
git pull
docker-compose up -d --build

# Clean up (remove volumes)
docker-compose down -v
```

---

## Database Indexes Performance

Automatically enabled on startup:

```bash
# View database stats
curl http://localhost:3001/health | jq .database

# Monitor performance in logs
docker-compose logs | grep "Database\|Query"
```

---

## Logging

Logs stored in `logs/` directory:
- `app.log` - All logs
- `error.log` - Errors only
- `requests.log` - HTTP requests

```bash
# View logs in real-time
tail -f logs/app.log

# Find errors
grep ERROR logs/error.log

# Count requests
wc -l logs/requests.log
```

---

## Production Deployment

### On VPS:

```bash
# 1. SSH into VPS
ssh root@your-server.com

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone repository
cd /opt && git clone https://github.com/yourusername/NoteMinds.git notemind
cd notemind

# 4. Configure
cp .env.example .env
# Edit .env with production values

# 5. Deploy
docker-compose --profile postgres up -d

# 6. Monitor
docker-compose logs -f notemind
```

### Auto-Updates on VPS:

```bash
# Add to crontab
crontab -e

# Add this line:
0 2 * * * cd /opt/notemind && git pull && docker-compose up -d --build
```

---

## Troubleshooting

### Docker not running?
```bash
# Start Docker daemon
sudo systemctl start docker

# Check status
sudo systemctl status docker
```

### Port already in use?
```bash
# Change port in docker-compose.yml or .env
PORT=3002 docker-compose up -d

# Or find process using port
lsof -i :3001
```

### Can't connect to database?
```bash
# Check database file
docker-compose exec notemind test -f server/data/notemind.db && echo "DB exists"

# Initialize database
docker-compose exec notemind node -e "import('./services/database.js').then(m => m.initDb())"
```

### High memory usage?
```bash
# Check stats
docker stats

# Restart container
docker-compose restart notemind

# Monitor
docker-compose top notemind
```

---

## Performance Tips

1. **Use indexes** ✅ (auto-enabled)
2. **Enable logging** ✅ (auto-enabled)
3. **Monitor health** 🔍 Check `/health` endpoint
4. **Analyze logs** 📊 Review slow queries in logs
5. **Update regularly** 🔄 `git pull && docker-compose up -d --build`

---

**All done!** Your application is optimized, monitored, and ready for production. 🚀
