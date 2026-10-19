import { getCurrentUser } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { RAIL_CURRENCY } from "@/lib/payout";
import { requestDeposit, runWallet } from "@/lib/wallet";
import { depositRequestSchema, firstError } from "@/lib/validators";

/**
 * POST /api/wallet/deposits — a member files a deposit intent.
 *
 * Nothing is credited here. An operator confirms the funds arrived
 * (`/api/admin/deposits/[id]`), and only then does the wallet move. The response
 * carries the gross the member must send (their amount plus the platform fee),
 * in both the wallet's currency (USD) and the rail's (USDT, credited at par).
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

  const parsed = depositRequestSchema.safeParse(body);
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

  const result = await runWallet(() =>
    requestDeposit({
      userId: user.id,
      amountCents,
      method: parsed.data.method,
      reference: parsed.data.reference || null,
    }),
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(
    {
      ok: true,
      id: result.data.id,
      grossCents: result.data.amountCents,
      feeCents: result.data.platformFeeCents,
      railAmount: result.data.railAmount,
      railCurrency: RAIL_CURRENCY,
    },
    { status: 201 },
  );
}
