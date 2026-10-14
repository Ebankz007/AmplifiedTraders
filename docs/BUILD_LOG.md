# Amplified Traders — Build Log

*The living checklist. Updated as work progresses.*

## Phase status

| Phase | Scope | Status |
|---|---|---|
| **0. Audit + plan** | BRIEF · AUDIT · ARCHITECTURE · PLAN | ✅ 2026-10-11 |
| **1. Scaffold + design system** | Next 16 app · brand tokens · primitives · public shell | ✅ 2026-10-14 |
| **2. Database + engine** | Prisma schema · migration · seed · compensation engine · integer-cents money | ✅ 2026-10-14 |
| **3. Auth + RBAC** | Sessions · register/login/reset · RBAC matrix (6 roles) · rate limiting | ✅ 2026-10-14 |
| **4. Client portal** | dashboard · community · support · transactions · verification · notifications · settings | 🟡 partial |
| **5. Admin + Superadmin** | ops admin + superadmin (roles · settings · integrations · audit · reports) | ⬜ |
| **6. Engine integration** | referral tree · commissions · ranks · pools · payouts · immutable ledger | ⬜ |
| **7. Integrations** | payments · email · WhatsApp/Telegram · KYC adapters + webhooks | ⬜ |
| **8. Hardening + deploy** | OWASP · a11y (WCAG 2.2 AA) · responsive · SEO · perf · aaPanel · backups | ⬜ |

## Phase 1 — done (2026-10-14)

**Stack:** Next.js 16.4.0 · React 19.3.0 · TypeScript strict · Tailwind 4 · Zod 4 ·
Vitest 5 · pnpm 11.12.0. Dev/start port **3600**. Git repo `main`.

**Design system** (`app/globals.css`, single re-skin point) — a distinct identity:
- **Colours:** Deep Navy `#0B1220` (background) · **Electric Blue `#2F80ED`** (primary /
  action) · **Amplified Gold `#F5B942`** (reward accent) · Dark Gray `#171C26` (surface) ·
  White. Blue is the primary; gold is the reward accent — never the base.
- **Fonts:** **Space Grotesk** (display) · **Inter** (body) · **JetBrains Mono** (mono).
- **Signature motif:** the **network field** (connected nodes) — `.net-field`, `.node-dot`.

**Files**
```
package.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.mts
pnpm-workspace.yaml .gitignore .env.example next-env.d.ts
app/globals.css app/layout.tsx app/page.tsx app/not-found.tsx app/robots.ts app/sitemap.ts
components/ui/{button,card,badge}.tsx
components/site/{logo,navbar,footer,reveal}.tsx
components/home/{hero,pillars,final-cta}.tsx
lib/utils.ts
tests/utils.test.ts
```

**Public shell:** `hero` (centred + network ribbon) · `pillars` (asymmetric bento — the
four AMPLIFY pillars) · `final-cta` (gold-accented band) · `navbar` (pill nav + blue→gold
hairline) · `footer` (sub-brand strip + risk notice) · `logo` ("A" mark + wordmark).

## Phase 2 — done (2026-10-14)

**Decision A = no-custody — LOCKED.** The platform never holds client funds; packages are
non-custodial participation tiers; referral rewards derive from product revenue, never
recruitment.

**Engine** → `lib/engine` (11 modules: `constants`, `types`, `money`, `allocation`,
`network`, `compression`, `bonuses`, `matrix`, `ranks`, `pools`, `index`), pure TS.
Tests → `tests/engine` (10 files) + `tests/money.test.ts`.

**Money model:** integer **cents** (`Int`) throughout — no `Float`, no `Decimal`.
`Package` / `PackageSubscription` deliberately carry **no return/APY fields**.

**Business model:** registration fee **$50** + platform fee **$5** (gross **$55**) —
`REGISTRATION_FEE_CENTS=5000`, `PLATFORM_FEE_CENTS=500`, `REGISTRATION_GROSS_CENTS=5500`.
The **$5 is per gateway payment** (registration, deposits, package payments), not
per-registration. Sharing formula (45/55 top split; community 30/10/8/7; generation
4/2/1.5/1.5/1) applied to the $50 base. Derived: reserve 45% = $22.50, community pool 55%
= $27.50 (direct $15.00 / generation $5.00 / rank $4.00 / leadership $3.50); generation
bonuses $2.00 / $1.00 / $0.75 / $0.75 / $0.50. Rank milestone rewards are **absolute
amounts, not fee-derived**.

**Files**
```
prisma/schema.prisma        # Decision A, ~49 models, integer cents
prisma.config.ts            # Prisma 7 — datasource URL lives here, not in schema
lib/prisma.ts               # PrismaClient + PrismaPg adapter singleton
lib/money.ts                # cents <-> display bridge
lib/engine/*.ts             # 11 modules
tests/engine/*.test.ts      # 10 files
tests/money.test.ts         # 11 tests
.env                        # gitignored
```

**Database** — `amplifiedtraders` role + `amplifiedtraders` / `amplifiedtraders_test` DBs
on PG16 `:5433`; `CREATEDB` granted (migrate shadow DB).

| Gate | Result |
|---|---|
| `prisma validate` | ✅ valid — 2 relation errors found + fixed |
| `prisma generate` | ✅ client → `lib/generated/prisma` |
| migration `20261014101705_init` | ✅ applied · 51 tables · 36 enums · **all money `INTEGER`** |
| `pnpm db:seed` | ✅ 2 pools · 4 settings · 15 nav items — **idempotent** |

**Seed scope:** authoritative data only — bonus pools (RANK/LEADERSHIP), site settings
(identity / contact / compliance / social), navigation. **Not seeded** (needs business
input, not invention): Packages, Brokers, Traders, Testimonials, FAQ/blog content.

## Phase 3 — done (2026-10-14)

**Scope:** user + admin sessions, register / login / logout / verify-email /
forgot-password / reset-password, RBAC matrix (6 admin roles), rate limiting, audit trail,
email stub. **MFA scaffold deferred to Phase 8.**

**Auth model.** Two independent session tables — `UserSession` (cookie
`amplifiedtraders_session`) and `AdminSession` (cookie `amplifiedtraders_admin`). Tokens are
32-byte base64url random, stored **hashed** (SHA-256); the raw token exists only in the
cookie / email link. Sessions: 7-day TTL, httpOnly + sameSite=lax, revocable. Passwords:
**bcrypt cost 12**, capped at 72 bytes.

**RBAC.** 20 permissions across 6 `AdminRole`s; `permissionForAdminPath` **fails closed**
(unknown path → `null` → denied).

**Files**
```
lib/auth.ts lib/rbac.ts lib/password.ts lib/tokens.ts
lib/validators.ts lib/rate-limit.ts lib/audit.ts lib/http.ts
lib/notifications/email.ts
app/api/auth/{register,login,logout,verify-email,forgot-password,reset-password}/route.ts
app/(auth)/layout.tsx
app/(auth)/{login,register,forgot-password,reset-password,verify-email}/page.tsx
components/auth/{form-field,login-form,register-form,forgot-password-form,
                 reset-password-form,verify-email-panel}.tsx
tests/auth/{rbac,password,tokens,validators}.test.ts
```

**Design notes**
- **Register:** rate-limit → validate → 409 on duplicate → `referralCode` resolves to the
  **sponsor's user id** → user created `status=PENDING` → `UserSession` purpose
  `EMAIL_VERIFY`, 24 h TTL. `Referral` / `MatrixPosition` rows are **engine-owned — Phase 6**.
- **Login:** timing-equalised (dummy bcrypt compare when the email is unknown); `SUSPENDED`
  → 403; `PENDING` may still sign in (needs a session to reach the verify screen).
- **Forgot-password:** always returns the same ok response — no account enumeration.
- **Reset-password:** revokes **all** of the user's sessions in the same transaction.
- **Email stub:** logs the link in dev; in prod returns `{delivered:false, reason}` rather
  than faking success. Real SMTP lands in Phase 7.
- **Rate limits** (in-memory fixed window, single-process): login 10/15 m · register 5/1 h ·
  forgot 5/1 h · reset 10/1 h · verify 10/1 h.
- **Audit** (`recordAudit`) **throws on failure by design** — a trail that silently drops
  entries looks complete while lying.

## Phase 4 — partial (2026-10-14)

**Shipped:** member dashboard shell + `community` (feed + composer + comments),
`support` (ticket list · thread · new), `transactions`, `verification`, `notifications`,
`settings`. API: `/api/community/posts`, `/api/community/posts/[id]/comments`,
`/api/support`, `/api/support/[id]/messages`, `/api/account/profile`,
`/api/account/notifications/read-all`.

**Not yet:** copy-trading, investment packages, network/commissions, wallet surfaces.

**Bug found + fixed during verification:** `app/dashboard/community/page.tsx` counted
comments (`_count.comments`) but never **included** the `comments` relation, so the feed
rendered no replies and the query did not typecheck. Added the filtered `comments` include
(`status: PUBLISHED`, ordered, with author).

## Verification (2026-10-14)

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ clean |
| `pnpm test` | ✅ **121/121 green** (16 files) |
| `pnpm build` | ✅ clean — **28 routes** |
| Live smoke (`next start` :3600) | ✅ `/` 200 (brand present, old name absent) · `/login` 200 |

## Next
1. Finish Phase 4: copy-trading, packages, network/commissions, wallet surfaces.
2. Seed business content once supplied (packages, brokers, testimonials).
3. Phase 5 (admin + superadmin) → Phase 6 (engine integration) → Phase 7 (integrations).
