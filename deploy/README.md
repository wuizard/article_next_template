# Deploying on your own server

Two long-running services on one box, plus a nightly timer.

```
                          nginx :443
                    ┌───────────┴───────────┐
  journal.localbalivillas.com    news-studio.localbalivillas.com
            │                              │
      site :3000                     panel :4100
   (read-only, no auth)         (scrypt login, localhost-bound)
            └──────────────┬───────────────┘
                    /srv/journal/repo
                       content/
                         drafts/{id,en}/   ← timer writes here
                         articles/{id,en}/ ← approval moves them here
```

The public site has no login, no write endpoints, and no API key. The panel is
a separate process bound to `127.0.0.1` that answers only to the hostnames in
`ADMIN_ALLOWED_HOSTS`.

---

## 1. System setup

```bash
sudo adduser --system --group --home /srv/journal journal
sudo mkdir -p /srv/journal/repo
sudo chown -R journal:journal /srv/journal

sudo -u journal git clone <your-repo-url> /srv/journal/repo
cd /srv/journal/repo
sudo -u journal npm ci
```

Node 22.13 or newer is required.

## 2. Configuration

```bash
sudo -u journal cp .env.example .env
sudo -u journal nano .env
```

Set at minimum:

- `SITE_URL=https://journal.localbalivillas.com`
- `ANTHROPIC_API_KEY=…`
- `ADMIN_ALLOWED_HOSTS=localhost,127.0.0.1,::1,news-studio.localbalivillas.com`
- `ADMIN_PUBLISH_COMMAND=npm run build && sudo systemctl restart journal-site`

Then generate the two admin secrets:

```bash
sudo -u journal npm run admin:password     # → ADMIN_PASSWORD_HASH
openssl rand -hex 32                       # → ADMIN_SESSION_SECRET
```

`.env` is gitignored and holds your only secrets. Lock it down:

```bash
sudo chmod 600 /srv/journal/repo/.env
```

## 3. Let the panel restart the site

Approving an article rebuilds the site, which needs a restart to serve it.
Grant exactly that one command and nothing else:

```bash
echo 'journal ALL=(root) NOPASSWD: /usr/bin/systemctl restart journal-site' \
  | sudo tee /etc/sudoers.d/journal-restart
sudo chmod 440 /etc/sudoers.d/journal-restart
sudo visudo -c
```

If you would rather grant no sudo at all, leave `ADMIN_PUBLISH_COMMAND` as just
`npm run build`. Approved articles then go live at the next restart.

## 4. Services

```bash
sudo cp deploy/journal-*.service deploy/journal-*.timer /etc/systemd/system/
sudo systemctl daemon-reload

sudo -u journal npm run build
sudo systemctl enable --now journal-site journal-admin journal-content.timer

systemctl status journal-site journal-admin
systemctl list-timers journal-content.timer
```

## 5. nginx

Two files. The rate-limit zone must live in the `http { }` block, which is
what `conf.d/` is included from — so it goes there, not in the site config:

```bash
sudo cp deploy/nginx-ratelimit.conf /etc/nginx/conf.d/journal-ratelimit.conf
sudo cp deploy/nginx-journal.conf   /etc/nginx/sites-available/journal
sudo ln -s /etc/nginx/sites-available/journal /etc/nginx/sites-enabled/
sudo certbot --nginx -d journal.localbalivillas.com -d news-studio.localbalivillas.com
sudo nginx -t && sudo systemctl reload nginx
```

If `nginx -t` reports `unknown limit_req_zone "studio_login"`, the first file
did not land in a directory that `http { }` includes.

Point both DNS records at the server first, or certbot will fail.

## 6. Verify

```bash
curl -I https://journal.localbalivillas.com/          # 308 → /id
curl -s https://journal.localbalivillas.com/sitemap.xml | head
curl -I https://news-studio.localbalivillas.com/      # 303 → /login

# The panel must NOT answer on the public hostname.
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Host: journal.localbalivillas.com' http://127.0.0.1:4100/    # 403
```

---

## Daily rhythm

| When | What |
| --- | --- |
| 01:00 | The timer writes one draft per language into `content/drafts/` |
| Morning | Open `news-studio.localbalivillas.com`, read each draft, edit, approve or reject |
| On approve | The file moves to `content/articles/<lang>/`, the site rebuilds and restarts |

Published articles are plain JSON in the repo. Commit them so the archive has
history:

```bash
cd /srv/journal/repo && sudo -u journal git add content && sudo -u journal git commit -m "content: $(date -I)"
```

## Logs

```bash
journalctl -u journal-site -f
journalctl -u journal-admin -f
journalctl -u journal-content -n 50     # includes the API cost of each run
```

## Firewall

Only 80 and 443 need to be open. Ports 3000 and 4100 must not be reachable
from outside the box:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Adapting this

- **Docker** — run `npm run start` and `node scripts/admin/server.mjs` as two
  services in one compose file, sharing a volume mounted at `/app/content`.
  Keep the panel off any published port; reach it through your proxy only.
- **PM2** — `pm2 start npm --name journal-site -- run start` and
  `pm2 start scripts/admin/server.mjs --name journal-admin`, then
  `pm2 save && pm2 startup`. Replace the timer with a crontab entry:
  `0 1 * * * cd /srv/journal/repo && /usr/bin/node scripts/generate-content.mjs`
- **A different port** — set `PORT` for the site and `ADMIN_PORT` for the
  panel, and update the two `proxy_pass` lines.
