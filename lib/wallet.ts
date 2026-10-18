/**
 * Amplified Traders — the wallet.
 *
 * The single place that moves money between a member's balance and the ledger.
 * Every other module — member routes, admin actions, the engine's persistence
 * step — calls in here. Nothing else writes `Wallet.balanceCents` or creates a
 * `LedgerEntry`.
 *
 * Two invariants this module exists to hold:
 *
 *   1. `Wallet.balanceCents` is never negative and never overstated. A member
 *      can never withdraw more than they hold — not even across two concurrent
 *      requests, because the debit is a **conditional UPDATE** (`WHERE balance
 *      >= amount`), not a read-then-write. Two requests that both pass a stale
 *      read cannot both succeed; the second finds `count === 0`.
 *
 *   2. Every balance change has exactly one ledger row, written in the same
 *      transaction as the change it records. The `idempotencyKey` makes a
 *      replayed action a no-op instead of a double movement.
 *
 * Money semantics are stated in `lib/payout.ts` (the state machine) — read that
 * first. In one line: a withdrawal is held at request, a deposit is confirmed
 * by hand.
 */
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { assertIntegerCents } from "@/lib/money";
import { PLATFORM_FEE_CENTS } from "@/lib/engine/constants";
import {
  canApprovePayout,
  canDeposit,
  canMarkPayoutPaid,
  canRejectPayout,
  canWithdraw,
  depositCreditKey,
  depositGrossCents,
  depositNetCents,
  payoutHoldKey,
  payoutRefundKey,
  WALLET_CURRENCY,
} from "@/lib/payout";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PayoutMethod } from "@/lib/generated/prisma/enums";

/** A rejection the caller can show the member. Anything else is a real bug. */
export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export type WalletResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Run a wallet operation, turning a `WalletError` into a typed failure. */
export async function runWallet<T>(
  fn: () => Promise<T>,
): Promise<WalletResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof WalletError) return { ok: false, error: error.message };
    throw error;
  }
}

type Client = Prisma.TransactionClient | typeof prisma;

/* ---------------------------------------------------------------- wallet --- */

/**
 * Fetch a member's wallet, creating an empty one on first touch.
 *
 * Wallets are not created at registration, so a member who registered before
 * this feature existed has none. Creating-if-absent here means every path that
 * needs a wallet gets one, without a backfill migration.
 */
export async function ensureWallet(userId: string, client: Client = prisma) {
  return client.wallet.upsert({
    where: { userId },
    create: { userId, balanceCents: 0, currency: WALLET_CURRENCY },
    update: {},
    select: { id: true, balanceCents: true, currency: true },
  });
}

/** Read a member's balance without creating a wallet. Null when none exists. */
export async function getBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balanceCents: true, currency: true },
  });
  return wallet ?? { balanceCents: 0, currency: WALLET_CURRENCY };
}

/* ------------------------------------------------------------ withdrawal --- */

export type RequestWithdrawalInput = {
  userId: string;
  amountCents: number;
  method?: PayoutMethod;
  destination?: string | null;
  details?: string | null;
  ip?: string | null;
};

/**
 * A member asks to withdraw. The amount is **held immediately**: the balance is
 * debited and a REQUESTED payout is created in one transaction. A rejection
 * returns the money; approval and payment move nothing.
 */
export async function requestWithdrawal(input: RequestWithdrawalInput) {
  const amount = assertIntegerCents(input.amountCents);

  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(input.userId, tx);

    const verdict = canWithdraw(wallet.balanceCents, amount);
    if (!verdict.ok) throw new WalletError(verdict.reason);

    // Conditional debit — the balance is re-checked inside the UPDATE, so two
    // concurrent requests cannot both pass a stale read.
    const debited = await tx.wallet.updateMany({
      where: { userId: input.userId, balanceCents: { gte: amount } },
      data: { balanceCents: { decrement: amount } },
    });
    if (debited.count === 0) {
      throw new WalletError("That is more than your available balance.");
    }

    const after = await tx.wallet.findUniqueOrThrow({
      where: { userId: input.userId },
      select: { balanceCents: true, currency: true },
    });

    const payout = await tx.payout.create({
      data: {
        userId: input.userId,
        type: "WITHDRAWAL",
        amountCents: amount,
        currency: after.currency,
        status: "REQUESTED",
        method: input.method ?? "BANK_TRANSFER",
        destination: input.destination?.trim() || null,
        details: input.details?.trim() || null,
      },
      select: { id: true, amountCents: true, currency: true, status: true },
    });

    await tx.ledgerEntry.create({
      data: {
        userId: input.userId,
        direction: "DEBIT",
        type: "WITHDRAWAL",
        amountCents: amount,
        balanceAfterCents: after.balanceCents,
        currency: after.currency,
        refType: "Payout",
        refId: payout.id,
        description: "Withdrawal requested — funds held pending review",
        idempotencyKey: payoutHoldKey(payout.id),
      },
    });

    await recordAudit(
      {
        action: "payout.request",
        entity: "Payout",
        entityId: payout.id,
        after: { amountCents: amount, status: "REQUESTED" },
        ip: input.ip ?? null,
      },
      tx,
    );

    return payout;
  });
}

/**
 * An operator approves a payout. No money moves — it was held at request. The
 * status transition is the whole action.
 */
export async function approvePayout(
  payoutId: string,
  adminId: string,
  ip?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
      select: { id: true, status: true },
    });
    if (!payout) throw new WalletError("Payout not found.");
    if (!canApprovePayout(payout.status)) {
      throw new WalletError(
        `A payout that is ${payout.status.toLowerCase()} cannot be approved.`,
      );
    }

    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: "APPROVED",
        approvedById: adminId,
        approvedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    await recordAudit(
      {
        adminId,
        action: "payout.approve",
        entity: "Payout",
        entityId: payoutId,
        before: { status: payout.status },
        after: { status: "APPROVED" },
        ip: ip ?? null,
      },
      tx,
    );

    return updated;
  });
}

/**
 * An operator rejects a payout. The held amount is returned to the wallet. The
 * refund carries an idempotency key, so a replayed rejection credits at most
 * once.
 */
export async function rejectPayout(
  payoutId: string,
  adminId: string,
  reason?: string | null,
  ip?: string | null,
) {
  const note = reason?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        status: true,
        userId: true,
        amountCents: true,
        currency: true,
        details: true,
      },
    });
    if (!payout) throw new WalletError("Payout not found.");
    if (!canRejectPayout(payout.status)) {
      throw new WalletError(
        `A payout that is ${payout.status.toLowerCase()} cannot be rejected.`,
      );
    }

    const refundKey = payoutRefundKey(payoutId);
    const alreadyRefunded = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: refundKey },
      select: { id: true },
    });

    if (!alreadyRefunded) {
      const wallet = await tx.wallet.upsert({
        where: { userId: payout.userId },
        create: {
          userId: payout.userId,
          balanceCents: payout.amountCents,
          currency: payout.currency,
        },
        update: { balanceCents: { increment: payout.amountCents } },
        select: { balanceCents: true, currency: true },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: payout.userId,
          direction: "CREDIT",
          type: "REFUND",
          amountCents: payout.amountCents,
          balanceAfterCents: wallet.balanceCents,
          currency: wallet.currency,
          refType: "Payout",
          refId: payoutId,
          description: note
            ? `Withdrawal rejected — ${note}`
            : "Withdrawal rejected — funds returned",
          idempotencyKey: refundKey,
        },
      });
    }

    // Keep the member's own note, and append the reason so they can see why.
    const details = note
      ? payout.details
        ? `${payout.details}\n\nRejected: ${note}`
        : `Rejected: ${note}`
      : payout.details;

    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: { status: "REJECTED", details },
      select: { id: true, status: true },
    });

    await recordAudit(
      {
        adminId,
        action: "payout.reject",
        entity: "Payout",
        entityId: payoutId,
        before: { status: payout.status },
        after: { status: "REJECTED", reason: note },
        ip: ip ?? null,
      },
      tx,
    );

    return updated;
  });
}

/**
 * An operator marks an approved payout as paid — the money has left the
 * platform. No ledger movement: the debit happened at request.
 */
export async function markPayoutPaid(
  payoutId: string,
  adminId: string,
  ip?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({
      where: { id: payoutId },
      select: { id: true, status: true },
    });
    if (!payout) throw new WalletError("Payout not found.");
    if (!canMarkPayoutPaid(payout.status)) {
      throw new WalletError(
        `A payout that is ${payout.status.toLowerCase()} cannot be marked paid.`,
      );
    }

    const updated = await tx.payout.update({
      where: { id: payoutId },
      data: { status: "PAID", paidAt: new Date() },
      select: { id: true, status: true },
    });

    await recordAudit(
      {
        adminId,
        action: "payout.mark_paid",
        entity: "Payout",
        entityId: payoutId,
        before: { status: payout.status },
        after: { status: "PAID" },
        ip: ip ?? null,
      },
      tx,
    );

    return updated;
  });
}

/* --------------------------------------------------------------- deposit --- */

export type RequestDepositInput = {
  userId: string;
  /** The amount the member wants credited to their wallet (net of the fee). */
  amountCents: number;
  method?: PayoutMethod;
  /** The member's own reference: a tx hash, a bank reference, a receipt number. */
  reference?: string | null;
};

/**
 * A member files a deposit intent. Nothing is credited yet — an operator
 * confirms the funds arrived (`confirmDeposit`). The gross charged is the net
 * the member named plus the platform fee.
 */
export async function requestDeposit(input: {
  userId: string;
  amountCents: number;
  method?: PayoutMethod;
  reference?: string | null;
}) {
  const net = assertIntegerCents(input.amountCents);

  const verdict = canDeposit(net);
  if (!verdict.ok) throw new WalletError(verdict.reason);

  const gross = depositGrossCents(net);

  return prisma.payment.create({
    data: {
      userId: input.userId,
      purpose: "DEPOSIT",
      amountCents: gross,
      platformFeeCents: PLATFORM_FEE_CENTS,
      currency: WALLET_CURRENCY,
      status: "PENDING",
      paymentRef: `DEP-${crypto.randomUUID()}`,
      gatewayTxid: input.reference?.trim() || null,
    },
    select: { id: true, amountCents: true, platformFeeCents: true, status: true },
  });
}

/**
 * An operator confirms a deposit arrived. The wallet is credited the **net**
 * (gross minus the platform fee), the payment becomes PAID, and the operator's
 * cut is recorded as a `PlatformFee` to be settled by hand. The credit carries
 * an idempotency key, so a replayed confirmation credits at most once.
 */
export async function confirmDeposit(
  paymentId: string,
  adminId: string,
  ip?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        purpose: true,
        userId: true,
        amountCents: true,
        platformFeeCents: true,
      },
    });
    if (!payment) throw new WalletError("Deposit not found.");
    if (payment.purpose !== "DEPOSIT") {
      throw new WalletError("That payment is not a deposit.");
    }
    if (payment.status !== "PENDING") {
      throw new WalletError(
        `A deposit that is ${payment.status.toLowerCase()} cannot be confirmed.`,
      );
    }

    const net = depositNetCents(payment.amountCents, payment.platformFeeCents);
    const creditKey = depositCreditKey(payment.id);
    const alreadyCredited = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: creditKey },
      select: { id: true },
    });

    if (!alreadyCredited) {
      const wallet = await tx.wallet.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          balanceCents: net,
          currency: WALLET_CURRENCY,
        },
        update: { balanceCents: { increment: net } },
        select: { balanceCents: true, currency: true },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: payment.userId,
          direction: "CREDIT",
          type: "DEPOSIT",
          amountCents: net,
          balanceAfterCents: wallet.balanceCents,
          currency: wallet.currency,
          refType: "Payment",
          refId: payment.id,
          description: "Deposit confirmed",
          idempotencyKey: creditKey,
        },
      });
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (payment.platformFeeCents > 0) {
      await tx.platformFee.upsert({
        where: { paymentId: payment.id },
        create: {
          userId: payment.userId,
          paymentId: payment.id,
          purpose: "DEPOSIT",
          amountCents: payment.platformFeeCents,
          currency: WALLET_CURRENCY,
          status: "PENDING",
        },
        update: {},
      });
    }

    await recordAudit(
      {
        adminId,
        action: "deposit.confirm",
        entity: "Payment",
        entityId: payment.id,
        before: { status: payment.status },
        after: { status: "PAID", creditedCents: net },
        ip: ip ?? null,
      },
      tx,
    );

    return { id: payment.id, status: "PAID" as const, creditedCents: net };
  });
}

/** An operator rejects a deposit — the funds never arrived, or did not match. */
export async function rejectDeposit(
  paymentId: string,
  adminId: string,
  reason?: string | null,
  ip?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, purpose: true },
    });
    if (!payment) throw new WalletError("Deposit not found.");
    if (payment.purpose !== "DEPOSIT") {
      throw new WalletError("That payment is not a deposit.");
    }
    if (payment.status !== "PENDING") {
      throw new WalletError(
        `A deposit that is ${payment.status.toLowerCase()} cannot be rejected.`,
      );
    }

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
      select: { id: true, status: true },
    });

    await recordAudit(
      {
        adminId,
        action: "deposit.reject",
        entity: "Payment",
        entityId: payment.id,
        before: { status: payment.status },
        after: { status: "FAILED", reason: reason?.trim() || null },
        ip: ip ?? null,
      },
      tx,
    );

    return updated;
  });
}
