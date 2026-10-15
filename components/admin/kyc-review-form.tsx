"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";
import { FormError, FormNotice } from "@/components/auth/form-field";
import type { KycStatus } from "@/lib/generated/prisma/enums";

/**
 * Approve / reject a KYC submission. The reason field is only consulted on a
 * rejection — the server enforces that too, so the client rule is a courtesy,
 * not the guard.
 */
export function KycReviewForm({
  profileId,
  status,
}: {
  profileId: string;
  status: KycStatus;
}) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<null | "VERIFIED" | "REJECTED">(null);

  async function decide(decision: "VERIFIED" | "REJECTED") {
    setBusy(decision);
    setError(null);
    setNotice(null);

    const result = await patchJson<{ ok: boolean; status: KycStatus }>(
      `/api/admin/kyc/${profileId}`,
      { decision, reason },
    );

    setBusy(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice(
      decision === "VERIFIED" ? "Member verified." : "Submission rejected.",
    );
    setReason("");
    router.refresh();
  }

  const verified = status === "VERIFIED";

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="kyc-reason"
          className="text-sm font-medium text-foreground"
        >
          Rejection reason
        </label>
        <textarea
          id="kyc-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
            setNotice(null);
          }}
          rows={3}
          placeholder="Required only when rejecting — the member will see it."
          className="mt-1.5 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus-visible:outline-none"
        />
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("VERIFIED")}
          disabled={busy !== null || status === "VERIFIED"}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "VERIFIED" ? "Verifying…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => decide("REJECTED")}
          disabled={busy !== null}
          className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "REJECTED" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
