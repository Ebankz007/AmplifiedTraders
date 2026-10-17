"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import { TextField, FormError, FormNotice } from "@/components/auth/form-field";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/lib/admin-team";
import type { AdminRole } from "@/lib/generated/prisma/enums";

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-50";

/** Provision a new admin. The server enforces the password policy too. */
export function AdminCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("CONTENT_ADMIN");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function clear() {
    setError(null);
    setNotice(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    clear();

    const result = await postJson<{ ok: boolean }>("/api/admin/team", {
      name,
      email,
      role,
      password,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice(`Created ${email}. Share the password with them over a secure channel.`);
    setName("");
    setEmail("");
    setRole("CONTENT_ADMIN");
    setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clear();
          }}
          autoComplete="off"
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear();
          }}
          autoComplete="off"
          required
        />
        <label htmlFor="new-admin-role" className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Role</span>
          <select
            id="new-admin-role"
            name="role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as AdminRole);
              clear();
            }}
            className={SELECT_CLASS}
          >
            {ADMIN_ROLES.map((value) => (
              <option key={value} value={value}>
                {ADMIN_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Initial password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear();
          }}
          autoComplete="new-password"
          required
          hint="Min 8 characters, with an uppercase, a lowercase and a number."
        />
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
