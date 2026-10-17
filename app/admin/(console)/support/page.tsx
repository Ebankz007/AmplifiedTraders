import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SUPPORT_STATUS_LABELS, categoryLabel } from "@/lib/support";
import type { SupportTicketStatus } from "@/lib/generated/prisma/enums";

export const metadata = { title: "Support" };

const PAGE_SIZE = 25;

const statusVariant: Record<SupportTicketStatus, BadgeVariant> = {
  OPEN: "warning",
  PENDING: "brand",
  RESOLVED: "success",
  CLOSED: "outline",
};

const priorityVariant: Record<string, BadgeVariant> = {
  LOW: "outline",
  NORMAL: "outline",
  HIGH: "warning",
  URGENT: "danger",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "PENDING", label: "Awaiting member" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
];

function pageHref(page: number, status: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", page.toString());
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/support?${qs}` : "/admin/support";
}

/**
 * The support inbox.
 *
 * This is the other end of the member portal's ticket form — before it existed,
 * members could open tickets and the portal promised "our team will pick it up"
 * with nothing on the other side. The queue is ordered by `lastMessageAt` so the
 * tickets actually waiting on someone float to the top.
 */
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdminPermission("messages");
  const { page: pageRaw, status: statusRaw } = await searchParams;

  const status = FILTERS.some((f) => f.key === statusRaw) ? statusRaw! : "all";
  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where =
    status === "all" ? {} : { status: status as SupportTicketStatus };

  const [total, waiting, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    prisma.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        user: { select: { id: true, email: true, fullName: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Support
        </h1>
        <p className="mt-1 text-sm text-muted">
          {total.toLocaleString("en-US")} ticket{total === 1 ? "" : "s"}{" "}
          {status === "all" ? "total" : `filtered by ${status.toLowerCase()}`}
          {waiting > 0 ? ` · ${waiting} still open` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={pageHref(1, f.key)}
            className={
              status === f.key
                ? "text-brand"
                : "text-muted hover:text-foreground"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-faint">
              {page > 1
                ? "Nothing on this page — you may have reached the end of the list."
                : status === "all"
                  ? "No tickets yet. Members open them from the portal."
                  : "No tickets match this filter."}
            </p>
            {page > 1 && (
              <Link
                href={pageHref(1, status)}
                className="mt-3 inline-block text-sm text-brand"
              >
                Back to the first page
              </Link>
            )}
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
                      Subject
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Category
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Priority
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Messages
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Last activity
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-border">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/users/${ticket.user.id}`}
                          className="text-foreground hover:text-brand"
                        >
                          {ticket.user.fullName}
                        </Link>
                        <div className="text-xs text-faint">
                          {ticket.user.email}
                        </div>
                      </td>
                      <td className="max-w-xs px-5 py-3 text-muted">
                        {ticket.subject}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {categoryLabel(ticket.category)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={priorityVariant[ticket.priority] ?? "outline"}
                        >
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[ticket.status]}>
                          {SUPPORT_STATUS_LABELS[ticket.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-faint">
                        {ticket._count.messages}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {formatDateTime(ticket.lastMessageAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/support/${ticket.id}`}
                          className="text-sm text-brand hover:underline"
                        >
                          Open
                        </Link>
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
        <nav
          aria-label="Support pages"
          className="flex items-center justify-between"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1, status)}
              className="text-sm text-brand"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-sm text-faint">← Previous</span>
          )}
          <span className="text-sm text-faint">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={pageHref(page + 1, status)}
              className="text-sm text-brand"
            >
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
