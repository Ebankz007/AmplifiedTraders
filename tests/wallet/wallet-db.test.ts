import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  approvePayout,
  confirmDeposit,
  markPayoutPaid,
  rejectDeposit,
  rejectPayout,
  requestDeposit,
  requestWithdrawal,
  WalletError,
} from "@/lib/wallet";

/**
 * The money loop, against a real database.
 *
 * These are the only tests that touch the database, and they are skipped when
 * `DATABASE_URL` is absent (`tests/setup.ts` loads `.env` when it can). Every
 * fixture is created with a random email and deleted in `afterAll`, so the
 * suite leaves the database as it found it.
 *
 * What they prove, and why each one matters:
 *   - a deposit credits the wallet only on confirmation, and only the net;
 *   - a withdrawal holds the balance at request, and a rejection returns it;
 *   - approving and marking paid move no money (the debit already happened);
 *   - the balance can never go negative, even under two concurrent requests;
 *   - a settled payout cannot be re-settled, so no double refund.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

const createdUserIds: string[] = [];
const createdAdminIds: string[] = [];

async function newUser(balanceCents = 0) {
  const user = await prisma.user.create({
    data: {
      email: `wallet-test-${crypto.randomUUID()}@example.test`,
      passwordHash: "not-a-real-hash",
      fullName: "Wallet Test",
    },
  });
  createdUserIds.push(user.id);
  await prisma.wallet.create({
    data: { userId: user.id, balanceCents, currency: "USD" },
  });
  return user;
}

async function newAdmin() {
  const admin = await prisma.admin.create({
    data: {
      email: `wallet-admin-${crypto.randomUUID()}@example.test`,
      passwordHash: "not-a-real-hash",
      name: "Wallet Admin",
      role: "FINANCE_ADMIN",
    },
  });
  createdAdminIds.push(admin.id);
  return admin;
}

async function balanceOf(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { userId },
    select: { balanceCents: true },
  });
  return wallet.balanceCents;
}

describe.skipIf(!hasDb)("wallet money movements (database)", () => {
  let adminId = "";

  beforeAll(async () => {
    const admin = await newAdmin();
    adminId = admin.id;
  });

  afterAll(async () => {
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdAdminIds.length) {
      await prisma.admin.deleteMany({ where: { id: { in: createdAdminIds } } });
    }
    await prisma.$disconnect();
  });

  /* ------------------------------------------------------------ deposits -- */

  it("credits the wallet only after a deposit is confirmed, and only the net", async () => {
    const user = await newUser(0);

    const intent = await requestDeposit({ userId: user.id, amountCents: 5000 });
    expect(await balanceOf(user.id)).toBe(0);

    const pending = await prisma.payment.findUniqueOrThrow({
      where: { id: intent.id },
    });
    expect(pending.status).toBe("PENDING");
    expect(pending.amountCents).toBe(5500); // gross = net + fee
    expect(pending.platformFeeCents).toBe(500);

    await confirmDeposit(intent.id, adminId);
    expect(await balanceOf(user.id)).toBe(5000); // net credited

    const paid = await prisma.payment.findUniqueOrThrow({
      where: { id: intent.id },
    });
    expect(paid.status).toBe("PAID");

    const fee = await prisma.platformFee.findUnique({
      where: { paymentId: intent.id },
    });
    expect(fee?.amountCents).toBe(500);

    const ledger = await prisma.ledgerEntry.findMany({
      where: { userId: user.id },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].direction).toBe("CREDIT");
    expect(ledger[0].amountCents).toBe(5000);
    expect(ledger[0].balanceAfterCents).toBe(5000);
  });

  it("refuses to confirm the same deposit twice", async () => {
    const user = await newUser(0);
    const intent = await requestDeposit({ userId: user.id, amountCents: 5000 });

    await confirmDeposit(intent.id, adminId);
    await expect(confirmDeposit(intent.id, adminId)).rejects.toBeInstanceOf(
      WalletError,
    );
    expect(await balanceOf(user.id)).toBe(5000);
  });

  it("moves no money when a deposit is rejected", async () => {
    const user = await newUser(0);
    const intent = await requestDeposit({ userId: user.id, amountCents: 5000 });

    await prisma.payment.update({
      where: { id: intent.id },
      data: { status: "PENDING" },
    });
    await rejectDeposit(intent.id, adminId, "no matching transfer");

    expect(await balanceOf(user.id)).toBe(0);
    const row = await prisma.payment.findUniqueOrThrow({
      where: { id: intent.id },
    });
    expect(row.status).toBe("FAILED");
  });

  /* --------------------------------------------------------- withdrawals -- */

  it("holds the balance at request", async () => {
    const user = await newUser(10000);
    const payout = await requestWithdrawal({
      userId: user.id,
      amountCents: 4000,
    });

    expect(await balanceOf(user.id)).toBe(6000);
    const row = await prisma.payout.findUniqueOrThrow({
      where: { id: payout.id },
    });
    expect(row.status).toBe("REQUESTED");

    const ledger = await prisma.ledgerEntry.findMany({
      where: { userId: user.id },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].direction).toBe("DEBIT");
    expect(ledger[0].type).toBe("WITHDRAWAL");
    expect(ledger[0].amountCents).toBe(4000);
  });

  it("refuses a withdrawal larger than the balance", async () => {
    const user = await newUser(1000);
    await expect(
      requestWithdrawal({ userId: user.id, amountCents: 5000 }),
    ).rejects.toBeInstanceOf(WalletError);
    expect(await balanceOf(user.id)).toBe(1000);
  });

  it("moves no money on approve or mark paid", async () => {
    const user = await newUser(10000);
    const payout = await requestWithdrawal({
      userId: user.id,
      amountCents: 4000,
    });
    expect(await balanceOf(user.id)).toBe(6000);

    await approvePayout(payout.id, adminId);
    expect(await balanceOf(user.id)).toBe(6000);
    const approved = await prisma.payout.findUniqueOrThrow({
      where: { id: payout.id },
    });
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe(adminId);

    await markPayoutPaid(payout.id, adminId);
    expect(await balanceOf(user.id)).toBe(6000);
    const paid = await prisma.payout.findUniqueOrThrow({
      where: { id: payout.id },
    });
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).not.toBeNull();
  });

  it("refunds the held amount on rejection", async () => {
    const user = await newUser(10000);
    const payout = await requestWithdrawal({
      userId: user.id,
      amountCents: 4000,
    });
    expect(await balanceOf(user.id)).toBe(6000);

    await rejectPayout(payout.id, adminId, "destination unreadable");
    expect(await balanceOf(user.id)).toBe(10000);

    const row = await prisma.payout.findUniqueOrThrow({
      where: { id: payout.id },
    });
    expect(row.status).toBe("REJECTED");
    expect(row.details).toContain("destination unreadable");

    const ledger = await prisma.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    expect(ledger).toHaveLength(2);
    expect(ledger[1].direction).toBe("CREDIT");
    expect(ledger[1].type).toBe("REFUND");
    expect(ledger[1].amountCents).toBe(4000);
    expect(ledger[1].balanceAfterCents).toBe(10000);
  });

  it("refunds when an approved payout is rejected", async () => {
    const user = await newUser(10000);
    const payout = await requestWithdrawal({
      userId: user.id,
      amountCents: 4000,
    });

    await approvePayout(payout.id, adminId);
    await rejectPayout(payout.id, adminId, "operator error");
    expect(await balanceOf(user.id)).toBe(10000);
  });

  it("refuses a second rejection, so funds are never double-refunded", async () => {
    const user = await newUser(10000);
    const payout = await requestWithdrawal({
      userId: user.id,
      amountCents: 4000,
    });

    await rejectPayout(payout.id, adminId, "first");
    await expect(
      rejectPayout(payout.id, adminId, "second"),
    ).rejects.toBeInstanceOf(WalletError);
    expect(await balanceOf(user.id)).toBe(10000);
  });

  it("lets only one of two concurrent requests succeed", async () => {
    const user = await newUser(5000);

    const results = await Promise.allSettled([
      requestWithdrawal({ userId: user.id, amountCents: 4000 }),
      requestWithdrawal({ userId: user.id, amountCents: 4000 }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(1);
    expect(await balanceOf(user.id)).toBe(1000);
  });

  it("writes an audit row for each operator action", async () => {
    const user = await newUser(10000);
    const payout = await requestWithdrawal({
      userId: user.id,
      amountCents: 4000,
    });
    await approvePayout(payout.id, adminId);

    const logs = await prisma.auditLog.findMany({
      where: { entity: "Payout", entityId: payout.id },
      select: { action: true },
    });
    const actions = logs.map((l) => l.action);
    expect(actions).toContain("payout.request");
    expect(actions).toContain("payout.approve");
  });
});
