#!/bin/sh
# Amplified Traders auto-deploy — runs on the LIVE server.
#
# Triggered by a 2-minute aaPanel cron poll of origin/main. Idempotent: no new
# commit -> health check only, no rebuild. It is triggered unattended, so it
# must be fully non-interactive and fail LOUDLY: any failed step aborts before
# the next one runs, and a failed health check rolls back to the previous
# commit.
#
# One-time server setup: see infrastructure/deploy/DEPLOY-AA-PANEL.md
# Secrets live ONLY in .env on the server — never in this file, never in git.
#
# ── Design notes ───────────────────────────────────────────────────────────
# - Always deploys origin/main HEAD, whatever branch was pushed (a feature
#   branch push triggers a harmless no-op redeploy, never a wrong deploy).
# - A commit is deployed only when its GitHub CI checks passed. CI red => the
#   deploy is refused. GitHub unreachable => the deploy proceeds, loudly.
# - ORDER MATTERS: install -> generate -> migrate -> seed -> assert -> build.
#   The marketing pages and the blog post routes are PRERENDERED at build time
#   from the database, so a build that runs before the seed ships a real-looking
#   but EMPTY site — and the health check would still pass, because those pages
#   are static files. The assert step closes that hole.
# - The build goes to a staging directory and is swapped in only once it is
#   complete, so a failed build never takes the live bundle down.
# - Rollback = previous commit + reinstall + rebuild + restart. The database is
#   NOT rolled back (migrations are forward-only by design).
# - The app is ONE Next.js server: marketing site, member portal, admin console
#   and API routes are all a single process.
# ───────────────────────────────────────────────────────────────────────────

set -eu

# ── Configure these for the server ─────────────────────────────────────────
APP_DIR="/www/wwwroot/amplifiedtraders.com"   # server checkout of this repo
BRANCH="main"
APP_PORT="3300"                 # free on this host: 3000/3100/3200/4000/4001 are taken
APP_NAME="amplifiedtraders-web"
REPO="Ebankz007/AmplifiedTraders"
# Require a green GitHub CI run for the commit being deployed.
# 1 = refuse to deploy a red commit, 0 = deploy whatever is on main.
REQUIRE_CI_GREEN="1"
# How long to wait for CI to finish before giving up on the gate (seconds).
CI_WAIT_SECONDS="240"
# Absolute node/pnpm path: cron shells carry a minimal PATH.
export PATH="/www/server/nodejs/v24.18.0/bin:$PATH"
# ───────────────────────────────────────────────────────────────────────────

# Operator overrides that do not belong in git (port, app dir). Optional.
if [ -f "$APP_DIR/deploy.env" ]; then
  # shellcheck disable=SC1091
  . "$APP_DIR/deploy.env"
  log_override="1"
fi

LOCK_DIR="/tmp/amplifiedtraders-deploy.lock"
DEPLOY_LOG="$APP_DIR/deploy.log"
HEALTH_API="http://127.0.0.1:${APP_PORT}/api/health"
HEALTH_SITE="http://127.0.0.1:${APP_PORT}/"

log() { echo "[deploy $(date '+%Y-%m-%dT%H:%M:%S')] $1"; }
fail() { log "FAILED: $1"; exit 1; }

# ── Locate the toolchain ───────────────────────────────────────────────────
# Cron shells carry a minimal PATH, and aaPanel's node lives in a versioned
# directory. Resolve each binary explicitly and fail EARLY, naming the missing
# one, rather than dying halfway through a deploy.
resolve_bin() {
  _name="$1"
  if command -v "$_name" >/dev/null 2>&1; then
    command -v "$_name"
    return 0
  fi
  for _p in /www/server/nodejs/*/bin/"$_name" /usr/local/bin/"$_name" /usr/bin/"$_name" \
            /root/.nvm/versions/node/*/bin/"$_name"; do
    if [ -x "$_p" ]; then
      echo "$_p"
      return 0
    fi
  done
  return 1
}

# ── Run lock ──────────────────────────────────────────────────────────────
# The cron poll fires every 2 minutes; a full build takes longer than that.
# Without a lock two runs race: one rebuilds while the other resets the tree
# mid-build, and the server ends up serving a half-written bundle. `mkdir` is
# atomic on POSIX, so it is a reliable lock; a stale lock (holder killed
# mid-deploy) is detected by PID and cleared.
acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo $$ > "$LOCK_DIR/pid"
    return 0
  fi
  if [ -f "$LOCK_DIR/pid" ]; then
    holder="$(cat "$LOCK_DIR/pid" 2>/dev/null || echo "")"
    if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
      log "another deploy is already running (pid $holder) — skipping this run"
      return 1
    fi
    log "clearing stale lock from pid ${holder:-unknown}"
    rm -rf "$LOCK_DIR"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      echo $$ > "$LOCK_DIR/pid"
      return 0
    fi
  fi
  log "another deploy is already running — skipping this run"
  return 1
}

release_lock() { rm -rf "$LOCK_DIR"; }

acquire_lock || exit 0
trap 'release_lock' EXIT INT TERM

# ── Process control ───────────────────────────────────────────────────────
# (Re)start with a FRESH environment. Never `pm2 restart`: it preserves the old
# env, so a changed .env would silently not apply.
start_process() {
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  ( cd "$APP_DIR" && pm2 start node_modules/next/dist/bin/next --name "$APP_NAME" -- start -p "$APP_PORT" ) || return 1
  pm2 save >/dev/null 2>&1 || true
  return 0
}

check_health() {
  curl -sf -m 10 "$HEALTH_API" >/dev/null 2>&1 || return 1
  curl -sf -m 10 "$HEALTH_SITE" >/dev/null 2>&1 || return 1
  return 0
}

# ── Preflight ──────────────────────────────────────────────────────────────
[ -d "$APP_DIR/.git" ] || fail "APP_DIR $APP_DIR is not a git checkout"
cd "$APP_DIR"

GIT_BIN="$(resolve_bin git)"   || fail "git not found"
NODE_BIN="$(resolve_bin node)" || fail "node not found"
PNPM_BIN="$(resolve_bin pnpm)" || fail "pnpm not found"
PM2_BIN="$(resolve_bin pm2)"   || fail "pm2 not found"
CURL_BIN="$(resolve_bin curl)" || fail "curl not found"
PATH="$(dirname "$NODE_BIN"):$(dirname "$PNPM_BIN"):$(dirname "$PM2_BIN"):$PATH"
export PATH

# The secrets file must exist and must carry a DATABASE_URL. A deploy without
# a database would publish a site with no data and no way back.
[ -f "$APP_DIR/.env" ] || fail "no .env in $APP_DIR — the server secrets file is missing"
grep -q '^DATABASE_URL=' "$APP_DIR/.env" || fail ".env has no DATABASE_URL — refusing to deploy"

# Trust the working directory per invocation, never through the shared global
# git config: every project on this host writes to that config concurrently and
# they collide on /root/.gitconfig.lock, which under `set -e` would abort the
# deploy for a reason that has nothing to do with this commit.
GIT_SAFE="-c safe.directory=*"

PREV_COMMIT="$("$GIT_BIN" $GIT_SAFE rev-parse HEAD)"
log "previous commit: $PREV_COMMIT"

log "fetching origin/$BRANCH…"
"$GIT_BIN" $GIT_SAFE fetch --prune origin || fail "git fetch failed (network or remote down)"

log "resetting to origin/$BRANCH…"
"$GIT_BIN" $GIT_SAFE reset --hard "origin/$BRANCH" || fail "git reset failed"

NEW_COMMIT="$("$GIT_BIN" $GIT_SAFE rev-parse HEAD)"

# The commit that was last BUILT and deployed successfully. `deploy.log` is
# appended to only after a healthy deploy, so it is the ground truth for "what
# is actually running" — NOT `git rev-parse HEAD`.
LAST_DEPLOYED=""
if [ -f "$DEPLOY_LOG" ]; then
  LAST_DEPLOYED="$(sed -n 's/^\([0-9a-f]\{40\}\).*/\1/p' "$DEPLOY_LOG" 2>/dev/null | tail -n 1 || true)"
fi
log "last deployed commit: ${LAST_DEPLOYED:-none}"

# ── Nothing new? Then only verify health. ─────────────────────────────────
if [ "$NEW_COMMIT" = "$PREV_COMMIT" ] && [ "$NEW_COMMIT" = "$LAST_DEPLOYED" ]; then
  if check_health; then
    log "HEALTHY on $NEW_COMMIT — nothing to do"
    exit 0
  fi
  log "up to date but UNHEALTHY — restarting the app once"
  start_process || fail "restart failed while up to date"
  sleep 15
  if check_health; then
    log "HEALTHY after restart — nothing to do"
    exit 0
  fi
  fail "UNHEALTHY and already on latest — needs a human, not a rebuild"
fi

if [ "$NEW_COMMIT" = "$PREV_COMMIT" ]; then
  log "tree is at $NEW_COMMIT but the last build was ${LAST_DEPLOYED:-none} — forcing rebuild"
else
  log "deploying $PREV_COMMIT → $NEW_COMMIT"
fi

# ── CI gate ───────────────────────────────────────────────────────────────
# Deploy only what CI blessed. The cron poll usually fires before the workflow
# has had a chance to start, so PENDING and NONE are waited out, not failed.
if [ "$REQUIRE_CI_GREEN" = "1" ]; then
  log "checking CI status for $NEW_COMMIT…"
  waited=0
  ci="NONE"
  while [ "$waited" -lt "$CI_WAIT_SECONDS" ]; do
    ci="$(node "$APP_DIR/infrastructure/deploy/ci-gate.mjs" "$NEW_COMMIT" 2>/dev/null || echo UNKNOWN)"
    case "$ci" in
      GREEN)  log "CI is GREEN for $NEW_COMMIT"; break ;;
      RED)    fail "CI is RED for $NEW_COMMIT — refusing to deploy" ;;
      UNKNOWN) log "CI status UNKNOWN (GitHub unreachable) — proceeding, fail-open"; break ;;
      *)      log "CI $ci — waiting ($waited/${CI_WAIT_SECONDS}s)"; sleep 20; waited=$((waited + 20)) ;;
    esac
  done
  case "$ci" in
    GREEN|UNKNOWN) : ;;
    RED) fail "CI is RED for $NEW_COMMIT — refusing to deploy" ;;
    *)   log "CI never finished (last: $ci) — proceeding, fail-open" ;;
  esac
fi

# ── Build the bundle into a staging dir, then swap it in ──────────────────
# `next build` wipes its output directory, so building straight into `.next`
# would delete the chunks the live server is serving. The swap only happens
# after a clean build; if anything is missing, we fail BEFORE touching the
# live bundle.
STAGE_DIR=".next-staging"

build_bundle() {
  rm -rf "$APP_DIR/$STAGE_DIR"
  ( cd "$APP_DIR" && NEXT_DIST_DIR="$STAGE_DIR" pnpm build ) || return 1
  [ -f "$APP_DIR/$STAGE_DIR/BUILD_ID" ] || { log "staging build produced no BUILD_ID — live bundle left untouched"; return 1; }
  rm -rf "$APP_DIR/.next.previous"
  if [ -d "$APP_DIR/.next" ]; then
    mv "$APP_DIR/.next" "$APP_DIR/.next.previous" || return 1
  fi
  mv "$APP_DIR/$STAGE_DIR" "$APP_DIR/.next" || return 1
  rm -rf "$APP_DIR/.next.previous"
  return 0
}

rollback() {
  log "health check FAILED — rolling back to $PREV_COMMIT"
  "$GIT_BIN" $GIT_SAFE reset --hard "$PREV_COMMIT" || log "rollback: git reset failed"
  ( cd "$APP_DIR" && pnpm install --frozen-lockfile ) >/dev/null 2>&1 || log "rollback: install failed"
  ( cd "$APP_DIR" && pnpm db:deploy ) >/dev/null 2>&1 || log "rollback: migrate failed (migrations are forward-only)"
  build_bundle >/dev/null 2>&1 || log "rollback: build failed"
  start_process >/dev/null 2>&1 || log "rollback: restart failed"
  fail "rolled back to $PREV_COMMIT — inspect the server, then push a fix"
}

# ── Release ───────────────────────────────────────────────────────────────
log "installing dependencies…"
# --frozen-lockfile is the contract: the lockfile must not drift on the
# server. If the server's pnpm is a different major, that check fails on a
# version mismatch rather than on a real problem — retry once without it, and
# say so, rather than stalling every deploy.
if ! ( cd "$APP_DIR" && pnpm install --frozen-lockfile ); then
  log "frozen-lockfile install failed — retrying without it (pnpm version drift?)"
  ( cd "$APP_DIR" && pnpm install ) || fail "pnpm install failed"
fi

log "generating the Prisma client…"
( cd "$APP_DIR" && pnpm db:generate ) || fail "prisma generate failed"

log "running database migrations…"
( cd "$APP_DIR" && pnpm db:deploy ) || fail "migrations failed — the database is untouched by later steps, fix and re-push"

log "seeding the administrator…"
( cd "$APP_DIR" && pnpm db:seed ) || fail "admin seed failed"

log "seeding the public content…"
( cd "$APP_DIR" && pnpm db:seed:content ) || fail "content seed failed"

log "asserting the content actually landed…"
( cd "$APP_DIR" && pnpm tsx infrastructure/deploy/assert-content.ts ) || fail "content assertion failed — the seed did not land; refusing to publish an empty site"

log "building…"
build_bundle || fail "build failed — the live bundle was left untouched"

log "restarting the app (fresh env)…"
start_process || fail "process start failed"

log "health-checking (up to 60s)…"
healthy=0
i=0
while [ "$i" -lt 12 ]; do
  sleep 5
  i=$((i + 1))
  if check_health; then
    healthy=1
    break
  fi
  log "health attempt $i/12 not ready yet…"
done
if [ "$healthy" -ne 1 ]; then
  rollback
fi

log "DEPLOYED $NEW_COMMIT — app healthy"
echo "$NEW_COMMIT $(date -u +%FT%TZ)" >> "$DEPLOY_LOG"
