"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";
import { FormError, FormNotice } from "@/components/auth/form-field";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
} from "@/lib/support";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/lib/generated/prisma/enums";

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25";

/**
 * Status and priority for one ticket.
 *
 * The selects are seeded from the server-rendered values and the button stays
 * disabled until something actually differs, so the common case cannot write a
 * no-op audit row. The server enforces the same thing independently — a stale
 * tab that posts unchanged values gets an `unchanged` response, not a record.
 */
export function TicketControls({
  ticketId,
  status,
  priority,
}: {
  ticketId: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>(status);
  const [nextPriority, setNextPriority] =
    useState<SupportTicketPriority>(priority);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = nextStatus !== status || nextPriority !== priority;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    const result = await patchJson(`/api/admin/support/${ticketId}`, {
      status: nextStatus,
      priority: nextPriority,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice("Ticket updated.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-sm font-medium text-foreground">Status</span>
        <select
          value={nextStatus}
          onChange={(e) => {
            setNextStatus(e.target.value as SupportTicketStatus);
            setNotice(null);
          }}
          className={`mt-1.5 ${SELECT_CLASS}`}
        >
          {SUPPORT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {SUPPORT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-foreground">Priority</span>
        <select
          value={nextPriority}
          onChange={(e) => {
            setNextPriority(e.target.value as SupportTicketPriority);
            setNotice(null);
          }}
          className={`mt-1.5 ${SELECT_CLASS}`}
        >
          {Object.values(SUPPORT_PRIORITIES).map((value) => (
            <option key={value} value={value}>
              {SUPPORT_PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <FormError message={error} />
      <FormNotice message={notice} />

      <button
        type="submit"
        disabled={saving || !dirty}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
