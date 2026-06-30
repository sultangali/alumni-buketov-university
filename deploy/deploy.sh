#!/usr/bin/env bash
#
# Build & (re)deploy the app. Run after setup-server.sh and after each update.
#   sudo DOMAIN=alumni.example.kz bash /opt/alumni/app/deploy/deploy.sh [--seed] [--pull]
#
#   --pull   git pull origin <current branch> before building
#   --seed   run the DB seed (DESTRUCTIVE: wipes + reloads sample data)
#
# Layout assumed (created by setup-server.sh):
#   $APP_DIR/app            -> the git repository (this repo)
#   $APP_DIR/app/server     -> backend (built in place, run via systemd)
#   $APP_DIR/app/V2/app/dist, $APP_DIR/app/V1/app/dist -> static frontends (served by nginx)
#
set -euo pipefail

DOMAIN="${DOMAIN:?set DOMAIN=your.domain.kz}"
APP_USER="${APP_USER:-alumni}"
APP_DIR="${APP_DIR:-/opt/alumni}"
REPO="${REPO:-$APP_DIR/app}"
# Frontend talks to the SAME ORIGIN (empty base => relative /api and /media).
# This is what lets one build work both on the public domain AND on the LAN IP
# the info-kiosk uses; nginx proxies /api and /media to the backend either way.
API_BASE="${API_BASE-}"
# Where nginx serves the static frontend from (see deploy/nginx/alumni-app.conf).
WEB_ROOT="${WEB_ROOT:-/var/www/alumni}"
# Which frontend to publish to WEB_ROOT (V2 = primary editorial build).
WEB_VARIANT="${WEB_VARIANT:-V2}"

PULL=0; SEED=0
for a in "$@"; do case "$a" in --pull) PULL=1;; --seed) SEED=1;; esac; done

log() { echo -e "\n\033[1;36m== $* ==\033[0m"; }
run_as() { sudo -u "$APP_USER" -H bash -lc "$1"; }

[[ -d "$REPO/.git" ]] || { echo "repo not found at $REPO — clone it first"; exit 1; }
chown -R "$APP_USER:$APP_USER" "$REPO"

if [[ "$PULL" == 1 ]]; then
  log "git pull"
  run_as "cd '$REPO' && git pull --ff-only"
fi

log "backend: install + build"
run_as "cd '$REPO/server' && npm ci && npm run build"

log "backend: .env (generate JWT secret on first run)"
ENV_FILE="$REPO/server/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  SECRET="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<EOF
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/alumni
JWT_SECRET=${SECRET}
NODE_ENV=production
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "  created $ENV_FILE"
fi

if [[ "$SEED" == 1 ]]; then
  log "DB seed (DESTRUCTIVE)"
  run_as "cd '$REPO/server' && npm run seed"
fi

log "frontend builds (same-origin: VITE_API_URL='${API_BASE}')"
for V in V2 V1; do
  if [[ -d "$REPO/$V/app" ]]; then
    run_as "cd '$REPO/$V/app' && npm ci && VITE_API_URL='$API_BASE' npm run build"
    echo "  built $V -> $REPO/$V/app/dist"
  fi
done

log "publish $WEB_VARIANT to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
# --delete keeps the web root in sync with the fresh build (drops stale assets)
rsync -a --delete "$REPO/$WEB_VARIANT/app/dist/" "$WEB_ROOT/"
chown -R "$APP_USER:$APP_USER" "$WEB_ROOT"
echo "  published $WEB_VARIANT/app/dist -> $WEB_ROOT"

log "restart backend service"
systemctl restart alumni-api.service
sleep 1
systemctl --no-pager --full status alumni-api.service | head -n 6 || true

log "reload nginx"
nginx -t && systemctl reload nginx

log "smoke check"
curl -fsS "http://127.0.0.1:4000/api/health" && echo "  api ok" || echo "  WARN: api health failed"

echo -e "\n\033[1;32mDeploy complete.\033[0m  Site: https://${DOMAIN}  (run certbot if TLS not yet issued)"
