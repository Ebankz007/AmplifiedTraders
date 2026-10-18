import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PayoutActions } from "@/components/admin/money-actions";
import {
  PAYOUT_METHOD_LABELS,
  PAYOUT_STATUS_LABELS,
} from "@/lib/payout";
import type { PayoutStatus } from "@/lib/generated/prisma/enums";

export const metadata = { title: "Withdrawals" };

const PAGE_SIZE = 25;

const statusVariant: Record<PayoutStatus, BadgeVariant> = {
  REQUESTED: "warning",
  APPROVED: "brand",
  REJECTED: "danger",
  PAID: "success",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "REQUESTED", label: "Requested" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAID", label: "Paid" },
  { key: "REJECTED", label: "Rejected" },
];

function pageHref(page: number, status: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", page.toString());
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/withdrawals?${qs}` : "/admin/withdrawals";
}

/**
 * The withdrawal queue.
 *
 * The other end of the member's "Withdraw" button. The amount was already held
 * when the member requested it, so approving here moves no money — it only
 * commits the platform to paying out. Rejecting returns the held funds.
 */
export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdminPermission("withdrawals");
  const { page: pageRaw, status: statusRaw } = await searchParams;

  const status = FILTERS.some((f) => f.key === statusRaw) ? statusRaw! : "all";
  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where = status === "all" ? {} : { status: status as PayoutStatus };

  const [total, waiting, payouts] = await Promise.all([
    prisma.payout.count({ where }),
    prisma.payout.count({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
    }),
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        method: true,
        destination: true,
        createdAt: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Withdrawals
        </h1>
        <p className="mt-1 text-sm text-muted">
          {waiting} awaiting action · {total} total
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={pageHref(1, f.key)}
            className={f.key === status ? "text-brand" : "text-muted hover:text-foreground"}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {payouts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-faint">
              {status === "all"
                ? "No withdrawals yet. Members request them from their wallet."
                : "No withdrawals match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Member
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Method
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Destination
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Requested
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-border align-top">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/users/${payout.user.id}`}
                          className="text-foreground hover:text-brand"
                        >
                          {payout.user.fullName}
                        </Link>
                        <div className="text-xs text-faint">{payout.user.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-foreground">
                        {formatCents(payout.amountCents, payout.currency)}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {PAYOUT_METHOD_LABELS[payout.method]}
                      </td>
                      <td className="max-w-xs px-5 py-3 text-muted">
                        {payout.destination ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[payout.status]}>
                          {PAYOUT_STATUS_LABELS[payout.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {formatDate(payout.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <PayoutActions payoutId={payout.id} status={payout.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Withdrawal pages" className="flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1, status)} className="text-sm text-brand">
              ← Previous
            </Link>
          ) : (
            <span className="text-sm text-faint">← Previous</span>
          )}
          <span className="text-sm text-faint">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1, status)} className="text-sm text-brand">
              Next →
            </Link>
          ) : (
            <span className="text-sm text-faint">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
