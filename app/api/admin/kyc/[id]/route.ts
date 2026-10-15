import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { kycDecisionSchema, firstError } from "@/lib/validators";

/**
 * PATCH /api/admin/kyc/[id] — record a KYC decision.
 *
 * An API route cannot `redirect` on denial (that is a page affordance), so it
 * re-checks the permission and returns a 403 JSON. The decision writes the
 * KycProfile **and** the mirrored `User.kycStatus` in one transaction — the two
 * must never disagree, or the member's badge and the review queue drift apart.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(admin.role, "kyc")) {
    return Response.json(
      { error: "You do not have access to KYC review." },
      { status: 403 },
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = kycDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { decision } = parsed.data;
  const rejectionReason =
    decision === "REJECTED" ? parsed.data.reason?.trim() || null : null;

  const profile = await prisma.kycProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!profile) {
    return Response.json({ error: "KYC profile not found." }, { status: 404 });
  }

  const now = new Date();
  const { ip } = sessionMeta(request);

  await prisma.$transaction(async (tx) => {
    await tx.kycProfile.update({
      where: { id },
      data: {
        status: decision,
        reviewedAt: now,
        reviewedById: admin.id,
        rejectionReason,
      },
    });
    await tx.user.update({
      where: { id: profile.userId },
      data: { kycStatus: decision },
    });
    // Same transaction as the change it describes: a decision that commits
    // while its audit row is lost is invisible, and an invisible decision is
    // the one that gets disputed.
    await recordAudit(
      {
        adminId: admin.id,
        action: decision === "VERIFIED" ? "kyc.approve" : "kyc.reject",
        entity: "KycProfile",
        entityId: id,
        before: { status: profile.status },
        after: { status: decision, rejectionReason },
        ip,
      },
      tx,
    );
  });

  return Response.json({ ok: true, status: decision });
}
