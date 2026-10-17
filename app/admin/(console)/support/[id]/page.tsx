import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketReplyForm } from "@/components/admin/ticket-reply-form";
import { TicketControls } from "@/components/admin/ticket-controls";
import {
  SUPPORT_STATUS_LABELS,
  canStaffReply,
  categoryLabel,
} from "@/lib/support";
import type { SupportTicketStatus } from "@/lib/generated/prisma/enums";

export const metadata = { title: "Ticket" };

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

/**
 * One ticket, from the staff side.
 *
 * Unlike the member view this is not scoped to an owner — any admin holding the
 * `messages` permission may open any ticket, because a support queue is shared
 * work. The reply rule comes from `lib/support.ts`, so this page and the API
 * cannot disagree about whether a CLOSED ticket accepts replies.
 */
export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("messages");
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  const replyable = canStaffReply(ticket.status);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/support" className="text-sm text-brand">
          ← Back to support
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {ticket.subject}
          </h1>
          <Badge variant={statusVariant[ticket.status]}>
            {SUPPORT_STATUS_LABELS[ticket.status]}
          </Badge>
          <Badge variant={priorityVariant[ticket.priority] ?? "outline"}>
            {ticket.priority}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-faint">
          <Link
            href={`/admin/users/${ticket.user.id}`}
            className="text-brand hover:underline"
          >
            {ticket.user.fullName}
          </Link>{" "}
          · {ticket.user.email} · {categoryLabel(ticket.category)} · opened{" "}
          {formatDateTime(ticket.createdAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <ul className="space-y-4">
            {ticket.messages.map((message) => {
              const isStaff = message.authorRole === "STAFF";
              return (
                <li key={message.id}>
                  <Card className={isStaff ? "border-brand/40" : ""}>
                    <CardContent className="p-5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {isStaff ? "Support team" : ticket.user.fullName}
                          </span>
                          <Badge variant={isStaff ? "brand" : "outline"}>
                            {isStaff ? "Staff" : "Member"}
                          </Badge>
                        </div>
                        <time className="text-xs text-faint">
                          {formatDateTime(message.createdAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted">
                        {message.body}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Card>
            <CardHeader>
              <CardTitle>Reply</CardTitle>
            </CardHeader>
            <CardContent>
              {replyable ? (
                <TicketReplyForm ticketId={ticket.id} />
              ) : (
                <p className="text-sm text-faint">
                  This ticket is closed and is no longer accepting replies. Reopen
                  it from the panel on the right to reply.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketControls
                ticketId={ticket.id}
                status={ticket.status}
                priority={ticket.priority}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-faint">Messages</span>
                <span className="text-muted">{ticket.messages.length}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-faint">Opened</span>
                <span className="text-muted">
                  {formatDateTime(ticket.createdAt)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-faint">Last activity</span>
                <span className="text-muted">
                  {formatDateTime(ticket.lastMessageAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
