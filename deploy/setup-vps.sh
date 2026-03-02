#!/bin/bash

# NoteMind VPS Setup Script
# This script automates the initial server setup for NoteMind

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     NoteMind - Automated VPS Setup Script            ║"
echo "║     Nginx + Cloudflare + PM2 Configuration           ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root: sudo bash setup-vps.sh"
    exit 1
fi

# Prompt for domain
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo "📝 Configuration:"
echo "   Domain: $DOMAIN"
echo "   API Subdomain: api.$DOMAIN"
echo "   Email: $EMAIL"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "🔄 Step 1: Updating system packages..."
apt update && apt upgrade -y

echo ""
echo "📦 Step 2: Installing dependencies..."

# Install Node.js 18.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt install -y nginx
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Install Git
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt install -y git
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo ""
echo "🔧 Step 3: Setting up application directory..."

APP_DIR="/var/www/notemind"

if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
fi

cd "$APP_DIR"

# If this script is in deploy/, we're already in the repo
if [ -f "../package.json" ]; then
    echo "Repository detected, skipping clone..."
    APP_DIR="$(pwd)/.."
    cd "$APP_DIR"
else
    read -p "Enter Git repository URL (or press Enter to skip): " GIT_REPO
    if [ ! -z "$GIT_REPO" ]; then
        echo "Cloning repository..."
        cd /var/www
        rm -rf notemind
        git clone "$GIT_REPO" notemind
        cd notemind
    fi
fi

echo ""
echo "🔐 Step 4: Configuring SSL certificate..."

# Stop nginx for standalone mode
systemctl stop nginx

# Get SSL certificate
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "api.$DOMAIN"

echo ""
echo "⚙️  Step 5: Configuring Nginx..."

# Update nginx.conf with actual domain
sed -i "s/yourdomain.com/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf"

# Update SSL certificate paths in nginx.conf to use Let's Encrypt
sed -i "s|/etc/letsencrypt/live/yourdomain.com/|/etc/letsencrypt/live/$DOMAIN/|g" "$APP_DIR/deploy/nginx.conf"

# Link nginx configuration
ln -sf "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/notemind
ln -sf /etc/nginx/sites-available/notemind /etc/nginx/sites-enabled/

# Remove default nginx site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Start nginx
systemctl start nginx
systemctl enable nginx

echo ""
echo "📱 Step 6: Setting up backend..."

cd "$APP_DIR/server"

# Install dependencies
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp ../.env.example .env
    
    # Generate secure keys
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env with domain and generated secrets
    sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" .env
    sed -i "s|API_DOMAIN=.*|API_DOMAIN=https://api.$DOMAIN|" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    sed -i "s/NODE_ENV=.*/NODE_ENV=production/" .env
    
    echo ""
    echo "⚠️  .env file created with generated secrets!"
    echo "   Please edit $APP_DIR/server/.env to add:"
    echo "   - QWEN_API_KEY (for AI features)"
    echo "   - Email configuration (optional)"
fi

# Create necessary directories
mkdir -p data uploads exports logs uploads/avatars

# Start with PM2
pm2 delete notemind-api 2>/dev/null || true
pm2 start index.js --name notemind-api
pm2 save
pm2 startup | tail -n 1 | bash

echo ""
echo "🎨 Step 7: Building frontend..."

cd "$APP_DIR/client"

# Install dependencies
npm install

# Build for production
npm run build

echo ""
echo "🔥 Step 8: Setting up firewall..."

# Configure UFW
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    echo "Firewall configured"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║            ✅ Setup Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your NoteMind instance should now be available at:"
echo "   Frontend: https://$DOMAIN"
echo "   API:      https://api.$DOMAIN"
echo ""
echo "📝 Next steps:"
echo "   1. Configure Cloudflare DNS (if not done):"
echo "      - A record: @ → Your Server IP (Proxied)"
echo "      - A record: api → Your Server IP (Proxied)"
echo "      - A record: www → Your Server IP (Proxied)"
echo ""
echo "   2. Edit server configuration:"
echo "      nano $APP_DIR/server/.env"
echo ""
echo "   3. Add your AI API key (required):"
echo "      - Get key from: https://dashscope.console.aliyun.com/"
echo "      - Or use Ollama locally"
echo ""
echo "   4. Restart backend:"
echo "      pm2 restart notemind-api"
echo ""
echo "📊 Useful commands:"
echo "   - View logs:    pm2 logs notemind-api"
echo "   - Monitor:      pm2 monit"
echo "   - Restart:      pm2 restart notemind-api"
echo "   - Nginx logs:   tail -f /var/log/nginx/error.log"
echo ""
echo "🔐 SSL Certificate auto-renewal is configured"
echo ""
echo "Need help? Check: $APP_DIR/deploy/DEPLOYMENT.md"
echo ""
