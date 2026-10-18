import { getCurrentAdmin, sessionMeta } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  approvePayout,
  markPayoutPaid,
  rejectPayout,
  runWallet,
} from "@/lib/wallet";
import { firstError, payoutDecisionSchema } from "@/lib/validators";

/**
 * PATCH /api/admin/payouts/[id] — an operator acts on a withdrawal.
 *
 * The body names the intent (`approve` | `reject` | `mark_paid`); the wallet
 * derives the transition and refuses one the state machine does not allow. The
 * route never decides what a status becomes — that lives in `lib/payout.ts`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!hasPermission(admin.role, "withdrawals")) {
    return Response.json(
      { error: "You do not have access to withdrawals." },
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

  const parsed = payoutDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { ip } = sessionMeta(request);
  const { action, reason } = parsed.data;

  const result = await runWallet(() => {
    if (action === "approve") return approvePayout(id, admin.id, ip);
    if (action === "reject") return rejectPayout(id, admin.id, reason, ip);
    return markPayoutPaid(id, admin.id, ip);
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, id: result.data.id, status: result.data.status });
}
