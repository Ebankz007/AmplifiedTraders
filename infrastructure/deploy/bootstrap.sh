#!/bin/sh
# Amplified Traders server bootstrap — stage 1 (no traffic).
#
# Run ONCE, as root, on the target server, AFTER the database and the site
# vhost exist. It prepares the checkout and starts the app; it does not open
# the vhost to the public. See infrastructure/deploy/DEPLOY-AA-PANEL.md for
# the full sequence (panel steps first, then this).
#
# It is idempotent: safe to re-run to repair a half-finished setup. It never
# overwrites an existing .env — the secrets file is written once, by hand, and
# this script only asserts it is present.
#
# Every git call carries `-c safe.directory='*'` instead of writing the global
# git config. That config is shared by every project on this host, and the
# sibling auto-deploys write to it at the same time, so they collide on
# /root/.gitconfig.lock. Under `set -e` that collision aborted this script.
# A per-invocation override touches no shared state and cannot lose the race.
#
# Secrets are NOT passed as arguments (they would land in the process table
# and in shell history). They live in .env, which this script requires.

set -eu

APP_DIR="${AT_APP_DIR:-/www/wwwroot/amplifiedtraders.com}"
BRANCH="${AT_BRANCH:-main}"
APP_PORT="${AT_APP_PORT:-3300}"
APP_NAME="${AT_APP_NAME:-amplifiedtraders-web}"
REPO_URL="${AT_REPO_URL:-https://github.com/Ebankz007/AmplifiedTraders.git}"

export PATH="/www/server/nodejs/v24.18.0/bin:$PATH"

log() { echo "[bootstrap $(date '+%Y-%m-%dT%H:%M:%S')] $1"; }
fail() { log "FAILED: $1"; exit 1; }

resolve_bin() {
  _name="$1"
  if command -v "$_name" >/dev/null 2>&1; then command -v "$_name"; return 0; fi
  for _p in /www/server/nodejs/*/bin/"$_name" /usr/local/bin/"$_name" /usr/bin/"$_name"; do
    if [ -x "$_p" ]; then echo "$_p"; return 0; fi
  done
  return 1
}

log "target: $APP_DIR (port $APP_PORT)"

# ── 1. Checkout ───────────────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "checkout already exists — fetching"
  cd "$APP_DIR"
  git -c safe.directory='*' fetch --prune origin || fail "git fetch failed"
  git -c safe.directory='*' reset --hard "origin/$BRANCH" || fail "git reset failed"
else
  log "creating the checkout"
  mkdir -p "$(dirname "$APP_DIR")"
  git -c safe.directory='*' clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR" || fail "git clone failed"
  cd "$APP_DIR"
fi
log "checked out $(git -c safe.directory='*' rev-parse --short HEAD)"

# ── 2. Toolchain ──────────────────────────────────────────────────────────
GIT_BIN="$(resolve_bin git)"   || fail "git not found"
NODE_BIN="$(resolve_bin node)" || fail "node not found"
PNPM_BIN="$(resolve_bin pnpm)" || fail "pnpm not found"
PM2_BIN="$(resolve_bin pm2)"   || fail "pm2 not found"
PATH="$(dirname "$NODE_BIN"):$(dirname "$PNPM_BIN"):$(dirname "$PM2_BIN"):$PATH"
export PATH

# ── 3. Secrets ────────────────────────────────────────────────────────────
# The secrets file is written once, out of band, by the operator (the panel's
# file API). This script only insists it exists and carries a DATABASE_URL.
if [ -f "$APP_DIR/.env" ]; then
  log ".env found — leaving it untouched"
else
  fail "no .env in $APP_DIR — write it first (see DEPLOY-AA-PANEL.md); this script will not create one"
fi
grep -q '^DATABASE_URL=' "$APP_DIR/.env" || fail ".env has no DATABASE_URL"

# ── 4. Dependencies, schema, seed ────────────────────────────────────────
log "installing dependencies…"
pnpm install --frozen-lockfile || fail "pnpm install failed"

log "generating the Prisma client…"
pnpm db:generate || fail "prisma generate failed"

log "running migrations…"
pnpm db:deploy || fail "prisma migrate deploy failed"

log "seeding the administrator…"
pnpm db:seed || fail "admin seed failed"

log "seeding the public content…"
pnpm db:seed:content || fail "content seed failed"

log "asserting the content landed…"
pnpm tsx infrastructure/deploy/assert-content.ts || fail "content assertion failed"

# ── 5. Build ──────────────────────────────────────────────────────────────
log "building…"
NEXT_DIST_DIR=".next-staging" pnpm build || fail "build failed"
[ -f "$APP_DIR/.next-staging/BUILD_ID" ] || fail "staging build produced no BUILD_ID"
rm -rf "$APP_DIR/.next.previous"
if [ -d "$APP_DIR/.next" ]; then mv "$APP_DIR/.next" "$APP_DIR/.next.previous"; fi
mv "$APP_DIR/.next-staging" "$APP_DIR/.next" || fail "failed to swap the bundle into place"
rm -rf "$APP_DIR/.next.previous"

# ── 6. Start ──────────────────────────────────────────────────────────────
log "starting the app under pm2…"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
( cd "$APP_DIR" && pm2 start node_modules/next/dist/bin/next --name "$APP_NAME" -- start -p "$APP_PORT" ) || fail "pm2 start failed"
pm2 save >/dev/null 2>&1 || true

# ── 7. Health ─────────────────────────────────────────────────────────────
log "health-checking…"
i=0
while [ "$i" -lt 12 ]; do
  sleep 5
  i=$((i + 1))
  if curl -sf -m 10 "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1; then
    log "HEALTHY — the app is up on 127.0.0.1:${APP_PORT}"
    log "next: open the vhost, register the 2-minute deploy cron, then verify the public URL"
    exit 0
  fi
  log "health attempt $i/12 not ready yet…"
done

fail "the app did not become healthy — check: pm2 logs $APP_NAME"
