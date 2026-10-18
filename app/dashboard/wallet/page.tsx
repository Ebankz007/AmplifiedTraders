import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { getBalance } from "@/lib/wallet";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const user = await requireUser();

  const [balance, entries, payouts, pendingDeposits] = await Promise.all([
    getBalance(user.id),
    prisma.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        direction: true,
        type: true,
        amountCents: true,
        balanceAfterCents: true,
        currency: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.payout.findMany({
      where: { userId: user.id, status: { in: ["REQUESTED", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        method: true,
        createdAt: true,
      },
    }),
    prisma.payment.count({
      where: { userId: user.id, purpose: "DEPOSIT", status: "PENDING" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Wallet
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your balance, and every movement against it.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/wallet/deposit"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand/50"
          >
            Add funds
          </Link>
          <Link
            href="/dashboard/wallet/withdraw"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Withdraw
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 sm:col-span-1">
          <p className="text-xs uppercase tracking-wide text-faint">
            Available balance
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-gold">
            {formatCents(balance.balanceCents, balance.currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-faint">
            Pending withdrawals
          </p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {payouts.length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-faint">
            Deposits awaiting confirmation
          </p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {pendingDeposits}
          </p>
        </Card>
      </div>

      {payouts.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Withdrawals in progress
            </h2>
            <ul className="mt-3 divide-y divide-border">
              {payouts.map((payout) => (
                <li
                  key={payout.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="text-muted">
                    {formatCents(payout.amountCents, payout.currency)} ·{" "}
                    {payout.method.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span className="text-faint">
                    {payout.status === "REQUESTED"
                      ? "Awaiting review"
                      : "Approved — being paid"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Recent activity
            </h2>
            <a href="/dashboard/transactions" className="text-sm text-brand">
              View all
            </a>
          </div>
          {entries.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-faint">
              No movements yet. Add funds to get started — a confirmed deposit
              appears here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Date
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Description
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-faint">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-faint">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border">
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="max-w-xs px-5 py-3 text-muted">
                        {entry.description ?? entry.type}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        <span
                          className={
                            entry.direction === "CREDIT"
                              ? "text-gold"
                              : "text-foreground"
                          }
                        >
                          {entry.direction === "CREDIT" ? "+" : "−"}
                          {formatCents(entry.amountCents, entry.currency)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-muted">
                        {formatCents(entry.balanceAfterCents, entry.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
