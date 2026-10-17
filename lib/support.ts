import {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/lib/generated/prisma/enums";
import type {
  SupportTicketPriority as Priority,
  SupportTicketStatus as Status,
} from "@/lib/generated/prisma/enums";

/**
 * The support vocabulary, in one place.
 *
 * The member ticket form, the admin inbox, the API and the guard test all read
 * from here. The categories used to live as a hand-written `<option>` list in
 * `components/dashboard/forms.tsx`; a second copy of a list is a copy that
 * drifts (lessons 190/199), so the form now renders these.
 */

export const SUPPORT_CATEGORIES = [
  "GENERAL",
  "ACCOUNT",
  "PAYMENTS",
  "COPY_TRADING",
  "NETWORK",
  "TECHNICAL",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  GENERAL: "General",
  ACCOUNT: "Account",
  PAYMENTS: "Payments",
  COPY_TRADING: "Copy trading",
  NETWORK: "Referral network",
  TECHNICAL: "Technical issue",
};

/**
 * `category` is a free string in the schema, so a value written by an older
 * build (or by hand) must still render as *something* rather than blank.
 */
export function categoryLabel(category: string): string {
  const known = SUPPORT_CATEGORY_LABELS[category as SupportCategory];
  if (known) return known;
  return category.replace(/_/g, " ").toLowerCase();
}

/** Statuses, derived from the generated enum so the picker cannot drift. */
export const SUPPORT_STATUSES = Object.values(SupportTicketStatus) as [
  Status,
  ...Status[],
];

export const SUPPORT_STATUS_LABELS: Record<Status, string> = {
  OPEN: "Open",
  PENDING: "Awaiting member",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const SUPPORT_PRIORITIES = Object.values(SupportTicketPriority) as [
  Priority,
  ...Priority[],
];

export const SUPPORT_PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

/**
 * A ticket is "open" while it still expects something from someone. Used for
 * the inbox counters, so "open" means the same thing on the dashboard as it
 * does in the member portal.
 */
export function isOpenTicket(status: Status): boolean {
  return status === "OPEN" || status === "PENDING";
}

/**
 * A staff reply hands the thread back to the member, so the ticket becomes
 * PENDING ("awaiting member") rather than staying OPEN. Without this the inbox
 * would keep showing a ticket as unanswered after it had been answered.
 */
export const STATUS_AFTER_STAFF_REPLY: Status = "PENDING";

/**
 * Staff may reply unless the ticket is CLOSED — the same rule the member side
 * enforces (`app/api/support/[id]/messages/route.ts`). RESOLVED is deliberately
 * *replyable*: a member who comes back with "actually it is still broken" must
 * not force a new ticket, and the reply moves the thread back to PENDING.
 */
export function canStaffReply(status: Status): boolean {
  return status !== "CLOSED";
}
