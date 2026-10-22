"use client";

import * as React from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  TextField,
  FormError,
  FormNotice,
} from "@/components/auth/form-field";
import { postJson } from "@/lib/http";

type ResetResponse = {
  message?: string;
  emailDelivery?: string;
};

/**
 * The server owns the wording of every message this form shows.
 *
 * A client that hardcodes "we sent you a link" is a client that can promise
 * a mail the deployment never sent - and this one is rendered on a platform
 * whose mail transport does not exist yet. So: the capability arrives as a
 * prop, and the wording arrives in the response.
 */
export function ForgotPasswordForm({
  emailDelivery = "available",
}: {
  emailDelivery?: "available" | "unavailable";
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const res = await postJson<ResetResponse>("/api/auth/forgot-password", {
      email: String(form.get("email") ?? ""),
    });
    setPending(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice(
      res.data.message ??
        "If that address is registered, a reset link is on its way.",
    );
  }

  if (emailDelivery === "unavailable") {
    return (
      <div className="card border-brand-gradient p-7">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Password reset by email is not available on this deployment. No
          message has been sent, and none can be.
        </p>
        <p className="mt-3 text-sm text-muted">
          Send us a message and an operator will help you get back in.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink href="/contact" size="lg" className="w-full">
            Contact us
          </ButtonLink>
          <Link
            href="/login"
            className="text-center text-sm font-medium text-brand hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-brand-gradient p-7">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Reset your password
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <FormNotice message={notice} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
