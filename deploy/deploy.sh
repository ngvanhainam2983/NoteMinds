#!/usr/bin/env bash
set -euo pipefail

# One-command deploy for fresh VPS
# Usage:
#   bash deploy/deploy.sh <domain> <email>
# Example:
#   bash deploy/deploy.sh notemind.tech admin@notemind.tech

DOMAIN="${1:-${DOMAIN:-}}"
EMAIL="${2:-${LETSENCRYPT_EMAIL:-}}"

if [ -z "${DOMAIN}" ] || [ -z "${EMAIL}" ]; then
  echo "Usage: bash deploy/deploy.sh <domain> <email>"
  echo "Example: bash deploy/deploy.sh notemind.tech admin@notemind.tech"
  exit 1
fi

API_DOMAIN="api.${DOMAIN}"
WWW_DOMAIN="www.${DOMAIN}"

COMPOSE="docker compose"
NGINX_CONF="deploy/nginx.conf"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

render_bootstrap_nginx() {
  cat > "${NGINX_CONF}" <<EOF
upstream notemind_backend {
    server backend:3001;
    keepalive 32;
}

limit_req_zone \$binary_remote_addr zone=api_per_ip:10m rate=20r/s;
limit_req_zone \$binary_remote_addr zone=auth_per_ip:10m rate=10r/m;

server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN} ${API_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

  location ~* ^/(wp-admin|wp-login\\.php|xmlrpc\\.php|wordpress|setup/setup\\.php|app_dev\\.php|down\\.html|scripts/(deploy|db)\\.sh|key\\.pem|backup/database\\.zip|install\\.sql)$ {
    return 444;
  }

  location ~ /\\.(?!well-known) {
    deny all;
    access_log off;
    log_not_found off;
  }

  location ~* \\.(env|ini|log|sql|bak|old|swp|pem|sh)$ {
    return 404;
    access_log off;
    log_not_found off;
  }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_pass http://notemind_backend;
    }
}
EOF
}

render_ssl_nginx() {
  cat > "${NGINX_CONF}" <<EOF
upstream notemind_backend {
    server backend:3001;
    keepalive 32;
}

limit_req_zone \$binary_remote_addr zone=api_per_ip:10m rate=20r/s;
limit_req_zone \$binary_remote_addr zone=auth_per_ip:10m rate=10r/m;

server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN} ${API_DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

  location ~* ^/(wp-admin|wp-login\\.php|xmlrpc\\.php|wordpress|setup/setup\\.php|app_dev\\.php|down\\.html|scripts/(deploy|db)\\.sh|key\\.pem|backup/database\\.zip|install\\.sql)$ {
    return 444;
  }

  location ~ /\\.(?!well-known) {
    deny all;
    access_log off;
    log_not_found off;
  }

  location ~* \\.(env|ini|log|sql|bak|old|swp|pem|sh)$ {
    return 404;
    access_log off;
    log_not_found off;
  }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location ~* ^/(wp-admin|wp-login\\.php|xmlrpc\\.php|wordpress|setup/setup\\.php|app_dev\\.php|down\\.html|scripts/(deploy|db)\\.sh|key\\.pem|backup/database\\.zip|install\\.sql)$ {
      return 444;
    }

    location ~ /\\.(?!well-known) {
      deny all;
      access_log off;
      log_not_found off;
    }

    location ~* \\.(env|ini|log|sql|bak|old|swp|pem|sh)$ {
      return 404;
      access_log off;
      log_not_found off;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 360s;
        proxy_send_timeout 360s;
        proxy_pass http://notemind_backend;
    }
}

server {
    listen 443 ssl http2;
    server_name ${API_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50m;

    location ~* ^/(wp-admin|wp-login\\.php|xmlrpc\\.php|wordpress|setup/setup\\.php|app_dev\\.php|down\\.html|scripts/(deploy|db)\\.sh|key\\.pem|backup/database\\.zip|install\\.sql)$ {
      return 444;
    }

    location ~ /\\.(?!well-known) {
      deny all;
      access_log off;
      log_not_found off;
    }

    location ~* \\.(env|ini|log|sql|bak|old|swp|pem|sh)$ {
      return 404;
      access_log off;
      log_not_found off;
    }

    location ~* ^/auth/(login|register|forgot-password|reset-password)$ {
      limit_req zone=auth_per_ip burst=20 nodelay;
      proxy_http_version 1.1;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
      proxy_set_header Connection "";
      proxy_read_timeout 360s;
      proxy_send_timeout 360s;
      proxy_pass http://notemind_backend;
    }

    location / {
      limit_req zone=api_per_ip burst=120 nodelay;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 360s;
        proxy_send_timeout 360s;
        proxy_pass http://notemind_backend;
    }
}
EOF
}

smoke_check() {
  echo "[7/7] Running smoke checks"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "https://${DOMAIN}" >/dev/null && echo "OK: https://${DOMAIN}"
    curl -fsS "https://${API_DOMAIN}/health" >/dev/null && echo "OK: https://${API_DOMAIN}/health"
    curl -fsS "https://${API_DOMAIN}/api/health" >/dev/null && echo "OK: https://${API_DOMAIN}/api/health"
  else
    echo "curl not found. Skipping smoke checks."
  fi
}

require_cmd docker

mkdir -p certbot/conf certbot/www server/data server/uploads server/exports server/logs

if [ ! -f .env ]; then
  echo "Missing .env in project root. Create it before deploy."
  exit 1
fi

echo "[1/7] Building backend image"
$COMPOSE build backend

echo "[2/7] Writing bootstrap Nginx config (HTTP only)"
render_bootstrap_nginx

echo "[3/7] Starting backend + nginx for ACME challenge"
$COMPOSE up -d backend nginx

echo "[4/7] Requesting or reusing Let's Encrypt certificate"
if [ -f "certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
  echo "Certificate already exists for ${DOMAIN}. Skipping issuance."
else
  $COMPOSE run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "${DOMAIN}" -d "${WWW_DOMAIN}" -d "${API_DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos --no-eff-email --non-interactive
fi

echo "[5/7] Writing SSL Nginx config"
render_ssl_nginx

echo "[6/7] Restarting stack with SSL + renew service"
$COMPOSE up -d --force-recreate backend nginx certbot

smoke_check

echo "Deploy completed."
echo "Frontend: https://${DOMAIN}"
echo "API:      https://${API_DOMAIN}"
