import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { checkTeamChange } from "@/lib/admin-team";
import { updateAdminSchema, firstError } from "@/lib/validators";

/**
 * PATCH /api/admin/team/[id] — change an admin's role and/or active flag.
 *
 * Re-checks the `team` permission (403 JSON, not a redirect) and refuses any
 * change that would lock the console out (`checkTeamChange`). Deactivating an
 * admin ends their live sessions; the change and its audit row commit together.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(admin.role, "team")) {
    return Response.json(
      { error: "You do not have access to team management." },
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

  const parsed = updateAdminSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const target = await prisma.admin.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) {
    return Response.json({ error: "Admin not found." }, { status: 404 });
  }

  const activeSuperAdmins = await prisma.admin.count({
    where: { role: "SUPER_ADMIN", isActive: true },
  });

  const check = checkTeamChange({
    actorId: admin.id,
    targetId: target.id,
    targetRole: target.role,
    targetActive: target.isActive,
    activeSuperAdmins,
    nextRole: parsed.data.role,
    nextActive: parsed.data.isActive,
  });
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 409 });
  }

  const nextRole = parsed.data.role ?? target.role;
  const nextActive = parsed.data.isActive ?? target.isActive;
  const { ip } = sessionMeta(request);

  await prisma.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id },
      data: { role: nextRole, isActive: nextActive },
    });

    // A deactivation must end the admin's live sessions, not merely gate the
    // next sign-in.
    if (!nextActive) {
      await tx.adminSession.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await recordAudit(
      {
        adminId: admin.id,
        action: "admin.update",
        entity: "Admin",
        entityId: id,
        before: { role: target.role, isActive: target.isActive },
        after: { role: nextRole, isActive: nextActive },
        ip,
      },
      tx,
    );
  });

  return Response.json({ ok: true, role: nextRole, isActive: nextActive });
}
