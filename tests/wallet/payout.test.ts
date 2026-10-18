import { describe, expect, it } from "vitest";
import {
  canApprovePayout,
  canDeposit,
  canMarkPayoutPaid,
  canRejectPayout,
  canWithdraw,
  DEPOSIT_MIN_CENTS,
  depositCreditKey,
  depositGrossCents,
  depositNetCents,
  isOpenPayout,
  PAYOUT_METHOD_LABELS,
  PAYOUT_METHODS,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUSES,
  payoutHoldKey,
  payoutRefundKey,
  WALLET_CURRENCY,
  WITHDRAWAL_MIN_CENTS,
} from "@/lib/payout";
import { PLATFORM_FEE_CENTS } from "@/lib/engine/constants";
import { PayoutMethod, PayoutStatus } from "@/lib/generated/prisma/enums";
import {
  depositDecisionSchema,
  depositRequestSchema,
  payoutDecisionSchema,
  withdrawalRequestSchema,
} from "@/lib/validators";

describe("payout vocabulary", () => {
  it("matches the generated status enum in both directions", () => {
    const fromEnum = Object.values(PayoutStatus).sort();
    expect([...PAYOUT_STATUSES].sort()).toEqual(fromEnum);
    expect(Object.keys(PAYOUT_STATUS_LABELS).sort()).toEqual(fromEnum);
  });

  it("matches the generated method enum in both directions", () => {
    const fromEnum = Object.values(PayoutMethod).sort();
    expect([...PAYOUT_METHODS].sort()).toEqual(fromEnum);
    expect(Object.keys(PAYOUT_METHOD_LABELS).sort()).toEqual(fromEnum);
  });

  it("gives every status and method a non-empty label", () => {
    for (const status of PAYOUT_STATUSES) {
      expect(PAYOUT_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
    for (const method of PAYOUT_METHODS) {
      expect(PAYOUT_METHOD_LABELS[method].length).toBeGreaterThan(0);
    }
  });

  it("denominates the wallet in USD", () => {
    expect(WALLET_CURRENCY).toBe("USD");
  });
});

describe("idempotency keys", () => {
  it("names the payout and the movement, so a replay collides", () => {
    expect(payoutHoldKey("p1")).toBe("payout:p1:hold");
    expect(payoutRefundKey("p1")).toBe("payout:p1:refund");
    expect(depositCreditKey("d1")).toBe("deposit:d1:credit");
  });

  it("gives the hold and the refund different keys", () => {
    // If they were equal, the refund would collide with the hold and be lost.
    expect(payoutHoldKey("p1")).not.toBe(payoutRefundKey("p1"));
  });
});

describe("canWithdraw", () => {
  it("refuses zero and negative amounts", () => {
    expect(canWithdraw(100000, 0).ok).toBe(false);
    expect(canWithdraw(100000, -500).ok).toBe(false);
  });

  it("refuses a non-integer amount of cents", () => {
    expect(canWithdraw(100000, 1999.5).ok).toBe(false);
  });

  it("refuses below the minimum", () => {
    expect(canWithdraw(100000, WITHDRAWAL_MIN_CENTS - 1).ok).toBe(false);
  });

  it("allows exactly the minimum", () => {
    expect(canWithdraw(WITHDRAWAL_MIN_CENTS, WITHDRAWAL_MIN_CENTS).ok).toBe(true);
  });

  it("refuses more than the balance", () => {
    expect(canWithdraw(5000, 5001).ok).toBe(false);
  });

  it("allows exactly the balance", () => {
    expect(canWithdraw(5000, 5000).ok).toBe(true);
  });

  it("refuses everything when the balance is zero", () => {
    expect(canWithdraw(0, WITHDRAWAL_MIN_CENTS).ok).toBe(false);
  });

  it("carries a reason on every refusal", () => {
    for (const [balance, amount] of [
      [0, 0],
      [0, WITHDRAWAL_MIN_CENTS],
      [100000, 1],
      [100000, 999999],
    ] as const) {
      const verdict = canWithdraw(balance, amount);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("canDeposit", () => {
  it("refuses zero, negative and non-integer", () => {
    expect(canDeposit(0).ok).toBe(false);
    expect(canDeposit(-100).ok).toBe(false);
    expect(canDeposit(10.5).ok).toBe(false);
  });

  it("refuses below the minimum", () => {
    expect(canDeposit(DEPOSIT_MIN_CENTS - 1).ok).toBe(false);
  });

  it("accepts the minimum and above", () => {
    expect(canDeposit(DEPOSIT_MIN_CENTS).ok).toBe(true);
    expect(canDeposit(100000).ok).toBe(true);
  });
});

describe("deposit fee arithmetic", () => {
  it("adds the platform fee on top of the amount the member names", () => {
    expect(depositGrossCents(10000)).toBe(10000 + PLATFORM_FEE_CENTS);
  });

  it("round-trips: gross minus fee is the net", () => {
    const net = 25000;
    const gross = depositGrossCents(net);
    expect(depositNetCents(gross, PLATFORM_FEE_CENTS)).toBe(net);
  });

  it("is fee-on-top, not fee-deducted", () => {
    // The member names the amount they want credited; the fee is added, so the
    // net is never the gross.
    expect(depositGrossCents(10000)).toBeGreaterThan(10000);
  });
});

describe("payout state machine", () => {
  it("allows approval only from REQUESTED", () => {
    expect(canApprovePayout("REQUESTED")).toBe(true);
    expect(canApprovePayout("APPROVED")).toBe(false);
    expect(canApprovePayout("PAID")).toBe(false);
    expect(canApprovePayout("REJECTED")).toBe(false);
  });

  it("allows rejection from REQUESTED and APPROVED, but not terminal states", () => {
    expect(canRejectPayout("REQUESTED")).toBe(true);
    expect(canRejectPayout("APPROVED")).toBe(true);
    expect(canRejectPayout("PAID")).toBe(false);
    expect(canRejectPayout("REJECTED")).toBe(false);
  });

  it("allows marking paid only from APPROVED", () => {
    expect(canMarkPayoutPaid("APPROVED")).toBe(true);
    expect(canMarkPayoutPaid("REQUESTED")).toBe(false);
    expect(canMarkPayoutPaid("PAID")).toBe(false);
    expect(canMarkPayoutPaid("REJECTED")).toBe(false);
  });

  it("treats REQUESTED and APPROVED as open, the rest as settled", () => {
    expect(isOpenPayout("REQUESTED")).toBe(true);
    expect(isOpenPayout("APPROVED")).toBe(true);
    expect(isOpenPayout("PAID")).toBe(false);
    expect(isOpenPayout("REJECTED")).toBe(false);
  });

  it("never lets a settled payout be reopened", () => {
    for (const status of ["PAID", "REJECTED"] as const) {
      expect(canApprovePayout(status)).toBe(false);
      expect(canRejectPayout(status)).toBe(false);
      expect(canMarkPayoutPaid(status)).toBe(false);
    }
  });
});

describe("wallet schemas", () => {
  it("accepts a withdrawal with an amount and method", () => {
    expect(
      withdrawalRequestSchema.safeParse({ amount: "50.00", method: "CRYPTO" })
        .success,
    ).toBe(true);
  });

  it("defaults the withdrawal method when omitted", () => {
    const parsed = withdrawalRequestSchema.safeParse({ amount: "50" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.method).toBe("BANK_TRANSFER");
  });

  it("rejects a withdrawal with no amount", () => {
    expect(withdrawalRequestSchema.safeParse({ amount: "" }).success).toBe(false);
  });

  it("accepts a deposit intent and defaults the method to CRYPTO", () => {
    const parsed = depositRequestSchema.safeParse({ amount: "100" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.method).toBe("CRYPTO");
  });

  it("requires a reason to reject a payout", () => {
    expect(payoutDecisionSchema.safeParse({ action: "reject" }).success).toBe(
      false,
    );
    expect(
      payoutDecisionSchema.safeParse({ action: "reject", reason: "no" }).success,
    ).toBe(false);
    expect(
      payoutDecisionSchema.safeParse({
        action: "reject",
        reason: "destination unreadable",
      }).success,
    ).toBe(true);
  });

  it("does not require a reason to approve or mark paid", () => {
    expect(payoutDecisionSchema.safeParse({ action: "approve" }).success).toBe(
      true,
    );
    expect(payoutDecisionSchema.safeParse({ action: "mark_paid" }).success).toBe(
      true,
    );
  });

  it("requires a reason to reject a deposit", () => {
    expect(depositDecisionSchema.safeParse({ action: "reject" }).success).toBe(
      false,
    );
    expect(
      depositDecisionSchema.safeParse({ action: "reject", reason: "no" }).success,
    ).toBe(false);
    expect(depositDecisionSchema.safeParse({ action: "confirm" }).success).toBe(
      true,
    );
  });

  it("refuses an unknown action", () => {
    expect(payoutDecisionSchema.safeParse({ action: "refund" }).success).toBe(
      false,
    );
    expect(depositDecisionSchema.safeParse({ action: "approve" }).success).toBe(
      false,
    );
  });

  it("keeps the vocabulary and the database enum in step", () => {
    expect([...PAYOUT_STATUSES].sort()).toEqual(
      Object.values(PayoutStatus).sort(),
    );
    expect([...PAYOUT_METHODS].sort()).toEqual(
      Object.values(PayoutMethod).sort(),
    );
    expect(Object.keys(PAYOUT_STATUS_LABELS).sort()).toEqual(
      Object.values(PayoutStatus).sort(),
    );
    expect(Object.keys(PAYOUT_METHOD_LABELS).sort()).toEqual(
      Object.values(PayoutMethod).sort(),
    );
  });
});

describe("withdrawal minimum is a real floor", () => {
  it("is at least a dollar, so dust requests are refused", () => {
    expect(WITHDRAWAL_MIN_CENTS).toBeGreaterThanOrEqual(100);
  });

  it("refuses one cent below the minimum at a large balance", () => {
    expect(canWithdraw(10_000_000, WITHDRAWAL_MIN_CENTS - 1).ok).toBe(false);
  });
});
