import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { createMessageSchema, firstError } from "@/lib/validators";
import { STATUS_AFTER_STAFF_REPLY, canStaffReply } from "@/lib/support";

/**
 * POST /api/admin/support/[id]/messages — reply to a member's ticket as staff.
 *
 * The reply is written as `authorRole: STAFF` with `authorId: null`: `authorId`
 * references `User`, and an admin is not a member, so attributing the reply to a
 * user row would be a lie. The member portal already renders exactly this shape
 * as "Support team". **Who** replied is recorded in the audit log (`adminId`),
 * which is the system's accountability record — see the note in the build log.
 *
 * Replying hands the thread back to the member, so the ticket moves to PENDING
 * in the same transaction. A reply that left the ticket OPEN would keep it in
 * the "unanswered" column of the inbox forever.
 */
export async function POST(
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

  const rl = rateLimit(`admin-support-msg:${admin.id}`, 120, 60 * 60 * 1000);
  if (!rl.ok) {
    return Response.json(
      { error: "Too many replies. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (!canStaffReply(ticket.status)) {
    return Response.json(
      {
        error:
          "This ticket is closed. Reopen it before replying, or ask the member to open a new one.",
      },
      { status: 409 },
    );
  }

  const { ip } = sessionMeta(request);
  const status = STATUS_AFTER_STAFF_REPLY;

  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: {
        ticketId: id,
        authorId: null,
        authorRole: "STAFF",
        body: parsed.data.body,
      },
    });

    await tx.supportTicket.update({
      where: { id },
      data: { status, lastMessageAt: new Date() },
    });

    // The reply body is deliberately *not* copied into the audit row: it is
    // member-visible content that already lives on the message row, and the
    // audit trail is read by superadmins who need the action, not the prose.
    await recordAudit(
      {
        adminId: admin.id,
        action: "support.reply",
        entity: "SupportTicket",
        entityId: id,
        after: { status },
        ip,
      },
      tx,
    );
  });

  return Response.json({ ok: true, message: "Reply sent." }, { status: 201 });
}
