"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";
import { FormError, FormNotice } from "@/components/auth/form-field";
import type { PayoutStatus } from "@/lib/generated/prisma/enums";

const BTN =
  "rounded-lg px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BTN} bg-brand text-background`;
const OUTLINE = `${BTN} border border-border text-foreground`;

/**
 * Operator controls for one withdrawal.
 *
 * The buttons offered depend on the payout's status, mirroring the state
 * machine in `lib/payout.ts` — the server refuses a transition the machine does
 * not allow, so a stale tab cannot force one. A rejection asks for a reason
 * first, because the member sees it on the returned funds.
 */
export function PayoutActions({
  payoutId,
  status,
}: {
  payoutId: string;
  status: PayoutStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "approve" | "reject" | "mark_paid", why?: string) {
    setBusy(action);
    setError(null);
    setNotice(null);

    const result = await patchJson(`/api/admin/payouts/${payoutId}`, {
      action,
      reason: why ?? "",
    });

    setBusy(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice("Saved.");
    setRejecting(false);
    setReason("");
    router.refresh();
  }

  if (status === "REJECTED" || status === "PAID") {
    return (
      <span className="text-xs text-faint">No further action</span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "REQUESTED" && (
          <button
            type="button"
            className={PRIMARY}
            disabled={busy !== null}
            onClick={() => act("approve")}
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        )}
        {status === "APPROVED" && (
          <button
            type="button"
            className={PRIMARY}
            disabled={busy !== null}
            onClick={() => act("mark_paid")}
          >
            {busy === "mark_paid" ? "Saving…" : "Mark paid"}
          </button>
        )}
        <button
          type="button"
          className={OUTLINE}
          disabled={busy !== null}
          onClick={() => setRejecting((v) => !v)}
        >
          Reject
        </button>
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-xl border border-border bg-elevated p-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why is this being rejected? The member will see this."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={`${BTN} bg-danger text-background`}
              disabled={busy !== null || reason.trim().length < 3}
              onClick={() => act("reject", reason)}
            >
              {busy === "reject" ? "Rejecting…" : "Confirm rejection"}
            </button>
            <button
              type="button"
              className={OUTLINE}
              disabled={busy !== null}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <FormError message={error} />
      <FormNotice message={notice} />
    </div>
  );
}

/**
 * Operator controls for one deposit. Confirming credits the wallet the net
 * amount; rejecting moves no money. Only a PENDING payment can be acted on.
 */
export function DepositActions({
  paymentId,
  status,
}: {
  paymentId: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "confirm" | "reject", why?: string) {
    setBusy(action);
    setError(null);
    setNotice(null);

    const result = await patchJson(`/api/admin/deposits/${paymentId}`, {
      action,
      reason: why ?? "",
    });

    setBusy(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice("Saved.");
    setRejecting(false);
    setReason("");
    router.refresh();
  }

  if (status !== "PENDING") {
    return <span className="text-xs text-faint">No further action</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={PRIMARY}
          disabled={busy !== null}
          onClick={() => act("confirm")}
        >
          {busy === "confirm" ? "Confirming…" : "Confirm & credit"}
        </button>
        <button
          type="button"
          className={OUTLINE}
          disabled={busy !== null}
          onClick={() => setRejecting((v) => !v)}
        >
          Reject
        </button>
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-xl border border-border bg-elevated p-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why is this being rejected?"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={`${BTN} bg-danger text-background`}
              disabled={busy !== null || reason.trim().length < 3}
              onClick={() => act("reject", reason)}
            >
              {busy === "reject" ? "Rejecting…" : "Confirm rejection"}
            </button>
            <button
              type="button"
              className={OUTLINE}
              disabled={busy !== null}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <FormError message={error} />
      <FormNotice message={notice} />
    </div>
  );
}
