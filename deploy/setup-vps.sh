#!/bin/bash
# ============================================================
#  NoteMinds VPS Deploy Script
#  Target: Ubuntu/Debian VPS (2 vCPU, 1GB RAM)
#
#  Usage:
#    First-time:   bash deploy/setup-vps.sh
#    Redeploy:     bash deploy/setup-vps.sh update
# ============================================================

set -euo pipefail

APP_DIR="/opt/notemind"
REPO_URL=""   # Fill with your Git repo URL if using git-based deploy
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
ask()  { echo -e "${CYAN}[?]${NC} $1"; }

# ── Check root ──────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  err "Please run as root:  sudo bash deploy/setup-vps.sh"
fi

MODE="${1:-full}"   # "full" or "update"

# ── Prompt for domain ───────────────────────────────────────
DOMAIN_FILE="$APP_DIR/.domain"
DOMAIN=""

if [ -f "$DOMAIN_FILE" ]; then
  DOMAIN=$(cat "$DOMAIN_FILE")
  ask "Previous domain found: $DOMAIN"
  read -rp "    Press Enter to keep it, or type a new domain: " NEW_DOMAIN
  if [ -n "$NEW_DOMAIN" ]; then
    DOMAIN="$NEW_DOMAIN"
  fi
else
  echo ""
  ask "Enter your domain name (e.g. notemind.example.com):"
  read -rp "    Domain: " DOMAIN
  echo ""
fi

# Strip protocol if user accidentally included it
DOMAIN=$(echo "$DOMAIN" | sed -E 's|^https?://||' | sed 's|/.*||')

if [ -z "$DOMAIN" ]; then
  err "Domain is required. Example: bash deploy/setup-vps.sh"
fi

# Validate domain format
if ! echo "$DOMAIN" | grep -qP '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$'; then
  err "Invalid domain format: $DOMAIN"
fi

mkdir -p "$APP_DIR"
echo "$DOMAIN" > "$DOMAIN_FILE"
log "Domain set to: $DOMAIN"

# ════════════════════════════════════════════════════════════
#  FULL SETUP (first-time only)
# ════════════════════════════════════════════════════════════
if [ "$MODE" = "full" ]; then

  log "Updating system packages..."
  apt-get update -qq && apt-get upgrade -y -qq

  # ── Install Node.js 20 LTS ────────────────────────────────
  if ! command -v node &>/dev/null; then
    log "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  log "Node $(node -v) / npm $(npm -v)"

  # ── Install PM2 ───────────────────────────────────────────
  if ! command -v pm2 &>/dev/null; then
    log "Installing PM2..."
    npm install -g pm2
  fi

  # ── Install Nginx ─────────────────────────────────────────
  if ! command -v nginx &>/dev/null; then
    log "Installing Nginx..."
    apt-get install -y nginx
  fi

  # ── Create swap (important for 1GB RAM) ───────────────────
  if [ ! -f /swapfile ]; then
    log "Creating 1GB swap file..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Optimize swappiness for low-RAM server
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
  fi
  log "Swap: $(swapon --show | tail -1)"

  # ── Firewall ──────────────────────────────────────────────
  if command -v ufw &>/dev/null; then
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
    log "Firewall configured"
  fi

fi  # end full setup

# ════════════════════════════════════════════════════════════
#  DEPLOY / UPDATE
# ════════════════════════════════════════════════════════════

log "Creating directories..."
mkdir -p "$APP_DIR" "$APP_DIR/logs"

# ── Copy project files (or git pull) ────────────────────────
if [ -n "$REPO_URL" ]; then
  if [ -d "$APP_DIR/.git" ]; then
    log "Pulling latest code..."
    cd "$APP_DIR" && git pull origin "$BRANCH"
  else
    log "Cloning repository..."
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi
else
  log "Syncing project files with rsync..."
  # Run this from the project root directory
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
  rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='server/uploads/*' \
    --exclude='server/public' \
    --exclude='.env' \
    "$PROJECT_DIR/" "$APP_DIR/"
fi

cd "$APP_DIR"

# ── Install deps ────────────────────────────────────────────
log "Installing server dependencies..."
cd "$APP_DIR/server"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

log "Installing client dependencies..."
cd "$APP_DIR/client"
npm ci 2>/dev/null || npm install

# ── Build frontend ──────────────────────────────────────────
log "Building frontend..."
npm run build
log "Frontend built → $APP_DIR/server/public"

# ── Setup .env ──────────────────────────────────────────────
if [ ! -f "$APP_DIR/server/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/server/.env"
  warn "Created server/.env from .env.example — edit it with your API keys!"
  warn "  nano $APP_DIR/server/.env"
fi

# ── Ensure uploads directory ────────────────────────────────
mkdir -p "$APP_DIR/server/uploads"

# ── Configure Nginx ─────────────────────────────────────────
log "Configuring Nginx for $DOMAIN..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/notemind
# Replace placeholder with actual domain
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/notemind
ln -sf /etc/nginx/sites-available/notemind /etc/nginx/sites-enabled/notemind
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
log "Nginx configured and reloaded"

# ── SSL with Certbot (automatic) ───────────────────────────
log "Setting up SSL certificate for $DOMAIN..."

# Install certbot if not present
if ! command -v certbot &>/dev/null; then
  log "Installing Certbot..."
  apt-get install -y certbot python3-certbot-nginx
fi

# Prompt for email
ask "Enter your email for SSL certificate notifications (Let's Encrypt):"
read -rp "    Email: " SSL_EMAIL

if [ -z "$SSL_EMAIL" ]; then
  warn "No email provided — using --register-unsafely-without-email"
  EMAIL_FLAG="--register-unsafely-without-email"
else
  EMAIL_FLAG="--email $SSL_EMAIL --no-eff-email"
fi

# Check if certificate already exists
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  log "SSL certificate already exists for $DOMAIN, renewing..."
  certbot renew --nginx --non-interactive
else
  log "Obtaining SSL certificate for $DOMAIN..."
  certbot --nginx -d "$DOMAIN" \
    $EMAIL_FLAG \
    --agree-tos \
    --non-interactive \
    --redirect
fi

# Verify certbot auto-renewal timer
if systemctl is-active --quiet certbot.timer 2>/dev/null; then
  log "Certbot auto-renewal timer is active"
else
  # Set up cron-based renewal as fallback
  if ! crontab -l 2>/dev/null | grep -q 'certbot renew'; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    log "Certbot auto-renewal cron job added (daily at 3 AM)"
  fi
fi

log "SSL configured — HTTPS is active!"

# ── Start / Restart PM2 ────────────────────────────────────
log "Starting application with PM2..."
cd "$APP_DIR"
pm2 delete notemind 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

log "────────────────────────────────────────"
log "  NoteMinds deployed successfully! 🎉"
log "────────────────────────────────────────"
log "  App URL:      https://$DOMAIN"
log "  PM2 status:   pm2 status"
log "  PM2 logs:     pm2 logs notemind"
log "  Nginx logs:   tail -f /var/log/nginx/access.log"
log ""
warn "Next steps:"
warn "  1. Edit $APP_DIR/server/.env with your Qwen API settings"
warn "  2. Make sure DNS A record for $DOMAIN points to $(hostname -I | awk '{print $1}')"
log "────────────────────────────────────────"
