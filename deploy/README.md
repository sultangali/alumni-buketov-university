# Deployment — Ubuntu 24.04 LTS (minimal)

Single-server setup: **MongoDB 8** + **Node 20 backend** (systemd) + **nginx** (static
frontend + reverse proxy) + **certbot** TLS.

```
Public  (domain)  ─443/80─┐
                          ├─► nginx ──► /        static build  → /var/www/alumni
Kiosk (LAN, by IP) ─80────┘         ├──► /api/   proxy → 127.0.0.1:4000 (Node/Express)
                                    └──► /media/ proxy → 127.0.0.1:4000 (uploads)
                                                        └► MongoDB 127.0.0.1:27017
```

The same site is reachable two ways and the frontend is built **same-origin**
(`VITE_API_URL=''`), so `/api` and `/media` always resolve against whichever host
served the page — no rebuild needed for the kiosk. See **Kiosk (local access)** below.

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
  `VITE_API_URL=''` (**same-origin** — relative `/api` and `/media`).
- Publishes the primary build (V2) to `/var/www/alumni` (override with
  `WEB_VARIANT=V1` or `WEB_ROOT=/some/path`).
- Generates `server/.env` with a random `JWT_SECRET` on first run.
- `--seed` resets MongoDB to a clean base (**destructive** — omit on updates).
  There are **no test alumni**: moderators populate their own faculty. It also
  generates the admin's weekly passwords and writes `server/admin-passwords.csv`
  (see **Admin sign-in** below).
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

## Admin sign-in (weekly-rotating passwords)
The single admin account logs in as **`alumni_admin`**. There is no static
password — instead a year of **weekly passwords** is generated, and the one valid
for the current week (Mon–Sun) is accepted. The full schedule is written to:

```
server/admin-passwords.csv      # columns: week, start_date, end_date, password
```

Give this CSV to the administrator and keep it secret (it is git-ignored). Each
week, look up the row whose date range covers today and use that password. To
regenerate the schedule at any time (e.g. a new year, or if the CSV leaks):

```bash
cd /opt/alumni/app/server && npm run admin:passwords      # rewrites the CSV, prints this week's password
```

The seed also prints the current week's password on the console. Moderators are
**not** seeded — the admin creates them in the panel → **Moderators** tab
(reassign faculty, reset password, suspend/activate, delete; each shows live
progress). Suspended accounts are refused at login. Every alumnus a moderator
adds is stamped with their account and appears in the admin **Audit**.

## Kiosk (local access)
The info-kiosk inside the university opens the site over the **LAN by the server's
IP**, in parallel with the public domain. The nginx site (`nginx/alumni.conf` —
a single ready-to-use file with the real domain/IPs filled in) has two `server`
blocks:

1. `server_name alumni.buketov.edu.kz` — the public site (HTTPS via certbot).
2. `default_server` on port 80 — answers the bare **server IP** (LAN
   `192.168.42.40`, external `188.0.155.190`), plain HTTP, no redirect, so the
   kiosk keeps working on the LAN even with no internet/cert.

Because the frontend is built same-origin, the kiosk's `/api` and `/media` calls
hit the same server over the LAN — no domain or internet required. Point the kiosk
browser at **`http://192.168.42.40/?preview=kiosk`** (the `?preview=kiosk` starts
the full-screen kiosk layout; it can also be toggled from the header). Give the
server a static LAN IP / DHCP reservation so the address never changes.

> One `default_server` per port only — `setup-server.sh` removes nginx's stock
> `default` site so this block owns port 80 for non-domain hosts.

## Optional: serve V1 (heritage) too
Publish V1 instead with `WEB_VARIANT=V1`, or to a second root with
`WEB_ROOT=/var/www/alumni-v1` and a matching nginx `server` block + DNS.

## Hardening checklist (recommended for production)
- **MongoDB auth**: enable `security.authorization` in `/etc/mongod.conf`, create
  an app user, and point `MONGO_URI` at `mongodb://user:pass@127.0.0.1:27017/alumni`.
- **Keep `server/admin-passwords.csv` secret** (git-ignored); rotate with
  `npm run admin:passwords` if it leaks. No static admin password exists.
- The backend already binds behind nginx and `ufw` closes :4000 externally;
  for extra defence you can bind it to `127.0.0.1` only.
- The `/media` endpoint serves uploads **inline** (`Content-Disposition: inline`,
  `X-Content-Type-Options: nosniff`) and the upload route accepts only inert
  raster image / video types (png/jpg/gif/webp/avif/mp4/webm/ogv/mov — no
  SVG/HTML), so images and video render but cannot carry scripts. Logins reject
  non-string credentials (no NoSQL operator injection).
- Update the QR target in the Apply form (`UPLOAD_URL` in `*/app/src/screens/Apply.tsx`)
  to your real domain.
- Set up backups: `mongodump` on a cron, and back up `server/uploads/`.

## Files
| File | Purpose |
|---|---|
| `setup-server.sh` | one-time provisioning (packages, user, `/var/www/alumni`, service, nginx, ufw) |
| `deploy.sh` | build (same-origin) + publish frontend to `/var/www/alumni` + restart services |
| `systemd/alumni-api.service` | backend service unit (hardened) |
| `nginx/alumni.conf` | nginx site (one file): public-domain + local-IP (kiosk) server blocks, values filled in |
| `server.env.example` | backend env reference |
