"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import { FormError, FormNotice } from "@/components/auth/form-field";

const TEXTAREA_CLASS =
  "mt-1.5 w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25";

/**
 * Reply to a member's ticket as staff.
 *
 * The reply goes to the admin route, which writes it as `authorRole: STAFF` and
 * moves the ticket to PENDING in the same transaction — so the inbox cannot show
 * a ticket as unanswered after it has been answered.
 */
export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);

    const result = await postJson(`/api/admin/support/${ticketId}/messages`, {
      body,
    });

    setSending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setBody("");
    setNotice("Reply sent. The ticket is now awaiting the member.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-sm font-medium text-foreground">
          Reply to the member
        </span>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
            setNotice(null);
          }}
          rows={6}
          placeholder="Answer the question, or say what happens next."
          className={TEXTAREA_CLASS}
        />
      </label>

      <FormError message={error} />
      <FormNotice message={notice} />

      <button
        type="submit"
        disabled={sending || body.trim().length === 0}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
