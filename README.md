# Amplified Traders

> Status: **BUILT — Phases 1–4 implemented and verified.** Public marketing site,
> auth + RBAC, and the member portal (dashboard, community, support, transactions,
> verification, notifications, settings). Typecheck clean · **121 tests green** ·
> production build clean · verified live on **:3600**.
> Start at [`docs/PLAN.md`](docs/PLAN.md) · [`docs/BRAND.md`](docs/BRAND.md) ·
> [`docs/CONCEPT.md`](docs/CONCEPT.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## What this is
**Amplified Traders** — a digital trading community (not a broker) bundling four
pillars under the **AMPLIFY** sub-brand: **Amplify Trade** (copy trading),
**Amplify Invest** (investment packages), **Amplify Network** (referral), and
**Amplify Community**.

**Your Trading. Your Network. Amplified.**

## Stack
Next.js 16.4 (App Router / RSC / Turbopack) · React 19.3 · TypeScript strict ·
Tailwind 4 · Prisma 7.10 + `@prisma/adapter-pg` · PostgreSQL 16 (`:5433`) ·
Zod 4 · Vitest 5 · pnpm 11.12. Compensation engine ported into `lib/engine`
(pure TS, integer cents).

## Getting started
```bash
pnpm install                 # runs prisma generate (postinstall)
cp .env.example .env         # then set DATABASE_URL + AUTH_SECRET
pnpm db:deploy               # apply migrations
pnpm db:seed                 # idempotent seed (pools, settings, nav)
pnpm dev                     # http://localhost:3600
```

Gates:
```bash
pnpm typecheck               # tsc --noEmit
pnpm test                    # vitest run
pnpm build                   # next build
```

## Layout
```
AmplifiedTraders/
  app/                 routes: public site, auth, dashboard, api
  components/          site/ · home/ · ui/ · dashboard/ · auth/
  lib/                 auth, prisma, money, validators, engine/
  prisma/              schema.prisma · migrations/ · seed.ts
  tests/               engine + auth + money (121 tests)
  docs/
    BRAND.md           brand book (source of truth)
    CONCEPT.md         thesis, pillars, regulatory posture, decisions
    BRIEF.md           project brief (stack, modules, integrations)
    AUDIT.md           Phase 1 audit
    ARCHITECTURE.md    data model, RBAC, API, security
    PLAN.md            decisions + phased roadmap  ← start here
    BUILD_LOG.md       what was built, phase by phase
  README.md            this file
```

## Compliance guardrails (non-negotiable)
- No guaranteed / implied-return language anywhere.
- Persistent risk notice on public surfaces.
- Referral compensation derives from **product revenue, never recruitment**.
- KYC/AML before any custody of funds.
