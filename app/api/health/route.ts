import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness + database readiness.
 *
 * The deploy script (`infrastructure/deploy/deploy.sh`) polls this endpoint
 * after every restart and rolls back the release if it never goes green. It
 * is the only route that proves BOTH halves of the stack work: the Next.js
 * process is serving AND Prisma can reach PostgreSQL. A plain `GET /` is not
 * enough — the marketing pages are prerendered at build time, so they answer
 * 200 from a static file even when the database is gone.
 *
 * Deliberately minimal: it exposes liveness, never counts, never identities.
 * Always uncached.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, db: "up" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // No error detail in the body: the reason may name internal hosts.
    return NextResponse.json(
      { ok: false, db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
