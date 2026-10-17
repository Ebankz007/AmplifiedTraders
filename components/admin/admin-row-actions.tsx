"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/lib/admin-team";
import type { AdminRole } from "@/lib/generated/prisma/enums";

const SELECT_CLASS =
  "h-9 rounded-lg border border-border bg-elevated px-2.5 text-sm text-foreground transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-50";

/**
 * Per-row team controls. The server refuses a change that would lock the
 * console out (self-demotion, last super admin); those refusals surface here as
 * a 409 message rather than being pre-empted, so the rule lives in one place.
 */
export function AdminRowActions({
  adminId,
  role,
  isActive,
  isSelf,
}: {
  adminId: string;
  role: AdminRole;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(patch: { role?: AdminRole; isActive?: boolean }) {
    setBusy(true);
    setError(null);

    const result = await patchJson<{ ok: boolean }>(
      `/api/admin/team/${adminId}`,
      patch,
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <select
          aria-label="Role"
          value={role}
          disabled={busy || isSelf}
          onChange={(e) => update({ role: e.target.value as AdminRole })}
          className={SELECT_CLASS}
        >
          {ADMIN_ROLES.map((value) => (
            <option key={value} value={value}>
              {ADMIN_ROLE_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || isSelf}
          onClick={() => update({ isActive: !isActive })}
          className={
            isActive
              ? "rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              : "rounded-lg border border-brand/40 px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {busy ? "…" : isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
      {isSelf && (
        <p className="text-xs text-faint">This is you — locked to prevent lockout.</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
