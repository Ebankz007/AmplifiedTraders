/**
 * Amplified Traders — payout vocabulary and money policy.
 *
 * Pure: no Prisma, no `next/headers`. This module is imported by the server
 * wallet (`lib/wallet.ts`), the validators and the UI alike, so it must stay
 * free of anything that only exists on the server. The database writes live in
 * `lib/wallet.ts`; the *rules* live here, where a test can reach them without a
 * database.
 *
 * The state machine, stated once:
 *
 *   REQUESTED ──approve──▶ APPROVED ──mark paid──▶ PAID
 *       │                      │
 *       └──────reject──────────┴────▶ REJECTED   (refunds the held amount)
 *
 * A withdrawal is **held at request**: the balance drops the moment the member
 * asks, and a rejection returns it. Approving and marking paid move no money —
 * it left at request. This is the only shape the schema supports without a
 * separate "reserved" column: with no reserved field, debiting later would let a
 * member spend the same balance twice while a payout sat in the queue.
 */
import { assertIntegerCents, formatCents } from "@/lib/money";
import { PLATFORM_FEE_CENTS } from "@/lib/engine/constants";
import {
  LedgerDirection,
  PayoutMethod,
  PayoutStatus,
} from "@/lib/generated/prisma/enums";
import type {
  PayoutMethod as Method,
  PayoutStatus as Status,
} from "@/lib/generated/prisma/enums";

/* ------------------------------------------------------------- currency ---- */

/**
 * The wallet, the ledger and every payout are denominated in USD. The payment
 * rail's own default is USDT; the deposit writer sets the currency explicitly so
 * a pegged-crypto charge is never silently recorded as USD by omission. Whether
 * the rail should credit 1:1 against USDT is a business decision, not a code
 * one — see `docs/` and the open question in state.
 */
export const WALLET_CURRENCY = "USD";

/* ---------------------------------------------------------------- limits --- */

/** Minimum a member may withdraw in one request. $20.00. */
export const WITHDRAWAL_MIN_CENTS = 2000;

/** Minimum a member may deposit in one request. $20.00. */
export const DEPOSIT_MIN_CENTS = 2000;

/* ------------------------------------------------------------ vocabulary --- */

export const PAYOUT_STATUSES = Object.values(PayoutStatus) as [
  Status,
  ...Status[],
];

export const PAYOUT_STATUS_LABELS: Record<Status, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export const PAYOUT_METHODS = Object.values(PayoutMethod) as [
  Method,
  ...Method[],
];

export const PAYOUT_METHOD_LABELS: Record<Method, string> = {
  BANK_TRANSFER: "Bank transfer",
  CRYPTO: "Crypto",
  WALLET: "Wallet",
  OTHER: "Other",
};

export const LEDGER_DIRECTIONS = Object.values(LedgerDirection) as [
  LedgerDirection,
  ...LedgerDirection[],
];

/* ------------------------------------------------------------- idempotency - */

/**
 * The ledger is append-only, and every money movement carries a key that is
 * unique in the table. A replayed action therefore collides on the key and
 * becomes a no-op instead of a second debit or credit.
 */
export function payoutHoldKey(payoutId: string): string {
  return `payout:${payoutId}:hold`;
}

export function payoutRefundKey(payoutId: string): string {
  return `payout:${payoutId}:refund`;
}

export function depositCreditKey(paymentId: string): string {
  return `deposit:${paymentId}:credit`;
}

/* ---------------------------------------------------------------- policy --- */

export type PolicyVerdict = { ok: true } | { ok: false; reason: string };

/**
 * May this member withdraw this amount from this balance?
 *
 * Pure and total: every rejection carries a sentence the member can act on.
 * The database re-checks the balance inside the debit (`lib/wallet.ts`); this
 * function exists to give the *first* answer, and the same one the form shows.
 */
export function canWithdraw(
  balanceCents: number,
  amountCents: number,
): PolicyVerdict {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: "Enter an amount greater than zero." };
  }
  if (amountCents < WITHDRAWAL_MIN_CENTS) {
    return {
      ok: false,
      reason: `The minimum withdrawal is ${formatCents(WITHDRAWAL_MIN_CENTS)}.`,
    };
  }
  if (amountCents > balanceCents) {
    return { ok: false, reason: "That is more than your available balance." };
  }
  return { ok: true };
}

/** May this member deposit this amount? */
export function canDeposit(amountCents: number): PolicyVerdict {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: "Enter an amount greater than zero." };
  }
  if (amountCents < DEPOSIT_MIN_CENTS) {
    return {
      ok: false,
      reason: `The minimum deposit is ${formatCents(DEPOSIT_MIN_CENTS)}.`,
    };
  }
  return { ok: true };
}

/**
 * The gross a member is charged to receive `netCents` in their wallet.
 *
 * The platform fee is charged **on top**, exactly as it is on a registration
 * ($55 charged for a $50 plan): the member names the amount they want credited,
 * and the operator's cut is added. `Payment.amountCents` stores this gross.
 */
export function depositGrossCents(netCents: number): number {
  return assertIntegerCents(netCents) + PLATFORM_FEE_CENTS;
}

/** The amount credited to the wallet from a stored gross payment. */
export function depositNetCents(grossCents: number, feeCents: number): number {
  return assertIntegerCents(grossCents) - assertIntegerCents(feeCents);
}

export function canApprovePayout(status: Status): boolean {
  return status === "REQUESTED";
}

/**
 * A rejection is allowed from REQUESTED and from APPROVED. Reversing an
 * approval is an operator correcting a mistake, and it is safe to allow: the
 * refund carries an idempotency key, so it can happen at most once.
 */
export function canRejectPayout(status: Status): boolean {
  return status === "REQUESTED" || status === "APPROVED";
}

export function canMarkPayoutPaid(status: Status): boolean {
  return status === "APPROVED";
}

/** A payout still waiting on an operator. Drives the admin queue counters. */
export function isOpenPayout(status: Status): boolean {
  return status === "REQUESTED" || status === "APPROVED";
}
