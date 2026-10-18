import { getCurrentUser, sessionMeta } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { requestWithdrawal, runWallet } from "@/lib/wallet";
import { firstError, withdrawalRequestSchema } from "@/lib/validators";

/**
 * POST /api/wallet/withdrawals — a member asks to withdraw.
 *
 * The amount is held immediately (see `lib/wallet.ts`). The response carries the
 * new balance so the client can show the money leave without a second request.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = withdrawalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  let amountCents: number;
  try {
    amountCents = parseAmountToCents(parsed.data.amount);
  } catch {
    return Response.json(
      { error: "Enter a valid amount (up to 2 decimal places)." },
      { status: 400 },
    );
  }

  const { ip } = sessionMeta(request);

  const result = await runWallet(() =>
    requestWithdrawal({
      userId: user.id,
      amountCents,
      method: parsed.data.method,
      destination: parsed.data.destination || null,
      details: parsed.data.details || null,
      ip,
    }),
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ ok: true, id: result.data.id }, { status: 201 });
}
