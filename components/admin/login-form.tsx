"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextField, FormError } from "@/components/auth/form-field";
import { postJson } from "@/lib/http";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const res = await postJson("/api/admin/auth/login", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    toast.success("Signed in.");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="card border-brand-gradient p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Administrator
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
        Admin console
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Sign in to manage the Amplified Traders platform.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@amplifiedtraders.com"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
