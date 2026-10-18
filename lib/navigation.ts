/**
 * The public site's navigation — one source, four consumers.
 *
 * `components/site/navbar.tsx`, `components/site/footer.tsx`, `app/sitemap.ts`
 * and `prisma/seed.ts` all read these arrays. Nothing hand-copies a link list,
 * because a second copy is a copy that drifts (lessons 190/199).
 *
 * Deliberately **not** database-driven at render time. The marketing pages are
 * statically prerendered, and a build that needs a database to draw a navbar is
 * a build that fails when the database is down. The seed mirrors these arrays
 * into `NavigationItem` rows so the CMS table describes the same site the code
 * renders — `tests/site/navigation.test.ts` asserts the mirror is faithful and
 * that every href here resolves to a real `page.tsx` (PLAN §3 forbids dead
 * links).
 */

export type NavLink = { label: string; href: string };

/** The floating pill nav. Six doors, all of them real. */
export const HEADER_LINKS: readonly NavLink[] = [
  { label: "Copy Trading", href: "/copy-trading" },
  { label: "Packages", href: "/packages" },
  { label: "Traders", href: "/traders" },
  { label: "Community", href: "/community" },
  { label: "Network", href: "/network" },
  { label: "Education", href: "/education" },
];

/** The sub-brand strip — brand architecture, not navigation. */
export const SUBBRANDS: readonly NavLink[] = [
  { label: "Amplify Trade", href: "/copy-trading" },
  { label: "Amplify Invest", href: "/packages" },
  { label: "Amplify Network", href: "/network" },
  { label: "Amplify Community", href: "/community" },
];

export const FOOTER_PLATFORM: readonly NavLink[] = [
  { label: "Copy Trading", href: "/copy-trading" },
  { label: "Investment Packages", href: "/packages" },
  { label: "Traders", href: "/traders" },
  { label: "Referral Network", href: "/network" },
  { label: "Community", href: "/community" },
  { label: "Education", href: "/education" },
];

export const FOOTER_COMPANY: readonly NavLink[] = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Login", href: "/login" },
  { label: "Join Now", href: "/register" },
];

export const FOOTER_LEGAL: readonly NavLink[] = [
  { label: "Risk Disclosure", href: "/legal/risk-disclosure" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Cookie Policy", href: "/legal/cookies" },
];

/**
 * Every route a visitor can reach without signing in. Feeds the sitemap and the
 * dead-link test; `/blog/[slug]` is absent because it is not a static route.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  "/",
  ...HEADER_LINKS.map((l) => l.href),
  "/about",
  "/contact",
  "/faq",
  "/blog",
  ...FOOTER_LEGAL.map((l) => l.href),
];

/** The four legal documents, in the order they should be listed. */
export const LEGAL_SLUGS: readonly string[] = FOOTER_LEGAL.map((l) =>
  l.href.replace("/legal/", ""),
);

/** The shape `prisma/seed.ts` writes into `NavigationItem`. */
export type SeedNavItem = {
  id: string;
  label: string;
  url: string;
  location: "HEADER" | "FOOTER";
  order: number;
};

function toSeedItems(
  links: readonly NavLink[],
  location: "HEADER" | "FOOTER",
): SeedNavItem[] {
  return links.map((link, index) => ({
    id: `nav-${location.toLowerCase()}-${link.href.replace(/^\//, "").replace(/\//g, "-") || "home"}`,
    label: link.label,
    url: link.href,
    location,
    order: index + 1,
  }));
}

/**
 * The navigation rows the seed writes. Derived, never hand-listed — a nav item
 * added here reaches the database on the next `pnpm db:seed` without anyone
 * remembering to update a second array.
 */
export const SEED_NAV_ITEMS: readonly SeedNavItem[] = [
  ...toSeedItems(HEADER_LINKS, "HEADER"),
  ...toSeedItems(FOOTER_COMPANY, "FOOTER"),
  ...toSeedItems(FOOTER_LEGAL, "FOOTER"),
];
