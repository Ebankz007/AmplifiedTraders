import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DepositActions } from "@/components/admin/money-actions";
import type { PaymentStatus } from "@/lib/generated/prisma/enums";

export const metadata = { title: "Deposits" };

const PAGE_SIZE = 25;

const statusVariant: Record<PaymentStatus, BadgeVariant> = {
  PENDING: "warning",
  PAID: "success",
  EXPIRED: "outline",
  FAILED: "danger",
};

const statusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Confirmed",
  EXPIRED: "Expired",
  FAILED: "Rejected",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PAID", label: "Confirmed" },
  { key: "FAILED", label: "Rejected" },
];

function pageHref(page: number, status: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", page.toString());
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/deposits?${qs}` : "/admin/deposits";
}

/**
 * The deposit queue.
 *
 * A member files an intent; nothing is credited until an operator confirms the
 * funds arrived here. Confirming credits the wallet the **net** (gross minus the
 * platform fee) and records the operator's cut for settlement.
 */
export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdminPermission("deposits");
  const { page: pageRaw, status: statusRaw } = await searchParams;

  const status = FILTERS.some((f) => f.key === statusRaw) ? statusRaw! : "all";
  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    purpose: "DEPOSIT" as const,
    ...(status === "all" ? {} : { status: status as PaymentStatus }),
  };

  const [total, pending, deposits] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { purpose: "DEPOSIT", status: "PENDING" } }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        amountCents: true,
        platformFeeCents: true,
        currency: true,
        status: true,
        gatewayTxid: true,
        paymentRef: true,
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
          Deposits
        </h1>
        <p className="mt-1 text-sm text-muted">
          {pending} awaiting confirmation · {total} total
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

      {deposits.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-faint">
              {status === "all"
                ? "No deposits yet. Members file them from their wallet."
                : "No deposits match this filter."}
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
                      You send
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Credited
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Reference
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Filed
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="border-b border-border align-top">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/users/${deposit.user.id}`}
                          className="text-foreground hover:text-brand"
                        >
                          {deposit.user.fullName}
                        </Link>
                        <div className="text-xs text-faint">{deposit.user.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-foreground">
                        {formatCents(deposit.amountCents, deposit.currency)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-gold">
                        {formatCents(
                          deposit.amountCents - deposit.platformFeeCents,
                          deposit.currency,
                        )}
                      </td>
                      <td className="max-w-xs px-5 py-3 text-muted">
                        {deposit.gatewayTxid ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[deposit.status]}>
                          {statusLabel[deposit.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {formatDate(deposit.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <DepositActions
                          paymentId={deposit.id}
                          status={deposit.status}
                        />
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
        <nav aria-label="Deposit pages" className="flex items-center justify-between">
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
