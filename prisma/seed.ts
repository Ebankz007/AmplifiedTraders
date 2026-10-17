/**
 * Amplified Traders — database seed (Phase 2).
 *
 * Idempotent: safe to run repeatedly (`pnpm db:seed`). Seeds only authoritative
 * reference data derivable from the plan and the engine:
 *   - the two bonus pools (RANK, LEADERSHIP) the engine accrues into;
 *   - site settings (identity, contact, compliance, social);
 *   - navigation (header + footer) from the public page inventory (PLAN §2).
 *
 * Deliberately NOT seeded here — these need Henry's business input, not invention:
 *   - Packages (non-custodial participation tiers), Brokers, Traders,
 *     Testimonials, FAQ / blog content.
 *
 * The initial administrator IS provisioned here, but only from the environment
 * (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME). Member accounts are never seeded —
 * they arrive through registration.
 */
import "dotenv/config";
import { Prisma, PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password";
import { SETTING_DEFAULTS } from "../lib/site-settings";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and configure it.",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * The setting keys and their seed values, derived from the single allowlist in
 * `lib/site-settings.ts` — never re-listed here, so the seed cannot provision a
 * key the settings API would refuse to write (or miss one it would accept).
 */
const SITE_SETTINGS: Array<{ key: string; value: Prisma.InputJsonValue }> =
  Object.entries(SETTING_DEFAULTS).map(([key, value]) => ({
    key,
    value: value as Prisma.InputJsonValue,
  }));

const NAV_ITEMS: Array<{
  id: string;
  label: string;
  url: string;
  location: "HEADER" | "FOOTER";
  order: number;
}> = [
  // Header — primary navigation (PLAN §2 inventory).
  { id: "nav-header-home", label: "Home", url: "/", location: "HEADER", order: 1 },
  { id: "nav-header-copy", label: "Copy Trading", url: "/copy-trading", location: "HEADER", order: 2 },
  { id: "nav-header-packages", label: "Packages", url: "/packages", location: "HEADER", order: 3 },
  { id: "nav-header-traders", label: "Traders", url: "/traders", location: "HEADER", order: 4 },
  { id: "nav-header-community", label: "Community", url: "/community", location: "HEADER", order: 5 },
  { id: "nav-header-network", label: "Network", url: "/network", location: "HEADER", order: 6 },
  { id: "nav-header-education", label: "Education", url: "/education", location: "HEADER", order: 7 },
  // Footer — secondary navigation.
  { id: "nav-footer-about", label: "About", url: "/about", location: "FOOTER", order: 1 },
  { id: "nav-footer-contact", label: "Contact", url: "/contact", location: "FOOTER", order: 2 },
  { id: "nav-footer-faq", label: "FAQ", url: "/faq", location: "FOOTER", order: 3 },
  { id: "nav-footer-blog", label: "Blog", url: "/blog", location: "FOOTER", order: 4 },
  { id: "nav-footer-risk", label: "Risk Disclosure", url: "/risk-disclosure", location: "FOOTER", order: 5 },
  { id: "nav-footer-terms", label: "Terms", url: "/terms", location: "FOOTER", order: 6 },
  { id: "nav-footer-privacy", label: "Privacy", url: "/privacy", location: "FOOTER", order: 7 },
  { id: "nav-footer-cookies", label: "Cookie Policy", url: "/cookies", location: "FOOTER", order: 8 },
];

/**
 * Provision the initial administrator from the environment.
 *
 * Idempotent and non-destructive: if an admin with `ADMIN_EMAIL` already exists,
 * nothing is written — in particular the password is NOT reset, so re-running the
 * seed can never silently revert a password Henry has since changed. To rotate it,
 * change it in the console (or delete the row and re-seed).
 *
 * Absent env vars are a skip, not a failure: a fresh clone can seed reference data
 * before anyone has configured an administrator.
 */
async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Amplified Traders Admin";

  if (!email || !password) {
    console.log("• admin: skipped (set ADMIN_EMAIL + ADMIN_PASSWORD to provision)");
    return;
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`• admin: ${email} already exists (password left unchanged)`);
    return;
  }

  await prisma.admin.create({
    data: {
      email,
      name,
      role: "SUPER_ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
  console.log(`✓ admin: created ${email} (SUPER_ADMIN)`);
}

async function main(): Promise<void> {
  // 1. Bonus pools — the engine accrues into these; they must exist.
  for (const kind of ["RANK", "LEADERSHIP"] as const) {
    await prisma.bonusPool.upsert({
      where: { kind },
      update: {},
      create: { kind },
    });
  }
  console.log("✓ bonus pools (RANK, LEADERSHIP)");

  // 2. Site settings — create-if-absent, never reset.
  //
  // `update: { value }` looks harmless and silently reverts every setting an
  // admin has edited in the console on the next `db:seed` — the same footgun as
  // resetting the admin password (lesson 191). The seed provisions the *keys*;
  // the console owns the *values*. To push a changed default into a live
  // database, do it deliberately, never as a side effect of seeding.
  let settingsCreated = 0;
  for (const setting of SITE_SETTINGS) {
    const existing = await prisma.siteSetting.findUnique({
      where: { key: setting.key },
      select: { key: true },
    });
    if (existing) continue;

    await prisma.siteSetting.create({
      data: { key: setting.key, value: setting.value },
    });
    settingsCreated += 1;
  }
  console.log(
    `✓ site settings (${settingsCreated} created, ${SITE_SETTINGS.length - settingsCreated} already present)`,
  );

  // 3. Navigation.
  for (const item of NAV_ITEMS) {
    await prisma.navigationItem.upsert({
      where: { id: item.id },
      update: {
        label: item.label,
        url: item.url,
        location: item.location,
        order: item.order,
      },
      create: item,
    });
  }
  console.log(`✓ navigation items (${NAV_ITEMS.length})`);

  // 4. Initial administrator (env-driven; skipped when unset).
  await seedAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
