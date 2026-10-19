/**
 * Amplified Traders — content seed.
 *
 * Separate from `prisma/seed.ts` on purpose. That script provisions *reference*
 * data the engine needs (settings, navigation, bonus pools, the first admin).
 * This one provisions *editorial* content: the marketing pages' copy, the
 * package tiers, the broker list, the trader profiles, the education library,
 * the FAQs and the blog.
 *
 * The rule, and it is the same rule as the reference seed (lesson 191):
 *
 *   CREATE-IF-ABSENT, NEVER UPDATE.
 *
 * This script provisions the *rows*; the admin console owns the *content*. A
 * re-run must never revert a sentence an operator has since rewritten, so every
 * write here is `update: {}` — an upsert that can only ever create.
 *
 * What is deliberately NOT here:
 *   - Testimonials. PLAN §2 forbids fabricated ones, and there are no real ones.
 *   - Any performance figure, return, yield or track record. `Trader` has an
 *     `illustrativeStats` field for past-only display; it is left null rather
 *     than filled with invented numbers.
 *   - Legal pages (`legal/*`). Those need counsel, not a copywriter — the
 *     public site renders honest "pending review" copy until Henry supplies it.
 *
 * Run: `pnpm db:seed:content`
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** A fixed instant, so a re-seed cannot reshuffle "published" ordering. */
const PUBLISHED = new Date("2026-01-12T09:00:00.000Z");

/* ============================================================ statistics === */

/**
 * The numbers band.
 *
 * Every one of these describes the platform's *design*, not its *traction*.
 * "Client funds held: None" is a fact about the custody model. "12,400 members"
 * would be a fact about the world that we would have to invent — so it is not
 * here. A stat that cannot be verified is not a stat, it is a claim.
 */
const STATS = [
  {
    id: "stat-asset-classes",
    label: "Asset classes",
    value: "4",
    note: "Foreign exchange, indices, metals and crypto CFDs.",
    order: 1,
  },
  {
    id: "stat-broker-connections",
    label: "Broker connections",
    value: "6",
    note: "Established retail venues. Availability is confirmed during onboarding.",
    order: 2,
  },
  {
    id: "stat-custody",
    label: "Client funds held",
    value: "None",
    note: "Capital stays with your own broker. Amplified Traders is non-custodial.",
    order: 3,
  },
  {
    id: "stat-support",
    label: "Support coverage",
    value: "24/5",
    note: "Across time zones, during the trading week.",
    order: 4,
  },
];

/* ============================================================== packages === */

/**
 * Participation tiers.
 *
 * The schema says it plainly: a Package is a tier of *guidance and membership*,
 * not a return-bearing product — which is why there are no rate or APY fields to
 * fill. The features below are therefore all about *access* (to education, to
 * the desk, to review sessions), never about money coming back.
 *
 * The floor of the first tier is the engine's own `MIN_FUNDING_CENTS` ($50), not
 * a number invented here.
 */
const PACKAGES = [
  {
    slug: "foundation",
    name: "Foundation",
    tier: 1,
    minCents: 5_000,
    maxCents: 99_900,
    riskLevel: "MEDIUM" as const,
    isFeatured: false,
    order: 1,
    summary:
      "Start with structured guidance and full access to the education library.",
    description:
      "The entry tier. It exists so a new participant can learn the mechanics and the risk discipline before committing meaningful capital, with the same access to education that every other tier receives.",
    features: [
      "Full education library",
      "Community access",
      "Copy-trading review access",
      "Email support",
    ],
  },
  {
    slug: "momentum",
    name: "Momentum",
    tier: 2,
    minCents: 100_000,
    maxCents: 999_900,
    riskLevel: "MEDIUM" as const,
    isFeatured: true,
    order: 2,
    summary:
      "For participants ready to allocate meaningfully and follow more than one strategy.",
    description:
      "Adds breadth: multiple strategy connections and a regular review of how your allocation is performing against the risk you set for it — not against a target return, which we do not publish.",
    features: [
      "Everything in Foundation",
      "Multiple strategy connections",
      "Monthly allocation review",
      "Priority support",
    ],
  },
  {
    slug: "summit",
    name: "Summit",
    tier: 3,
    minCents: 1_000_000,
    maxCents: null,
    riskLevel: "HIGH" as const,
    isFeatured: false,
    order: 3,
    summary:
      "A high-touch tier for larger allocations, with direct access to the desk.",
    description:
      "For larger allocations, where the cost of being wrong is highest. Adds direct access to the desk and a bespoke risk framework agreed before anything is connected.",
    features: [
      "Everything in Momentum",
      "Direct desk access",
      "Bespoke risk framework",
      "Quarterly strategy sessions",
    ],
  },
];

/* =============================================================== brokers === */

/**
 * Broker connections.
 *
 * Real, established retail venues. The descriptions are neutral and factual —
 * what the venue offers — and carry no implication of partnership, because there
 * is none to imply. The copy on /copy-trading is written to match: these are
 * venues you may already use, not venues we have signed.
 *
 * NOTE FOR HENRY: naming a real broker on a public page is a claim. Replace or
 * remove this list before launch unless each venue is genuinely one you support.
 */
const BROKERS = [
  {
    slug: "ic-markets",
    name: "IC Markets",
    url: "https://www.icmarkets.com",
    region: "Global",
    order: 1,
    description:
      "A multi-asset brokerage offering foreign exchange, indices, commodities and crypto CFDs.",
  },
  {
    slug: "pepperstone",
    name: "Pepperstone",
    url: "https://pepperstone.com",
    region: "Global",
    order: 2,
    description:
      "A brokerage focused on foreign exchange and CFD markets, with a multi-platform offering.",
  },
  {
    slug: "exness",
    name: "Exness",
    url: "https://www.exness.com",
    region: "Global",
    order: 3,
    description:
      "A multi-asset brokerage offering foreign exchange, metals, indices and crypto CFDs.",
  },
  {
    slug: "oanda",
    name: "OANDA",
    url: "https://www.oanda.com",
    region: "Global",
    order: 4,
    description:
      "A long-established foreign exchange brokerage serving retail and institutional clients.",
  },
  {
    slug: "ig",
    name: "IG",
    url: "https://www.ig.com",
    region: "Global",
    order: 5,
    description:
      "A global provider of CFDs, spread betting and foreign exchange.",
  },
  {
    slug: "interactive-brokers",
    name: "Interactive Brokers",
    url: "https://www.interactivebrokers.com",
    region: "Global",
    order: 6,
    description:
      "A multi-asset brokerage offering equities, options, futures, foreign exchange and funds.",
  },
];

/* =============================================================== traders === */

/**
 * Strategy archetypes.
 *
 * These are deliberately *not* people. Inventing a person with a track record
 * would be the same failure as inventing a testimonial — so each profile
 * describes an approach and its risk, and publishes no performance history at
 * all (`illustrativeStats` stays null).
 *
 * `Trader.userId` is unique and required, so each profile needs a User row. The
 * seed creates one with role TRADER, a random unguessable password, and a
 * `.invalid` address (RFC 2606 — a reserved TLD that can never resolve, so no
 * mail can be delivered and no one can sign in as a trader).
 *
 * NOTE FOR HENRY: replace with your real roster when you have one.
 */
const TRADERS = [
  {
    slug: "trend-continuation",
    displayName: "Trend Continuation",
    headline: "Systematic trend-following across major FX pairs",
    riskLevel: "MEDIUM" as const,
    isFeatured: true,
    order: 1,
    bio: "A systematic approach that follows established directional moves in the major currency pairs. Positions are sized to a fixed fraction of the account and exits are rule-based rather than discretionary.\n\nNo performance history is published. Any figure shown elsewhere on this platform is illustrative, past-only, and is not a guide to future results.",
  },
  {
    slug: "range-reversion",
    displayName: "Range Reversion",
    headline: "Mean-reversion on liquid index CFDs",
    riskLevel: "MEDIUM" as const,
    isFeatured: false,
    order: 2,
    bio: "Fades extended moves in liquid equity indices, on the premise that short-term price tends to return toward its recent average. The approach is exposed to sustained trends, and it is sized around that exposure.\n\nNo performance history is published.",
  },
  {
    slug: "breakout-momentum",
    displayName: "Breakout Momentum",
    headline: "Volatility breakouts on metals and indices",
    riskLevel: "HIGH" as const,
    isFeatured: false,
    order: 3,
    bio: "Takes positions when price clears a defined range on expanding volatility. It wins less often than it loses and depends on a small number of large moves — a profile that is uncomfortable to hold and unforgiving of oversized positions.\n\nNo performance history is published.",
  },
  {
    slug: "carry-yield",
    displayName: "Carry & Yield",
    headline: "Interest-rate differential strategies in FX",
    riskLevel: "LOW" as const,
    isFeatured: false,
    order: 4,
    bio: "Holds positions that earn the interest-rate differential between two currencies. Returns accumulate slowly and can be erased quickly by a single adverse currency move, which is why the risk level reads low *volatility* — not low risk.\n\nNo performance history is published.",
  },
  {
    slug: "index-rotation",
    displayName: "Index Rotation",
    headline: "Rotational exposure across global equity indices",
    riskLevel: "MEDIUM" as const,
    isFeatured: false,
    order: 5,
    bio: "Rotates exposure between major regional equity indices according to relative strength, holding a small number of positions at a time. Concentration is the deliberate trade-off for simplicity.\n\nNo performance history is published.",
  },
  {
    slug: "gold-macro",
    displayName: "Gold Macro",
    headline: "Macro-driven positioning in precious metals",
    riskLevel: "HIGH" as const,
    isFeatured: false,
    order: 6,
    bio: "Positions in precious metals around macroeconomic events, where moves can be large and fast in both directions. Exposure is deliberately small relative to the account because the variance is large.\n\nNo performance history is published.",
  },
];

/* =============================================================== courses === */

const COURSES = [
  {
    slug: "foundations-of-trading",
    title: "Foundations of Trading",
    level: "Beginner",
    order: 1,
    summary:
      "The mechanics of a trade, from order types to what actually moves a price.",
    lessons: [
      "How markets actually work",
      "Order types and execution",
      "Reading a price chart without guessing",
      "Spread, slippage and the real cost of a trade",
      "Why most retail accounts fail",
    ],
  },
  {
    slug: "risk-and-position-sizing",
    title: "Risk and Position Sizing",
    level: "Intermediate",
    order: 2,
    summary:
      "The discipline that separates a strategy from a gamble: sizing, drawdown and survival.",
    lessons: [
      "Risk per trade, defined",
      "Position sizing arithmetic",
      "Drawdown and the maths of recovery",
      "Stop placement and invalidation",
      "Keeping a trading journal",
    ],
  },
  {
    slug: "copy-trading-explained",
    title: "Copy Trading, Explained",
    level: "Beginner",
    order: 3,
    summary:
      "What copy trading is, what it is not, and how to assess a strategy before you follow it.",
    lessons: [
      "What copy trading is — and is not",
      "Reading a strategy's risk profile",
      "Allocation and exposure",
      "When to stop following",
    ],
  },
];

/* ================================================================== faqs === */

/**
 * Answers are written to be true under scrutiny. Where a question invites a
 * promise ("are returns guaranteed?"), the answer refuses it and says why —
 * which is the only honest answer available.
 */
const FAQS = [
  /* ------------------------------------------------------ getting started */
  {
    id: "faq-what-is-amplified-traders",
    category: "Getting started",
    order: 1,
    question: "What is Amplified Traders?",
    answer:
      "A trading platform built around three things: copy-trading participation, structured education, and a transparent referral network. We do not hold client funds — your capital stays with your own broker.",
  },
  {
    id: "faq-need-experience",
    category: "Getting started",
    order: 2,
    question: "Do I need experience to start?",
    answer:
      "No. The education library is built to take someone from the mechanics of a single trade to a working understanding of risk. That said, trading carries a real risk of loss, and no amount of education removes it.",
  },
  {
    id: "faq-create-account",
    category: "Getting started",
    order: 3,
    question: "How do I create an account?",
    answer:
      "Register with your name and email, verify your email address, then complete identity verification. Verification must be approved before you can deposit or withdraw.",
  },
  {
    id: "faq-what-is-a-package",
    category: "Getting started",
    order: 4,
    question: "What is a package?",
    answer:
      "A package is a participation tier — it describes the level of guidance, education and access you receive. It is not an investment product and it carries no rate of return. We do not publish returns, because we cannot promise them.",
  },

  /* ------------------------------------------------- accounts & verification */
  {
    id: "faq-why-identity-documents",
    category: "Accounts & verification",
    order: 5,
    question: "Why do you ask for identity documents?",
    answer:
      "Verification is a legal requirement for a platform that moves money, and it protects your account. We keep only what is needed to complete the check and to keep a record that it happened.",
  },
  {
    id: "faq-verification-time",
    category: "Accounts & verification",
    order: 6,
    question: "How long does verification take?",
    answer:
      "Most submissions are reviewed within one business day. If a document is unclear we will tell you exactly what to resubmit rather than leaving the request sitting.",
  },
  {
    id: "faq-multiple-accounts",
    category: "Accounts & verification",
    order: 7,
    question: "Can I have more than one account?",
    answer:
      "No. One account per person. Duplicate accounts are closed, and balances on them are handled under the published terms.",
  },
  {
    id: "faq-verification-rejected",
    category: "Accounts & verification",
    order: 8,
    question: "What happens if my verification is rejected?",
    answer:
      "You will be told which document failed and why. You can resubmit as many times as you need to. Deposits and withdrawals stay blocked until verification is approved.",
  },

  /* -------------------------------------------------- deposits & withdrawals */
  {
    id: "faq-how-to-add-funds",
    category: "Deposits & withdrawals",
    order: 9,
    question: "How do I add funds?",
    answer:
      "Tell us the amount you want credited and submit the request. Once the funds are confirmed as received, the amount is credited to your wallet. Nothing is credited before confirmation.",
  },
  {
    id: "faq-platform-fee",
    category: "Deposits & withdrawals",
    order: 10,
    question: "What is the platform fee?",
    answer:
      "A platform fee is added on top of each deposit. If you ask for $50 to be credited, you send $55 — the fee is charged on top, never deducted from the amount you asked to credit.",
  },
  {
    id: "faq-minimum-amounts",
    category: "Deposits & withdrawals",
    order: 11,
    question: "What is the minimum deposit and withdrawal?",
    answer:
      "The minimum deposit is $50 and the minimum withdrawal is $20. Amounts below those floors are refused rather than rounded.",
  },
  {
    id: "faq-withdrawal-time",
    category: "Deposits & withdrawals",
    order: 12,
    question: "How long do withdrawals take?",
    answer:
      "A withdrawal is held the moment you request it, so the balance cannot be spent twice while it is being reviewed. Once approved, funds are sent to the destination you provided.",
  },
  {
    id: "faq-why-withdrawal-held",
    category: "Deposits & withdrawals",
    order: 13,
    question: "Why is my withdrawal held immediately?",
    answer:
      "Holding the amount at request is what makes the balance honest: the money you see is the money you can actually spend. If a request is rejected, the full amount is returned to your wallet.",
  },

  /* ------------------------------------------------------------ copy trading */
  {
    id: "faq-what-copy-trading-does",
    category: "Copy trading",
    order: 14,
    question: "What does copy trading actually do?",
    answer:
      "It mirrors the approach of a strategy you choose onto your own broker account. Your capital never leaves your broker, and the risk stays with you.",
  },
  {
    id: "faq-returns-guaranteed",
    category: "Copy trading",
    order: 15,
    question: "Are returns guaranteed?",
    answer:
      "No. Nothing on this platform guarantees a return, and anyone who tells you otherwise is not describing how markets work. Past performance — including any illustrative figures shown — is not a guide to future results.",
  },
  {
    id: "faq-how-much-to-allocate",
    category: "Copy trading",
    order: 16,
    question: "How much should I allocate to a strategy?",
    answer:
      "Only what you can afford to lose, and never more than a fraction of your total capital in a single strategy. The platform does not advise on how much to allocate, because that depends on your circumstances, not ours.",
  },
  {
    id: "faq-stop-following",
    category: "Copy trading",
    order: 17,
    question: "Can I stop following a strategy?",
    answer:
      "Yes, at any time. You can pause or stop a copy relationship from your dashboard, and no further positions are mirrored after it stops.",
  },

  /* -------------------------------------------------------- risk & compliance */
  {
    id: "faq-do-you-hold-money",
    category: "Risk & compliance",
    order: 18,
    question: "Do you hold my money?",
    answer:
      "No. Amplified Traders is non-custodial. Your funds remain with your own broker; we record the relationship and the platform's own ledger, not your trading capital.",
  },
  {
    id: "faq-is-trading-risky",
    category: "Risk & compliance",
    order: 19,
    question: "Is trading risky?",
    answer:
      "Yes. Leveraged trading can lose money quickly, and losses can exceed what you intended to risk. Never trade with money you cannot afford to lose.",
  },
  {
    id: "faq-referral-network",
    category: "Risk & compliance",
    order: 20,
    question: "What is the referral network?",
    answer:
      "A structured way for members to introduce others. Rewards are tied to genuine, verified participation — not to recruitment alone, and not to an income promise.",
  },
  {
    id: "faq-contact-support",
    category: "Risk & compliance",
    order: 21,
    question: "How do I contact support?",
    answer:
      "Open a ticket from your dashboard or use the contact form. We answer during the trading week, across time zones.",
  },
];

/* ================================================================== blog === */

const BLOG_CATEGORIES = [
  {
    slug: "platform",
    name: "Platform",
    order: 1,
    description: "How Amplified Traders is built and what it does.",
  },
  {
    slug: "education",
    name: "Education",
    order: 2,
    description: "Mechanics, method and the craft of trading.",
  },
  {
    slug: "risk",
    name: "Risk & Discipline",
    order: 3,
    description: "Position sizing, drawdown and staying in the game.",
  },
  {
    slug: "markets",
    name: "Markets",
    order: 4,
    description: "Regimes, catalysts and what is actually moving.",
  },
];

/**
 * Post bodies use the site's markdown subset only: `##`, `###`, `-` and `1.`
 * lists, paragraphs, `**bold**`, `*italic*`, and links. No `#` h1 and no tables
 * — `lib/prose.ts` does not render them, and a heading that silently disappears
 * is worse than no heading.
 */
const POSTS = [
  {
    slug: "why-we-dont-publish-a-performance-guarantee",
    title: "Why we don't publish a performance guarantee",
    categorySlug: "risk",
    isFeatured: true,
    publishedAt: new Date("2026-01-12T09:00:00.000Z"),
    excerpt:
      "Every platform that promises a return is describing something other than trading. Here is what we publish instead, and why.",
    content: `## The promise nobody can keep

A performance guarantee is a claim about the future. Markets do not issue those. Any platform that publishes one is either describing a different product, or hoping you will not read the terms closely enough to notice.

We publish three things instead.

## What we publish

- The **structure** of a tier — what it costs, what it includes, and what it does not.
- A strategy profile's **risk level**, stated plainly, with no performance history attached.
- The platform's own **ledger** — every movement of your balance, with a row that explains it.

## What we will not publish

- A return, a yield, or a target.
- A track record we cannot substantiate.
- A testimonial from someone who does not exist.

## Why this matters more than it sounds

A guarantee changes how you behave. It invites you to size a position on the strength of a promise rather than on the risk you can actually carry — and that is precisely how accounts are lost.

We would rather publish less and be believed than publish more and be wrong.`,
  },
  {
    slug: "the-maths-of-drawdown",
    title: "The maths of drawdown: why a 50% loss needs a 100% gain",
    categorySlug: "risk",
    isFeatured: true,
    publishedAt: new Date("2026-01-09T09:00:00.000Z"),
    excerpt:
      "Losses and gains are not symmetrical. The arithmetic of recovery is the strongest argument for sizing small.",
    content: `## The asymmetry nobody mentions

Lose half your capital and you need to double what remains to get back to where you started. A 50% loss requires a 100% gain. A 90% loss requires a 900% gain.

This is not a trick of presentation. It is arithmetic, and it is the single most important reason risk management matters more than strategy selection.

## What recovery actually costs

- A 10% loss needs an 11% gain to recover.
- A 25% loss needs a 33% gain.
- A 50% loss needs a 100% gain.
- A 75% loss needs a 300% gain.
- A 90% loss needs a 900% gain.

## Why this changes how you trade

The cost of a large loss is not linear — it compounds against you. A strategy that wins often but occasionally loses catastrophically will eventually give everything back, no matter how good the winning streak looked.

The defence is not a better entry. It is a smaller position and a defined exit.

## The only number that matters early on

How much you lose when you are wrong. Not how much you make when you are right.`,
  },
  {
    slug: "copy-trading-is-not-passive-income",
    title: "Copy trading is not passive income",
    categorySlug: "education",
    isFeatured: false,
    publishedAt: new Date("2026-01-06T09:00:00.000Z"),
    excerpt:
      "Following a strategy moves the decision, not the risk. The exposure still lands on your account.",
    content: `## The phrase that does the damage

"Passive income" describes a return that arrives without your involvement. Copy trading does not do that. It moves the *decision* to someone else; it does not move the *risk* off your account.

## What actually happens

1. You connect your own broker account.
2. You choose a strategy and set an allocation.
3. The approach is mirrored onto your account.
4. The profit and the loss both land on you.

Step four is the one the marketing usually skips.

## What you are still responsible for

- Choosing a strategy whose risk you can carry.
- Deciding how much to allocate.
- Deciding when to stop.

None of those are delegated, and none of them are passive.

## The honest version

Copy trading can save you the work of building a strategy from scratch. It cannot save you from the consequences of the one you chose.`,
  },
  {
    slug: "what-a-broker-connection-actually-does",
    title: "What a broker connection actually does",
    categorySlug: "platform",
    isFeatured: false,
    publishedAt: new Date("2026-01-03T09:00:00.000Z"),
    excerpt:
      "Your capital stays with your broker. Here is exactly what the platform records, and what it never touches.",
    content: `## Two accounts, one relationship

When you connect a broker account, there are two things in play: the account at your broker, which holds your money, and the record on the platform, which describes the relationship.

The platform never becomes a party to your funds.

## What the platform records

- Which broker and which account you connected.
- Which strategy you chose to follow.
- Your own declared allocation.
- The status of the relationship — pending, active, stopped.

## What the platform never does

- Hold your capital.
- Place orders in your broker account on its own authority.
- Move money between your broker account and the platform.

## Why the distinction matters

A custodial platform is a counterparty. If it fails, your money is in the wreckage. A non-custodial one is a record-keeper: if it disappears tomorrow, your capital is still sitting at your broker, and your account there is unaffected.

That is a structural difference, not a marketing one.`,
  },
  {
    slug: "reading-a-strategys-risk-before-you-follow-it",
    title: "Reading a strategy's risk before you follow it",
    categorySlug: "education",
    isFeatured: false,
    publishedAt: new Date("2025-12-30T09:00:00.000Z"),
    excerpt:
      "A risk level is a description, not a rating. Here is how to read one before you commit capital.",
    content: `## A risk level is not a score

A risk level does not tell you whether a strategy is good. It tells you how much movement to expect, and therefore how much capital you need to be able to lose without being forced out.

## The three questions to ask

1. What does this strategy do when it is wrong?
2. How long can it stay wrong before the position has to be closed?
3. What fraction of the account is exposed at any one time?

If a profile does not answer those, it is not telling you enough to follow it.

## Why "high risk" is not automatically bad

A high-variance strategy sized small can be safer than a low-variance strategy sized large. The risk level is a property of the strategy; the danger is a property of the *combination* of strategy and allocation.

## The rule that survives every regime

Size so that being wrong is survivable. Everything else is optimisation.`,
  },
  {
    slug: "position-sizing-the-only-edge-you-control",
    title: "Position sizing: the only edge you control",
    categorySlug: "education",
    isFeatured: false,
    publishedAt: new Date("2025-12-30T08:00:00.000Z"),
    excerpt:
      "You cannot control the market. You can control how much of your account is exposed to it.",
    content: `## The one decision that is entirely yours

Entries, exits and market direction are all contested. Position size is not. It is the single variable in trading that is fully under your control and has a direct, arithmetic effect on your survival.

## The arithmetic, plainly

- Risk a fixed fraction of the account per trade.
- Convert that fraction into a position size using the distance to your stop.
- Never let a single loss exceed the fraction you chose.

That is the whole method. It is not complicated; it is just uncomfortable, because it means taking small positions when you feel certain.

## Why it beats a better entry

A perfect entry with an oversized position still ends the account when it is wrong once. A mediocre entry with a correctly sized position survives to trade again.

Survival compounds. Brilliance does not.

## The test

Ask yourself: if the next ten trades all lost, would I still be trading? If the answer is no, the position size is wrong — regardless of how good the strategy is.`,
  },
];

/* ================================================================ pages === */

const PAGES = [
  {
    slug: "packages",
    title: "Investment Packages",
    metaTitle: "Packages",
    metaDescription:
      "Structured participation tiers with clear terms and no promise of returns.",
    content: `Amplified Traders offers participation tiers, not investment products. A tier describes the level of guidance, education and support you receive — it does not describe a return, and we publish none.

## What a tier includes

- Access to the education library and the community.
- Review of how your allocation is performing against the risk you set for it.
- Support, scaled to the size of the relationship.

## What a tier never includes

- A guaranteed return, a yield, or a target.
- Custody of your funds. Your capital stays with your own broker.

Every tier is non-custodial. You choose the broker, you hold the account, and you can stop at any time.`,
  },
  {
    slug: "traders",
    title: "Traders",
    metaTitle: "Traders",
    metaDescription: "Review strategy profiles and risk levels before you connect.",
    content: `Each profile on this page describes an approach and the risk that comes with it. None of them publishes a performance history, because a past result is not a promise about the next one.

## How to read a profile

- **Headline** — the market and the method, in one line.
- **Risk level** — how much movement the approach typically carries.
- **Bio** — how the strategy is built and where it is exposed.

## Before you connect

Decide what you can afford to lose before you decide what to allocate. Connecting to a trader means following their approach on your own broker account — the capital, and the risk, remain yours.`,
  },
  {
    slug: "copy-trading",
    title: "Copy Trading",
    metaTitle: "Copy Trading",
    metaDescription:
      "Follow a strategy on your own broker account. Your capital stays yours.",
    content: `Copy trading lets you follow a strategy without handing over your capital. You keep your own broker account; the platform records the relationship and mirrors the approach.

## How it works

1. Open or connect an account with a broker you already use.
2. Review the strategy profiles and choose one whose risk you can carry.
3. Set your own allocation — the platform does not advise on how much.
4. Monitor the relationship and stop at any time.

## What it is not

It is not passive income, and it is not a guarantee. A strategy that performed well last quarter can lose money next quarter. Following a trader does not transfer the risk to them — it stays with you.`,
  },
  {
    slug: "education",
    title: "Education",
    metaTitle: "Education",
    metaDescription:
      "Mechanics, risk and process — from a first trade to a working method.",
    content: `The education library is built around one idea: most retail accounts are lost to position sizing, not to a lack of strategy. The courses take you from the mechanics of a single trade to a working understanding of risk.

## Where to start

- **Foundations of Trading** — for the mechanics, if you have never placed a trade.
- **Risk and Position Sizing** — for the discipline that keeps an account alive.
- **Copy Trading, Explained** — for how to assess a strategy before you follow it.

## How to use it

Work through a course in order, then keep it as a reference. The material is deliberately plain: no signals, no predictions, and nothing that depends on a market view being right.`,
  },
  {
    slug: "network",
    title: "Referral Network",
    metaTitle: "Referral Network",
    metaDescription:
      "A structured referral network built on verified participation, not recruitment.",
    content: `The referral network lets members introduce others to the platform. Rewards are tied to genuine, verified participation — not to recruitment alone.

## How it works

1. Share your referral link.
2. Someone registers and completes verification.
3. Rewards accrue on their verified activity, under the published structure.

## What it is not

It is not an income promise. Rewards depend on the activity of people you introduce, which you do not control and cannot guarantee. Any structure that pays primarily for recruitment rather than participation is one we do not operate.`,
  },
  {
    slug: "community",
    title: "Community",
    metaTitle: "Community",
    metaDescription: "A trader community built on shared learning, not shared hype.",
    content: `The community is where members compare notes, ask questions and share what is and is not working. It is moderated, and it is deliberately not a place for signals.

## What you will find

- Discussion of strategy, risk and process.
- Questions answered by other members and by the desk.
- Education material, kept current.

## What you will not find

- Guaranteed calls, or anyone selling certainty.
- Performance claims that cannot be checked.`,
  },
  {
    slug: "about",
    title: "About Amplified Traders",
    metaTitle: "About",
    metaDescription:
      "A non-custodial trading platform built around education, transparency and risk.",
    content: `Amplified Traders is a trading platform built on a simple position: we do not hold your money, and we do not promise you a return.

## What we do

- Provide structured education, from first principles to risk discipline.
- Connect members to strategy profiles they can review and follow on their own broker account.
- Operate a transparent referral network and a ledger you can audit.

## What we do not do

- Hold client funds. Your capital stays with your broker.
- Publish performance guarantees, track records we cannot substantiate, or testimonials from people who do not exist.

Trading carries a real risk of loss. Our job is to make sure you understand it before you take it — not to tell you it is not there.`,
  },
];

/* ================================================================== main === */

async function seedStats(): Promise<void> {
  for (const stat of STATS) {
    await prisma.stat.upsert({
      where: { id: stat.id },
      update: {},
      create: stat,
    });
  }
  console.log(`  stats ............. ${STATS.length}`);
}

async function seedPackages(): Promise<void> {
  for (const pkg of PACKAGES) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: {
        slug: pkg.slug,
        name: pkg.name,
        tier: pkg.tier,
        summary: pkg.summary,
        description: pkg.description,
        minCents: pkg.minCents,
        maxCents: pkg.maxCents,
        currency: "USD",
        riskLevel: pkg.riskLevel,
        status: "ACTIVE",
        isFeatured: pkg.isFeatured,
        features: pkg.features as Prisma.InputJsonValue,
        order: pkg.order,
      },
    });
  }
  console.log(`  packages .......... ${PACKAGES.length}`);
}

async function seedBrokers(): Promise<void> {
  for (const broker of BROKERS) {
    await prisma.broker.upsert({
      where: { slug: broker.slug },
      update: {},
      create: broker,
    });
  }
  console.log(`  brokers ........... ${BROKERS.length}`);
}

async function seedTraders(): Promise<void> {
  for (const trader of TRADERS) {
    // A profile account: role TRADER, random unguessable password, and an
    // RFC 2606 `.invalid` address so no mail can ever be delivered to it.
    const email = `trader-${trader.slug}@amplifiedtraders.invalid`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await hashPassword(randomUUID()),
        fullName: trader.displayName,
        role: "TRADER",
        status: "ACTIVE",
        emailVerifiedAt: PUBLISHED,
      },
      select: { id: true },
    });

    await prisma.trader.upsert({
      where: { slug: trader.slug },
      update: {},
      create: {
        userId: user.id,
        slug: trader.slug,
        displayName: trader.displayName,
        headline: trader.headline,
        bio: trader.bio,
        riskLevel: trader.riskLevel,
        status: "ACTIVE",
        isFeatured: trader.isFeatured,
        order: trader.order,
        // illustrativeStats intentionally null — see the file header.
      },
    });
  }
  console.log(`  traders ........... ${TRADERS.length} (+ profile accounts)`);
}

async function seedCourses(): Promise<void> {
  let lessons = 0;
  for (const course of COURSES) {
    const row = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {},
      create: {
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        level: course.level,
        isPublished: true,
        order: course.order,
      },
      select: { id: true },
    });

    for (const [index, title] of course.lessons.entries()) {
      // Deterministic id, so a re-run is a no-op rather than a duplicate.
      await prisma.lesson.upsert({
        where: { id: `lesson-${course.slug}-${index + 1}` },
        update: {},
        create: {
          id: `lesson-${course.slug}-${index + 1}`,
          courseId: row.id,
          title,
          order: index + 1,
        },
      });
      lessons += 1;
    }
  }
  console.log(`  courses ........... ${COURSES.length} (+ ${lessons} lessons)`);
}

async function seedFaqs(): Promise<void> {
  for (const faq of FAQS) {
    await prisma.faq.upsert({
      where: { id: faq.id },
      update: {},
      create: faq,
    });
  }
  console.log(`  faqs .............. ${FAQS.length}`);
}

async function seedBlog(): Promise<void> {
  const categoryIds = new Map<string, string>();
  for (const category of BLOG_CATEGORIES) {
    const row = await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
      select: { id: true },
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const post of POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        categoryId: categoryIds.get(post.categorySlug) ?? null,
        authorName: "Amplified Traders Desk",
        status: "PUBLISHED",
        isFeatured: post.isFeatured,
        publishedAt: post.publishedAt,
      },
    });
  }
  console.log(
    `  blog .............. ${BLOG_CATEGORIES.length} categories, ${POSTS.length} posts`,
  );
}

async function seedPages(): Promise<void> {
  for (const page of PAGES) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: {
        slug: page.slug,
        title: page.title,
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        status: "PUBLISHED",
        publishedAt: PUBLISHED,
      },
    });
  }
  console.log(`  pages ............. ${PAGES.length}`);
}

async function main(): Promise<void> {
  console.log("Seeding content (create-if-absent — nothing is overwritten)\n");
  await seedStats();
  await seedPackages();
  await seedBrokers();
  await seedTraders();
  await seedCourses();
  await seedFaqs();
  await seedBlog();
  await seedPages();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\nContent seed complete.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
