import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { updateTicketSchema, firstError } from "@/lib/validators";

/**
 * PATCH /api/admin/support/[id] — change a ticket's status and/or priority.
 *
 * Staff may move a ticket to any status, including back out of CLOSED: closing a
 * ticket is a judgement call, not an irreversible one, and a support queue that
 * cannot be corrected is worse than one that can. The reply rule (no replies to
 * a CLOSED ticket) lives in `lib/support.ts`, not here, so the member route and
 * this one cannot disagree about it.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(admin.role, "messages")) {
    return Response.json(
      { error: "You do not have access to support tickets." },
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

  const parsed = updateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const existing = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, status: true, priority: true },
  });
  if (!existing) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  const before = { status: existing.status, priority: existing.priority };
  const after = {
    status: parsed.data.status ?? existing.status,
    priority: parsed.data.priority ?? existing.priority,
  };

  // A stale tab can PATCH the values the ticket already holds. Recording that
  // would put a "nothing changed" row in the audit trail, which is meant to be a
  // record of sensitive *actions* — so a no-op returns without writing one.
  if (after.status === before.status && after.priority === before.priority) {
    return Response.json({ ok: true, ticket: after, unchanged: true });
  }

  const { ip } = sessionMeta(request);

  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({
      where: { id },
      data: { status: after.status, priority: after.priority },
    });

    await recordAudit(
      {
        adminId: admin.id,
        action: "support.update",
        entity: "SupportTicket",
        entityId: id,
        before,
        after,
        ip,
      },
      tx,
    );
  });

  return Response.json({ ok: true, ticket: after });
}
