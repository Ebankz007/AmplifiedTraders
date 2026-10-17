import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { settingDefinition, validateSettingValue } from "@/lib/site-settings";
import { updateSettingSchema, firstError } from "@/lib/validators";

/**
 * PATCH /api/admin/settings/[key] — write one allowlisted site setting.
 *
 * Fail-closed twice over: the key must be on the `lib/site-settings.ts`
 * allowlist, and the row must already exist. The seed provisions the *keys*; the
 * console only ever edits their *values*, so an admin cannot conjure a setting
 * that nothing reads. The change and its audit row commit together, so a setting
 * can never move without a before/after record.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(admin.role, "settings")) {
    return Response.json(
      { error: "You do not have access to site settings." },
      { status: 403 },
    );
  }

  const { key } = await params;

  // An unlisted key is not a setting, whatever the request claims.
  const definition = settingDefinition(key);
  if (!definition) {
    return Response.json({ error: "Unknown setting." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSettingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const validated = validateSettingValue(definition, parsed.data.value);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const existing = await prisma.siteSetting.findUnique({ where: { key } });
  if (!existing) {
    return Response.json(
      { error: "That setting is not provisioned. Run the seed." },
      { status: 404 },
    );
  }

  const before = existing.value as Record<string, unknown>;
  const after = validated.value;
  const { ip } = sessionMeta(request);

  await prisma.$transaction(async (tx) => {
    await tx.siteSetting.update({
      where: { key },
      data: { value: after as Prisma.InputJsonValue },
    });

    await recordAudit(
      {
        adminId: admin.id,
        action: "setting.update",
        entity: "SiteSetting",
        entityId: key,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        ip,
      },
      tx,
    );
  });

  return Response.json({ ok: true, key, value: after });
}
