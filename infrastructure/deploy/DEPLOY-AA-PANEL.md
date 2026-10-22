# Deploying Amplified Traders to the aaPanel box

Target: `https://amplifiedtraders.com` on `192.227.176.232` (aaPanel `https://192.227.176.232:21874`).
DNS is already pointed: `amplifiedtraders.com` and `www.amplifiedtraders.com` both A-record to the box,
and SSL is already installed. The site currently serves aaPanel's placeholder page.

---

## 1. The shape of the system

| Piece | Where |
|---|---|
| Source of truth | `github.com/Ebankz007/AmplifiedTraders` (public), branch `main` |
| Server checkout | `/www/wwwroot/amplifiedtraders.com` |
| Runtime | ONE Next.js 16 process under PM2, name `amplifiedtraders-web`, port `3300` |
| Database | PostgreSQL 16 on the box, database + role `amplifiedtraders` |
| Web server | Apache (`/www/server/panel/vhost/apache/amplifiedtraders.com.conf`) → proxies to `127.0.0.1:3300` |
| Deploy trigger | aaPanel cron, every 2 minutes → `infrastructure/deploy/deploy.sh` |
| Gate | GitHub Actions `CI` must be green for the commit being deployed |
| Secrets | `.env` on the server ONLY. Never in git, never in a cron body, never in this file. |

The site, the member portal, the admin console and the API routes are a **single Next.js app** —
there is no separate API service. That is why there is one process and one port.

---

## 2. Order of operations

Do them in this order. Each step is verifiable on its own; if a step fails, stop and fix it
before moving on — a half-provisioned server is harder to reason about than an unprovisioned one.

1. **Whitelist the operator's IP** in the panel (see §3). Without this, every panel API call
   returns an "Ingress verification failed" HTML page instead of JSON.
2. **Create the database** through the panel API (§4). Using the panel API rather than `psql`
   keeps the database inside the panel's own bookkeeping, so it shows up in the panel UI and
   in the panel's backup/restore.
3. **Create the app directory and write `.env`** (§5).
4. **Run the bootstrap** (§6) — clone, install, migrate, seed, build, start.
5. **Replace the Apache vhost** with a reverse proxy to the app (§7).
6. **Register the 2-minute deploy cron** (§8).
7. **Verify** (§9).

---

## 3. The panel ingress whitelist

The panel rejects any request whose source IP is not on its whitelist, with an HTML page
(`Ingress verification failed`) and HTTP 200 — so a naive client sees "success" and parses
nothing. **Always assert that a panel response parses as JSON before trusting it.**

Operator egress IPs rotate. The IP to whitelist at the time of writing is `91.74.24.26`.
If the panel starts returning that HTML page again, the egress IP changed — check
`https://checkip.amazonaws.com` and whitelist the new one.

---

## 4. Create the database (panel API)

`POST /database?action=AddDatabase`

Required parameters — the validator rejects the call if any is missing:

| Param | Value |
|---|---|
| `name` | `amplifiedtraders` |
| `db_user` | `amplifiedtraders` |
| `password` | a strong generated password |
| `codeing` | `UTF8` |
| `sid` | `0` (local server) |
| `active` | `true` |
| `address` | `localhost` |
| `ps` | `Amplified Traders` (a label) |
| `dtype` | `pgsql` |

`listen_ip` defaults to `127.0.0.1/32` — the database is reachable only from the box. Do not
widen it.

**Assert the ledger, not the exit code.** The call returns JSON, but a successful-looking
response is not proof the database exists. Verify independently:

```sql
-- via /www/server/pgsql/bin/psql
psql -h 127.0.0.1 -U amplifiedtraders -d amplifiedtraders -c '\conninfo'
```

---

## 5. The app directory and `.env`

The app lives at `/www/wwwroot/amplifiedtraders.com`.

The `.env` file is written **once**, by hand, and is never rewritten by the deploy.
It is gitignored, so `git reset --hard` leaves it alone (and the deploy never runs
`git clean`, for exactly this reason).

```
DATABASE_URL="postgresql://amplifiedtraders:<password>@127.0.0.1:5432/amplifiedtraders?schema=public"
NEXT_PUBLIC_SITE_URL="https://amplifiedtraders.com"
NEXT_PUBLIC_SITE_NAME="Amplified Traders"
ADMIN_EMAIL="admin@amplifiedtraders.com"
ADMIN_PASSWORD="<strong password>"
ADMIN_NAME="Amplified Traders Admin"
```

Notes:
- `NEXT_PUBLIC_SITE_URL` is **baked into the bundle at build time**. It must be set before
  `pnpm build`, or every canonical URL, sitemap entry and email link points at the wrong origin.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are read by `pnpm db:seed` to create the SUPER_ADMIN.
  Re-running the seed never resets an existing admin's password.
- There is **no `AUTH_SECRET`**. Sessions are opaque random tokens hashed server-side
  (`lib/tokens.ts`). Do not add one; nothing reads it.
- `SMTP_HOST` is the only mail variable the code reads, and even with it set the transport is
  not implemented: mail is reported as not delivered rather than faked. Password-reset
  emails therefore do not arrive. That is honest, not broken.

Writing it through the panel's file API: `POST /files?action=SaveFileBody` with `path` and
`data`. **The file must already exist** — the API refuses to create a new file
("Configuration file not exist"). Create it first with an empty `touch` through the shell
channel (§6), then save the body over it.

---

## 6. Bootstrap the server

The panel's native `/hook` endpoint is inert on this box — it accepts a POST and does
nothing. Do not use it. The working shell channel is: **create a cron task**, write the
script to a temp file, read it back to confirm it landed, then delete both the task and
the temp file.

`POST /crontab?action=AddCrontab` requires all of:

`name, type, where1, hour, minute, save, backupTo, sName, sType, urladdress`

For a shell task: `type=minute`, `where1=1`, `minute=1`, `sType=toShell`, `sName=<task name>`.

Body of the one-shot bootstrap task (no secrets in it — the `.env` already exists):

```sh
#!/bin/bash
export PATH=/www/server/nodejs/v24.18.0/bin:$PATH
cd /www/wwwroot/amplifiedtraders.com
bash infrastructure/deploy/bootstrap.sh
```

`bootstrap.sh` is idempotent: clone → install → `prisma migrate deploy` → `db:seed` →
`db:seed:content` → assert the content landed → build into `.next-staging` → swap into
`.next` → `pm2 start` → health check.

Read the result back with `POST /files?action=GetFileBody` on the task's log file, and
**delete the cron task and the temp script afterwards** — a bootstrap task left behind is
a stray root shell that runs forever.

---

## 7. The Apache vhost

The live web server on this box is **Apache**, not Nginx. The vhost lives at
`/www/server/panel/vhost/apache/amplifiedtraders.com.conf`.

It must reverse-proxy to the app instead of serving the aaPanel placeholder:

```apache
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"

<VirtualHost *:80>
    ServerName amplifiedtraders.com
    ProxyPass        / http://127.0.0.1:3300/
    ProxyPassReverse / http://127.0.0.1:3300/
</VirtualHost>
```

Keep the SSL block that aaPanel generated (the certificate already exists and works) and
add the proxy directives to it as well, so both HTTP and HTTPS reach the app.

The `www` host currently serves the default nginx welcome page — it needs its own vhost
entry, or a redirect to the apex domain.

Reload the web server after editing:

```sh
/www/server/panel/webserver/sbin/webserver -t   # test the config
/www/server/panel/webserver/sbin/webserver -s reload
```

---

## 8. The deploy cron

`POST /crontab?action=AddCrontab` — every 2 minutes, `sType=toShell`:

```
name    = amplifiedtraders-auto-deploy
type    = minute
where1  = 2
hour    = 1
minute  = 5
save    = 0
backupTo = localhost
sName   = amplifiedtraders-auto-deploy
sType   = toShell
urladdress = (the body below)
```

Body:

```sh
#!/bin/bash
export PATH=/www/server/nodejs/v24.18.0/bin:$PATH
cd /www/wwwroot/amplifiedtraders.com
bash infrastructure/deploy/deploy.sh >> /var/log/amplifiedtraders-deploy.log 2>&1
```

The deploy script is idempotent: it fetches `origin/main`, compares the new commit with the
last commit recorded in `deploy.log`, and when nothing changed it does a health check and
exits without rebuilding. It takes a lock (`/tmp/amplifiedtraders-deploy.lock`) so the 2-minute
poll cannot overlap a long build.

---

## 9. Verify

```sh
# app is up and the database is reachable
curl -s http://127.0.0.1:3300/api/health     # -> {"ok":true,"db":"up"}

# the site answers through the vhost
curl -sI https://amplifiedtraders.com/ | head -1

# a prerendered marketing page carries real content
curl -s https://amplifiedtraders.com/packages | grep -c 'Tier'

# the deploy log shows the last good release
tail -20 /var/log/amplifiedtraders-deploy.log
```

Then walk the product: register a member, log in, submit a deposit, confirm it as an admin,
and check the wallet balance and the ledger entry.

---

## 10. What the deploy script does, in order

1. Lock (`/tmp/amplifiedtraders-deploy.lock`), with stale-lock detection by PID.
2. Preflight: the checkout exists, the toolchain resolves, **`.env` exists and has a
   `DATABASE_URL`**. A deploy without a database is refused.
3. `git fetch --prune origin` + `git reset --hard origin/main`.
4. If the commit is unchanged, health check only — no rebuild.
5. **CI gate**: refuses to deploy a commit whose GitHub checks are red. GitHub unreachable
   is fail-open, and says so in the log.
6. `pnpm install --frozen-lockfile` → `prisma generate` → `prisma migrate deploy` →
   `db:seed` → `db:seed:content` → **assert the content landed** → build → swap → restart.
7. Health check `/api/health` and `/` for up to 60s.
8. On failure: roll back to the previous commit, rebuild, restart, and fail loudly.
9. On success: append the commit to `deploy.log`.

**The ordering in step 6 is load-bearing.** The marketing pages and the blog post routes are
prerendered at build time *from the database*. A build that runs before the seed ships a
real-looking but empty site — and the health check still passes, because those pages are
static files. The assert step (`infrastructure/deploy/assert-content.ts`) is what stops that.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Panel returns HTML, not JSON | Egress IP is not whitelisted | Re-check the IP, re-whitelist |
| `Connection refused` on the panel port | Wrong port, or the panel's port changed | Check the panel URL |
| Deploy log says `another deploy is already running` | A previous deploy is wedged | Check the lock dir's PID; the script clears a stale one automatically |
| Deploy log says `no .env` | The secrets file is missing | Recreate it (§5) |
| Deploy log says `content assertion failed` | The seed did not land | Run `pnpm db:seed:content` manually and read the error |
| Site shows the aaPanel placeholder | The vhost was never replaced | §7 |
| Site is 502 | The app is not running | `pm2 status`, `pm2 logs amplifiedtraders-web` |
| `pnpm install` fails on the lockfile | The server's pnpm is a different major | The script retries without `--frozen-lockfile`; fix the server's pnpm to 11.12.0 |
