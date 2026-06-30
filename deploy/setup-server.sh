#!/usr/bin/env bash
#
# One-time provisioning for a fresh Ubuntu 24.04 LTS (minimal) server.
# Installs: Node.js 20 LTS, MongoDB 8.0, nginx, certbot, ufw — and creates
# the app user, directories and the systemd service + nginx site.
#
# Run as root (or with sudo) ON THE SERVER:
#   sudo DOMAIN=alumni.example.kz EMAIL=admin@example.kz bash deploy/setup-server.sh
#
# Then run deploy/deploy.sh to build & start the app, and finally enable TLS:
#   sudo certbot --nginx -d "$DOMAIN"
#
set -euo pipefail

# ---- config (override via env) ---------------------------------------------
DOMAIN="${DOMAIN:?set DOMAIN=alumni.buketov.edu.kz}"
APP_USER="${APP_USER:-alumni}"
APP_DIR="${APP_DIR:-/opt/alumni}"          # repo will live in $APP_DIR/app
NODE_MAJOR="${NODE_MAJOR:-20}"
MONGO_VERSION="${MONGO_VERSION:-8.0}"

log() { echo -e "\n\033[1;36m== $* ==\033[0m"; }

if [[ $EUID -ne 0 ]]; then echo "run as root (sudo)"; exit 1; fi

log "apt base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git ufw rsync ${EXTRA_PKGS:-}

log "Node.js ${NODE_MAJOR}.x (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

log "MongoDB ${MONGO_VERSION} (official repo, Ubuntu noble)"
if ! command -v mongod >/dev/null; then
  curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" \
    | gpg -o "/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg" --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/${MONGO_VERSION} multiverse" \
    > "/etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"
  apt-get update -y
  apt-get install -y mongodb-org
fi
systemctl enable --now mongod
# MongoDB binds 127.0.0.1 by default on Ubuntu — keep it local-only.

log "nginx + certbot"
apt-get install -y nginx certbot python3-certbot-nginx

log "app user + directories"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "clone the repository (if not present)"
if [[ ! -d "$APP_DIR/app/.git" ]]; then
  echo "  -> clone your repo to $APP_DIR/app, e.g.:"
  echo "     sudo -u $APP_USER git clone <REPO_URL> $APP_DIR/app"
  echo "  (skipping clone — do it manually, then re-run deploy.sh)"
fi

log "systemd service"
install -m 644 "$(dirname "$0")/systemd/alumni-api.service" /etc/systemd/system/alumni-api.service
systemctl daemon-reload
systemctl enable alumni-api.service || true

log "web root for static frontend (/var/www/alumni)"
mkdir -p /var/www/alumni
chown -R "$APP_USER:$APP_USER" /var/www/alumni

log "nginx site (public domain + local-IP kiosk)"
install -m 644 "$(dirname "$0")/nginx/alumni-app.conf" /etc/nginx/snippets/alumni-app.conf
sed "s/__DOMAIN__/${DOMAIN}/g" \
  "$(dirname "$0")/nginx/alumni.conf.template" > /etc/nginx/sites-available/alumni.conf
ln -sf /etc/nginx/sites-available/alumni.conf /etc/nginx/sites-enabled/alumni.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "firewall (ufw)"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
yes | ufw enable || true
ufw status

cat <<EOF

Provisioning done.

Next:
  1. Make sure the repo is at $APP_DIR/app  (git clone if you skipped it).
  2. Build & start the app:
       sudo DOMAIN=${DOMAIN} bash $APP_DIR/app/deploy/deploy.sh --seed
  3. Issue a TLS certificate:
       sudo certbot --nginx -d ${DOMAIN}
EOF
