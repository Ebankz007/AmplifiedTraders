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

## 4. Create the database (`psql`, not the panel API)

`POST /database?action=AddDatabase` **does not work on this box**. The module answers
`{"status": false, "msg": "Specific parameters are invalid!"}`, and the sibling list actions
(`/databases?action=getList`, `/database?action=GetDatabaseList`) return either the ingress
HTML page or that same "invalid parameters" error. The database was therefore created directly
with `psql` as the `postgres` superuser:

```sh
su postgres -c "psql -c \"CREATE ROLE amplifiedtraders LOGIN PASSWORD '<strong password>';\""
su postgres -c "psql -c \"CREATE DATABASE amplifiedtraders_prod OWNER amplifiedtraders;\""
```

Notes:
- The PostgreSQL 16 binaries are **system** packages: `psql` lives at **`/bin/psql`**, *not*
  `/www/server/pgsql/bin/psql`. There is no `/www/server/pgsql/` directory on this box.
- The role is a plain `LOGIN` role — **not** a superuser — and it owns the database.
- Authentication is `scram-sha-256`; the server listens on `127.0.0.1` only. Do not widen it.
- The database is named **`amplifiedtraders_prod`**, not `amplifiedtraders`.

**Assert the ledger, not the exit code.** A successful-looking response is not proof the
database exists. Verify independently:

```sh
su postgres -c "psql -d amplifiedtraders_prod -c '\conninfo'"
```

---

## 5. The app directory and `.env`

The app lives at `/www/wwwroot/amplifiedtraders.com`.

The `.env` file is written **once**, by hand, and is never rewritten by the deploy.
It is gitignored, so `git reset --hard` leaves it alone (and the deploy never runs
`git clean`, for exactly this reason).

```
DATABASE_URL="postgresql://amplifiedtraders:<password>@127.0.0.1:5432/amplifiedtraders_prod?schema=public"
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
`data`. **The file must already exist** — `SaveFileBody` refuses to create a new file
("Configuration file not exist"). Two ways to satisfy that:

- `POST /files?action=CreateFile` with `path` — but only **inside the site webroot**.
  Creating a file under `/tmp` and then saving over it fails with
  `Permission denied (Errno 13)`, because the panel's file API runs as a different user than
  the one that owns `/tmp` state. Stage in `/www/wwwroot/amplifiedtraders.com/`, write there,
  read it back, then move it into place with the shell channel (§6).
- Or create it with an empty `touch` through the shell channel (§6), then save the body over it.

Always **read the file back** after writing. A write you did not read back is not a write.

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
`/www/server/panel/vhost/apache/amplifiedtraders.com.conf` and is included from
`/www/server/apache/conf/httpd.conf` via
`IncludeOptional /www/server/panel/vhost/apache/*.conf`.

### 7.1 The reverse proxy is a security control, not a convenience

The vhost's `DocumentRoot` **is the git checkout** (`/www/wwwroot/amplifiedtraders.com`).
Serving that directory directly publishes the entire repository over HTTPS — verified on the
live box before the proxy was installed:

| Path | Served directly | Through the proxy |
|---|---|---|
| `/package.json` | 200 | 404 |
| `/prisma/schema.prisma` | 200 (32,840 bytes) | 404 |
| `/infrastructure/deploy/deploy.sh` | 200 | 404 |
| `/.git/config` | 200 | 404 |
| `/.env` | 403 (aaPanel deny rule) | 404 |

Only `/.env` was protected, and only by an aaPanel deny rule. Everything else — the schema,
the deploy script, the dependency manifest — was world-readable. **The proxy is what closes
that.** Do not "simplify" it back to a static DocumentRoot.

### 7.2 The working vhost

```apache
<VirtualHost *:80>
    ServerName  amplifiedtraders.com
    ServerAlias www.amplifiedtraders.com

    # aaPanel renews this certificate with HTTP-01 *file* verification against the
    # site DocumentRoot. The proxy must never swallow the challenge path, or
    # renewal breaks when the cert expires.
    ProxyPass        /.well-known/acme-challenge/ !

    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/ [NC]
    RewriteRule ^/(.*)$ https://amplifiedtraders.com/$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName  amplifiedtraders.com
    ServerAlias www.amplifiedtraders.com

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    ProxyPass        / http://127.0.0.1:3300/
    ProxyPassReverse / http://127.0.0.1:3300/

    # ...aaPanel's SSL certificate paths, error logs, and access logs stay as-is.
</VirtualHost>
```

`ProxyPreserveHost On` keeps `Host: amplifiedtraders.com` upstream, so Next.js builds absolute
URLs against the right origin. `X-Forwarded-Proto` must be set explicitly — Apache does not add
it — or the app believes it is being served over plain HTTP.

### 7.3 Certificate renewal depends on the carve-out

There is **no `acme.sh`** on this box. aaPanel renews with its own client:

```sh
python3 -u /www/server/panel/class/acme_v2.py --renew_v3=1
```

It uses **HTTP-01 file verification**: it writes
`/www/wwwroot/amplifiedtraders.com/.well-known/acme-challenge/<token>` and fetches it over
**plain HTTP on port 80**. That is exactly why §7.2 excludes the challenge path from both the
proxy and the redirect. If you remove that carve-out, renewal fails silently and the site dies
when the certificate expires.

The certificate in place covers **`amplifiedtraders.com` only** — its SAN list is
`DNS:amplifiedtraders.com`, with no `www`. So `https://www.amplifiedtraders.com` serves the
right content but raises a name-mismatch warning, and `http://www...` correctly 301s to the
apex. Adding `www` means re-issuing the certificate (the `www` alias and
`ProxyPreserveHost` are already in place — only the certificate needs swapping). Mind the
Let's Encrypt rate limits: this account has already hit "more than 5 failed orders within
1 hour" on another domain.

### 7.4 Editing the vhost safely

The panel's file API cannot create files in the vhost directory. Stage the new file in the
webroot, then move it into place with the shell channel (§6).

**Test before you reload.** The binary is `/www/server/apache/bin/httpd` — there is no
`apachectl` on this box:

```sh
/www/server/apache/bin/httpd -t          # "Syntax OK" or the exact line that broke
/www/server/apache/bin/httpd -k graceful  # reload without dropping connections
```

A vhost that drops a closing tag produces `Syntax error on line N: <VirtualHost> was not
closed`. The safe sequence is: write the new file beside the old one, `httpd -t`, and only
then swap it in and reload — with the previous file kept as
`amplifiedtraders.com.conf.bak-kairos` so a rollback is one `cp`.

Two traps worth writing down:

- If you transform the vhost with a regex, the replacement must re-emit **every** capture
  group. Dropping the `</VirtualHost>` group yields a config that parses as an unclosed
  virtual host.
- Assert the result before reloading: two `<VirtualHost` openings, two `</VirtualHost>`
  closings, and the `ProxyPass`/`ProxyPreserveHost` directives present **only** in the `:443`
  block.

---

## 8. The deploy cron

`POST /crontab?action=AddCrontab` — every 2 minutes, `sType=toShell`. The row as it exists on
the box (id **104**):

| Field | Value |
|---|---|
| `name` | `amplifiedtraders-auto-deploy` |
| `type` | `minute-n` (the panel renders this as "Every 2 Minutes") |
| `where1` | `2` |
| `sType` | `toShell` |
| `sName` | *(empty — a shell task, not a URL task)* |
| `status` | `1` (active) |

Body (`sBody`):

```sh
cd /www/wwwroot/amplifiedtraders.com && sh infrastructure/deploy/deploy.sh >> /var/log/amplifiedtraders-deploy.log 2>&1
```

Notes:

- **No `PATH` export in the cron body.** Cron shells carry a minimal `PATH`, but `deploy.sh`
  sets its own (`export PATH="/www/server/nodejs/v24.18.0/bin:$PATH"`) and then resolves
  `node`/`pnpm`/`pm2` against a list of known locations.
- The script is invoked with `sh`, so it must stay POSIX-compatible — no bashisms.
- The body must be **one line**. A multi-line `sBody` is not reliably preserved by the panel.
- Sibling crons on this box belong to **other** projects (gthubx, aglotrends, copinex). Do not
  touch them.

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

Then the two checks that matter most, because they are the ones that catch a misconfigured
vhost:

```sh
# the repository is NOT reachable through the vhost -- every one must be 404
for p in /package.json /prisma/schema.prisma /infrastructure/deploy/deploy.sh /.git/config /.env; do
  printf '%-40s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://amplifiedtraders.com$p")"
done

# http redirects to https, but the ACME challenge path must NOT
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' http://amplifiedtraders.com/pricing
curl -s -o /dev/null -w '%{http_code}\n' http://amplifiedtraders.com/.well-known/acme-challenge/probe

# the admin console is guarded -- 307 to /admin/login without a session
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://amplifiedtraders.com/admin
```

With a valid admin session the same request returns `200`:

```sh
curl -s -c /tmp/at.jar -H 'Content-Type: application/json' \
  --data-binary @login.json https://amplifiedtraders.com/api/admin/auth/login
curl -s -o /dev/null -b /tmp/at.jar -w '%{http_code}\n' https://amplifiedtraders.com/admin
```

> Pass the JSON body **from a file** (`--data-binary @file.json`). Passing it inline on Windows
> mangles the quotes and the server answers `400` — which looks like a login failure but is a
> client-side quoting bug.

Then walk the product: register a member, log in, submit a deposit, confirm it as an admin,
and check the wallet balance and the ledger entry.

---

## 10. What the deploy script does, in order

1. Lock (`/tmp/amplifiedtraders-deploy.lock`), with stale-lock detection by PID.
2. Preflight: the checkout exists, the toolchain resolves, **`.env` exists and has a
   `DATABASE_URL`**. A deploy without a database is refused.
3. `git fetch --prune origin` + `git reset --hard origin/main`.
4. If the commit is unchanged, health check only — no rebuild.
5. **CI gate**: refuses to deploy a commit whose GitHub checks are red. The gate reads
   `/commits/{sha}/check-runs` **with a cache-buster** — GitHub serves cached GET responses, and a
   stale snapshot reported a finished check as `queued`, which burned the whole wait and then
   shipped the commit unverified. The three outcomes are deliberately different:
   - `RED` → **refuse** (the commit failed CI).
   - `UNKNOWN` (GitHub unreachable) → **proceed, fail-open**, logged loudly.
   - `PENDING`/`NONE` past `CI_WAIT_SECONDS` → **refuse**. A wait that expired means "CI has not
     blessed this commit yet", which is not the same claim as "CI is unreachable". The cron retries
     in two minutes, by which time CI has finished; shipping unverified code would defeat the gate.
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
| Panel says `IP validation failed, your access IP is[1.2.3.4]` | The egress IP rotated off the whitelist | Whitelist the address it prints. The egress IP **flaps** between addresses, so both may be needed. The deploy cron is unaffected — it runs on the server, not through your IP |
| Panel returns the ingress page for a call you know worked | The request went to the bare panel root instead of a module path | The client helper takes a path (`/crontab?action=GetCrontab`), not module/action pairs |
| `SaveFileBody` says `Configuration file not exist` | It overwrites but cannot create | `CreateFile` first, then save (§5) |
| `CreateFile` then save fails with `Permission denied (Errno 13)` | The file was staged under `/tmp` | Stage inside the site webroot (§5) |
| `Connection refused` on the panel port | Wrong port, or the panel's port changed | Check the panel URL |
| Deploy log says `another deploy is already running` | A previous deploy is wedged | Check the lock dir's PID; the script clears a stale one automatically |
| Deploy log says `no .env` | The secrets file is missing | Recreate it (§5) |
| Deploy log says `content assertion failed` | The seed did not land | Run `pnpm db:seed:content` manually and read the error |
| Site shows the aaPanel placeholder | The vhost was never replaced | §7 |
| Site shows the aaPanel placeholder *and* the repo downloads | The vhost is serving the checkout directly | §7.1 — this is a leak, not a cosmetic bug |
| `httpd -t` reports `<VirtualHost> was not closed` | A transform dropped a capture group | §7.4 — re-emit every group |
| Site is 502 | The app is not running | `pm2 status`, `pm2 logs amplifiedtraders-web` |
| `pnpm install` fails on the lockfile | The server's pnpm is a different major | The script retries without `--frozen-lockfile`; fix the server's pnpm to 11.12.0 |
| `pnpm` fails with `detected dubious ownership` | Another cron's `git config --global` raced on `/root/.gitconfig.lock` | The scripts use `git -c safe.directory='*'` per invocation; never write the global config |
| `https://www...` shows a certificate warning | The cert's SAN list has no `www` | §7.3 — re-issue; do not remove the `www` alias, the content is correct |
| ACME renewal fails | The challenge path is being proxied or redirected | §7.2 — keep the carve-out |
