import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { memberStatusSchema, firstError } from "@/lib/validators";
import { memberStatusTransition } from "@/lib/member-status";

/**
 * PATCH /api/admin/users/[id] — suspend or reinstate a member account.
 *
 * An API route cannot `redirect` on denial, so it re-checks the permission and
 * returns a 403 JSON. The status change, the session revocation, and the audit
 * record all land in one transaction: a suspension that commits while its audit
 * row is lost is exactly the silent gap the trail exists to close.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(admin.role, "users")) {
    return Response.json(
      { error: "You do not have access to member accounts." },
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

  const parsed = memberStatusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, status: true, emailVerifiedAt: true },
  });
  if (!user) {
    return Response.json({ error: "Member not found." }, { status: 404 });
  }

  const transition = memberStatusTransition(
    parsed.data.action,
    user.status,
    user.emailVerifiedAt !== null,
  );
  if (!transition.ok) {
    return Response.json({ error: transition.error }, { status: 409 });
  }

  const now = new Date();
  const { ip } = sessionMeta(request);
  const suspending = transition.status === "SUSPENDED";

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { status: transition.status },
    });

    // A suspension must end the member's live sessions, not merely gate the
    // next sign-in — otherwise an open tab keeps working after the block.
    if (suspending) {
      await tx.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      });
    }

    await recordAudit(
      {
        adminId: admin.id,
        action: suspending ? "user.suspend" : "user.reinstate",
        entity: "User",
        entityId: id,
        before: { status: user.status },
        after: { status: transition.status },
        ip,
      },
      tx,
    );
  });

  return Response.json({ ok: true, status: transition.status });
}
