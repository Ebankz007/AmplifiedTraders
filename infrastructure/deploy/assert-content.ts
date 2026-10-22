/**
 * Assert that the seeded content actually landed in the database.
 *
 * WHY THIS EXISTS: the seed scripts print the length of the array they were
 * about to insert, not the number of rows that ended up in the table. A seed
 * that silently matched nothing still exits 0. The marketing pages and the
 * blog post routes are PRERENDERED at build time from the database, so a
 * build that runs against an empty database ships a real-looking but EMPTY
 * site — and the health check passes, because the pages are static files.
 *
 * So: count the rows, and fail the deploy if the content is not there. The
 * deploy script runs this between the seed and the build.
 *
 * Run: pnpm tsx infrastructure/deploy/assert-content.ts
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";

/** Tables that must not be empty for the site to publish real content. */
const REQUIRED: Array<[string, () => Promise<number>]> = [
  ["Broker", () => prisma.broker.count()],
  ["Trader", () => prisma.trader.count()],
  ["Package", () => prisma.package.count()],
  ["Course", () => prisma.course.count()],
  ["Faq", () => prisma.faq.count()],
  ["BlogPost", () => prisma.blogPost.count()],
  ["Page", () => prisma.page.count()],
];

async function main() {
  const empty: string[] = [];

  for (const [label, count] of REQUIRED) {
    const n = await count();
    console.log(`[assert-content] ${label} = ${n}`);
    if (n === 0) empty.push(label);
  }

  if (empty.length > 0) {
    console.error(
      `[assert-content] EMPTY TABLES: ${empty.join(", ")} — the seed did not land. Aborting before the build so an empty site is never published.`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("[assert-content] every required content table is populated");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[assert-content] failed:", err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
