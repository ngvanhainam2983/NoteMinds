#!/bin/bash
# ============================================================
#  NoteMind Auto-Update Script
#  
#  This script automatically pulls from GitHub, installs
#  dependencies, and restarts the application.
#
#  Usage:
#    bash update-auto.sh                 # Manual run
#    bash update-auto.sh --check         # Check for updates only
#    bash update-auto.sh --scheduled     # For cron jobs
#
#  To schedule auto-updates via cron:
#    # Edit crontab
#    crontab -e
#    
#    # Run every 30 minutes (example)
#    */30 * * * * cd /opt/notemind && bash update-auto.sh --scheduled >> /var/log/notemind-update.log 2>&1
#
#    # Run daily at 2 AM
#    0 2 * * * cd /opt/notemind && bash update-auto.sh --scheduled >> /var/log/notemind-update.log 2>&1
#
# ============================================================

set -euo pipefail

APP_DIR="${1:-.}"
BRANCH="${GIT_BRANCH:-main}"
LOG_FILE="/var/log/notemind-update.log"
SCHEDULED_MODE="${1:-manual}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
  local msg="$1"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${GREEN}[✓]${NC} [$timestamp] $msg" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] $msg"
}

warn() {
  local msg="$1"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${YELLOW}[!]${NC} [$timestamp] $msg" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] $msg"
}

err() {
  local msg="$1"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${RED}[✗]${NC} [$timestamp] $msg" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] $msg"
  exit 1
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  err "Not a git repository. Please run this script from the application root directory."
fi

log "═══════════════════════════════════════════════════════"
log "Starting NoteMind Auto-Update Process"
log "═══════════════════════════════════════════════════════"

# ── Fetch latest changes from remote ──────────────────────

log "Fetching latest changes from remote repository..."
git fetch origin "$BRANCH" || err "Failed to fetch from remote"

# ── Check if there are updates available ──────────────────

LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  log "Already up to date. No updates available."
  
  if [ "$SCHEDULED_MODE" != "--check" ]; then
    log "Exiting auto-update process."
  fi
  exit 0
fi

log "New updates found! Local: ${LOCAL_COMMIT:0:7}, Remote: ${REMOTE_COMMIT:0:7}"

# ── Create backup before updating ─────────────────────────

BACKUP_DIR="backups/backup-$(date +%Y%m%d-%H%M%S)"
log "Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r server/package.json "$BACKUP_DIR/" 2>/dev/null || true
cp -r client/package.json "$BACKUP_DIR/" 2>/dev/null || true
log "Backup created successfully"

# ── Check package.json changes ───────────────────────────

PACKAGES_CHANGED=false
if git diff origin/"$BRANCH" -- server/package.json | grep -q "version\|dependencies"; then
  PACKAGES_CHANGED=true
  log "Server dependencies have changed"
fi

if git diff origin/"$BRANCH" -- client/package.json | grep -q "version\|dependencies"; then
  PACKAGES_CHANGED=true
  log "Client dependencies have changed"
fi

# ── Pull latest changes ──────────────────────────────────

log "Pulling latest changes from $BRANCH..."
git pull origin "$BRANCH" || err "Failed to pull from remote"

# ── Install dependencies if needed ──────────────────────

if [ "$PACKAGES_CHANGED" = true ]; then
  log "Installing dependencies..."
  
  # Install server dependencies
  if [ -d "server" ] && [ -f "server/package.json" ]; then
    log "  → Installing server dependencies..."
    cd server
    npm install --production 2>&1 | grep -E "up to date|added|removed|changed" | head -5 || true
    cd ..
    log "  → Server dependencies installed"
  fi
  
  # Install client dependencies
  if [ -d "client" ] && [ -f "client/package.json" ]; then
    log "  → Installing client dependencies..."
    cd client
    npm install --production 2>&1 | grep -E "up to date|added|removed|changed" | head -5 || true
    cd ..
    log "  → Client dependencies installed"
  fi
else
  log "No package changes detected, skipping dependency installation"
fi

# ── Rebuild client if needed ─────────────────────────────

if [ -d "client" ] && grep -q "\"build\":" client/package.json; then
  log "Building client application..."
  cd client
  npm run build 2>&1 | tail -5 || warn "Client build produced warnings"
  cd ..
  log "Client build completed"
fi

# ── Restart application with PM2 ────────────────────────

if command -v pm2 &>/dev/null; then
  log "Restarting application with PM2..."
  
  # Gracefully restart
  if pm2 list | grep -q "notemind"; then
    pm2 restart notemind --wait-ready --listen-timeout 3000 || warn "PM2 restart failed, attempting force restart"
    pm2 restart notemind --force || err "Failed to restart application"
  else
    warn "Application not found in PM2, starting it..."
    pm2 start server/index.js --name notemind --watch --ignore-watch="\.git|node_modules|uploads|backups" || err "Failed to start application"
  fi
  
  pm2 save || true
  log "Application restarted successfully"
else
  warn "PM2 not found. Skipping automatic application restart."
  warn "Please restart your application manually."
fi

# ── Summary ──────────────────────────────────────────────

log "═══════════════════════════════════════════════════════"
log "Auto-Update completed successfully!"
log "Update: ${LOCAL_COMMIT:0:7} → ${REMOTE_COMMIT:0:7}"
log "Branch: $BRANCH"
log "═══════════════════════════════════════════════════════"

exit 0
