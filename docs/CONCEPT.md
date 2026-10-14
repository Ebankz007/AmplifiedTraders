# Amplified Traders — Concept

*Working document. Brand captured in [`BRAND.md`](BRAND.md). Build tracked in
[`BUILD_LOG.md`](BUILD_LOG.md).*

---

## 1. One-paragraph thesis
Amplified Traders is a **digital trading community** — not a broker. It bundles four
pillars into one platform: **copy trading** (Amplify Trade), **structured investment
packages** (Amplify Invest), a **referral/network** layer (Amplify Network), and a
**trader community** (Amplify Community). It targets retail participants who want
exposure to financial markets but lack the skill or time to trade directly, and who
are motivated by community, status, and referral income.

## 2. The problem
Retail traders and would-be investors face three gaps: (a) they can't trade well
themselves; (b) they can't reliably find good managers; (c) they trade alone. The
platform's answer is to let them follow proven traders, park money in packages, and
be rewarded for growing the community.

## 3. Who it's for
Primary: retail participants (aspirational, community-driven, referral-motivated).
Secondary: traders who want a distribution channel and followers.

## 4. What it displaces
The incumbent: standalone brokers (MT5/CFD) and copy-trading plugins (MQL5 signals,
ZuluTrade, etc.). The pitch is **ecosystem over tool** — copy + invest + network +
community in one place, wrapped in a modern fintech brand.

## 5. The four pillars
| Pillar | Promise | Mechanism |
|--------|---------|-----------|
| **Amplify Trade** | Follow. Learn. Participate. | Mirror selected traders' activity |
| **Amplify Invest** | Structured opportunities. Clear expectations. | Structured participation tiers |
| **Amplify Network** | Grow your network. Grow your influence. | Referral network + community growth benefits |
| **Amplify Community** | Trade together. Learn together. | Education, discussions, insights, events |

## 6. Business model
**Locked 2026-10-14.** Registration fee **$50** + platform fee **$5** (gross **$55**).
The **$5 is per gateway payment** (registration, deposits, package payments), not
per-registration. The registration fee is the anchor that denominates every split,
bonus, and pool:

- Top split: **45% reserve / 55% community**.
- Community pool: direct referral **30** / generation **10** / rank **8** / leadership **7**.
- Generation bonuses: **4 / 2 / 1.5 / 1.5 / 1**.
- Rank milestone rewards: **absolute amounts** (not fee-derived).

See `lib/engine/constants.ts` for the canonical figures.

## 7. Regulatory posture  ⚠️  *(Kairos analysis — read before building)*
**This model carries a high structural risk profile.** Engineering can be clean; the
model is NOT regulatory-safe as framed. Pillar by pillar:

- **Amplify Invest — highest risk.** "Structured investment packages" that pool member
  money and imply returns read as an **unlicensed collective investment scheme /
  deposit-taking / securities offering** in most jurisdictions. Fixed or implied-return
  language is disqualifying.
- **Amplify Network — pyramid/MLM risk.** If referral rewards are funded by
  **recruitment or new deposits** rather than by **recurring trading revenue**
  attributable to active referred users, it is an unlicensed pyramid.
- **Amplify Trade — licensing risk.** Curated/auto-copied trading can be
  **discretionary portfolio management**; signals/insights can be **investment advice**.
- **Amplify Community — low risk alone**, but performance claims and "insights" can cross
  into advice/advertising rules.
- **Cross-cutting:** fund custody → money transmission; "global" → multi-jurisdiction;
  return/performance claims → advertising rules.

**Constructive reframe (keeps the brand, defuses the risk):**
1. Reframe Amplify Invest as **managed accounts / discretionary mandates** or
   **revenue-share on realized trading performance** — never fixed/implied returns.
2. Fund Amplify Network rewards **only from recurring product revenue**; kill
   recruitment-funded bonuses, forced matrix, and spillover; cap depth and claims.
3. No guaranteed-return language anywhere; all performance claims disclaimed.
4. **KYC/AML before any custody of funds.**
5. **Written local counsel per target market before launch.** Non-negotiable.

## 8. Custody decision
**Decision A = no-custody — LOCKED (2026-10-14).** The platform never holds client
funds. Packages are non-custodial participation tiers; referral rewards derive from
product revenue, never recruitment. This is the low-regulatory-risk posture and it
determines the architecture of the Amplify Invest pillar.

## 9. Primary risk (premortem)
*Assume Amplified Traders failed in 18 months — write the cause.* Leading candidate: the
referral/investment structure attracted the wrong users (recruiters, not traders),
regulators moved, funds were frozen, and the brand could not outrun the model.

---

## Decision log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-11 | Brand identity captured (`BRAND.md`) | Henry's brief; locked as source of truth |
| 2026-10-11 | Regulatory posture flagged high-risk | Must resolve before build |
| 2026-10-11 | Phase 1 audit + Phase 2 plan produced | `AUDIT.md`, `ARCHITECTURE.md`, `PLAN.md`, `BRIEF.md` |
| 2026-10-14 | **Decision A = no-custody — LOCKED** | Low regulatory risk; determines Invest architecture |
| 2026-10-14 | Business model locked: $50 registration + $5 platform fee | Anchor for every split/bonus/pool |
| 2026-10-14 | Build on Next 16 / Prisma 7 / PG16, integer-cents money | Verified stack; fixes Float-money debt |
| 2026-10-14 | Distinct design identity: Electric Blue + Amplified Gold | One palette per project |
