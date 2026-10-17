import { prisma } from "@/lib/prisma";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { createAdminSchema, firstError } from "@/lib/validators";

/**
 * POST /api/admin/team — provision a new admin.
 *
 * The console is the only other way to create an admin besides the seed, so
 * this is a privileged action: it re-checks the `team` permission and returns
 * 403 JSON (an API route cannot redirect). The password is hashed before it
 * touches the database and is never written to the audit trail.
 */
export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { name, email, role, password } = parsed.data;

  const existing = await prisma.admin.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return Response.json(
      { error: "An admin with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const { ip } = sessionMeta(request);

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.admin.create({
      data: { name, email, role, passwordHash },
      select: { id: true, email: true, name: true, role: true },
    });
    // The audit trail records the identity and role — never the password.
    await recordAudit(
      {
        adminId: admin.id,
        action: "admin.create",
        entity: "Admin",
        entityId: record.id,
        after: { email, name, role },
        ip,
      },
      tx,
    );
    return record;
  });

  return Response.json({ ok: true, admin: created });
}
