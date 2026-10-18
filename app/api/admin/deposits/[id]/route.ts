import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { confirmDeposit, rejectDeposit, runWallet } from "@/lib/wallet";
import { depositDecisionSchema, firstError } from "@/lib/validators";

/**
 * PATCH /api/admin/deposits/[id] — an operator confirms or rejects a deposit.
 *
 * Confirming credits the wallet the net amount and records the operator's fee;
 * rejecting marks the payment FAILED and moves no money. The body names the
 * intent; the wallet decides what that means.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!hasPermission(admin.role, "deposits")) {
    return Response.json(
      { error: "You do not have access to deposits." },
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

  const parsed = depositDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { ip } = sessionMeta(request);
  const { action, reason } = parsed.data;

  const result = await runWallet(() =>
    action === "confirm"
      ? confirmDeposit(id, admin.id, ip)
      : rejectDeposit(id, admin.id, reason, ip),
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, id: result.data.id, status: result.data.status });
}
