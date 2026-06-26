# Deployment — Ubuntu 24.04 LTS (minimal)

Single-server setup: **MongoDB 8** + **Node 20 backend** (systemd) + **nginx** (static
frontend + reverse proxy) + **certbot** TLS.

```
Internet ──443/80──► nginx ──► /          static V2 build (Vite dist)
                          ├──► /api/      proxy → 127.0.0.1:4000 (Node/Express)
                          └──► /media/    proxy → 127.0.0.1:4000 (uploads, inert)
                                                 └► MongoDB 127.0.0.1:27017
```

## 0. Prerequisites
- A fresh Ubuntu 24.04 server, root/sudo access, a domain (e.g. `alumni.example.kz`)
  with an **A/AAAA record pointing at the server IP**.
- Open ports 22, 80, 443 (the script configures `ufw`).

## 1. Provision the server (once)
SSH in as a sudo user, get the repo onto the box, then run the setup script:

```bash
sudo apt-get update && sudo apt-get install -y git
sudo mkdir -p /opt/alumni && sudo chown "$USER" /opt/alumni
git clone <YOUR_REPO_URL> /opt/alumni/app

sudo DOMAIN=alumni.example.kz EMAIL=admin@example.kz \
  bash /opt/alumni/app/deploy/setup-server.sh
```

This installs Node 20, MongoDB 8, nginx, certbot; creates the `alumni` user;
installs the `alumni-api` systemd service and the nginx site; enables the firewall.

> The repo must end up at `/opt/alumni/app`. If you cloned elsewhere, pass
> `APP_DIR=/your/path` to both scripts.

## 2. Build & start the app
```bash
sudo DOMAIN=alumni.example.kz bash /opt/alumni/app/deploy/deploy.sh --seed
```
- Installs deps, builds the backend (`tsc`) and the frontends (V2, V1) with
  `VITE_API_URL=https://<DOMAIN>` so they call the same origin.
- Generates `server/.env` with a random `JWT_SECRET` on first run.
- `--seed` loads the sample dataset into MongoDB (**destructive** — omit on updates).
- Starts/reloads the `alumni-api` service and nginx.

## 3. Enable HTTPS
```bash
sudo certbot --nginx -d alumni.example.kz
```
Certbot edits the nginx site to add the 443 listener + HTTP→HTTPS redirect and
sets up auto-renewal (`systemctl status snap.certbot.renew` / the apt timer).

## 4. Verify
```bash
curl -fsS https://alumni.example.kz/api/health     # {"ok":true}
systemctl status alumni-api                          # active (running)
journalctl -u alumni-api -f                          # live backend logs
```
Open `https://alumni.example.kz` — content is served from MongoDB via the API.

## Updating after a code change
```bash
sudo DOMAIN=alumni.example.kz bash /opt/alumni/app/deploy/deploy.sh --pull
```
(`--pull` does `git pull`; rebuilds backend + frontends; restarts services. No
`--seed`, so data is preserved.)

## Staff accounts (seeded)
`admin` / `admin123` · `moderator` / `moder123` — **change these for production**
(re-hash with bcrypt and update the `staffusers` collection, or adjust the seed).

## Optional: serve V1 (heritage) too
Add DNS `v1.<DOMAIN>`, uncomment the second `server { }` block in
`nginx/alumni.conf.template` (re-run setup or edit the installed site), then
`sudo certbot --nginx -d v1.<DOMAIN>`.

## Hardening checklist (recommended for production)
- **MongoDB auth**: enable `security.authorization` in `/etc/mongod.conf`, create
  an app user, and point `MONGO_URI` at `mongodb://user:pass@127.0.0.1:27017/alumni`.
- **Change seeded staff passwords** (above).
- The backend already binds behind nginx and `ufw` closes :4000 externally;
  for extra defence you can bind it to `127.0.0.1` only.
- The `/media` endpoint already serves uploads as inert attachments
  (`Content-Disposition: attachment`, `nosniff`, CSP sandbox) and rejects SVG/active
  content; logins reject non-string credentials (no NoSQL operator injection).
- Update the QR target in the Apply form (`UPLOAD_URL` in `*/app/src/screens/Apply.tsx`)
  to your real domain.
- Set up backups: `mongodump` on a cron, and back up `server/uploads/`.

## Files
| File | Purpose |
|---|---|
| `setup-server.sh` | one-time provisioning (packages, user, service, nginx, ufw) |
| `deploy.sh` | build + (re)deploy backend & frontends, restart services |
| `systemd/alumni-api.service` | backend service unit (hardened) |
| `nginx/alumni.conf.template` | nginx site (static + `/api` `/media` proxy) |
| `server.env.example` | backend env reference |
