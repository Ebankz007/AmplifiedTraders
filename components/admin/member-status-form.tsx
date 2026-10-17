"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";
import { FormError, FormNotice } from "@/components/auth/form-field";
import type { UserStatus } from "@/lib/generated/prisma/enums";

/**
 * Suspend / reinstate a member account. The button reflects the account's
 * current state; the server re-derives the transition, so a stale tab that
 * fires the wrong action gets a 409 rather than an unintended change.
 */
export function MemberStatusForm({
  userId,
  status,
}: {
  userId: string;
  status: UserStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suspended = status === "SUSPENDED";

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const result = await patchJson<{ ok: boolean; status: UserStatus }>(
      `/api/admin/users/${userId}`,
      { action: suspended ? "REINSTATE" : "SUSPEND" },
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice(suspended ? "Account reinstated." : "Account suspended.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {suspended
          ? "Reinstating returns the account to good standing. If the member never verified their email, it returns to Pending rather than Active."
          : "Suspending blocks sign-in immediately and ends the member's active sessions."}
      </p>

      <FormError message={error} />
      <FormNotice message={notice} />

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className={
          suspended
            ? "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            : "rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {busy
          ? suspended
            ? "Reinstating…"
            : "Suspending…"
          : suspended
            ? "Reinstate account"
            : "Suspend account"}
      </button>
    </div>
  );
}
