"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http";
import { formatCents, formatCentsCompact, parseAmountToCents } from "@/lib/money";
import {
  canDeposit,
  canWithdraw,
  DEPOSIT_MIN_CENTS,
  depositGrossCents,
  PAYOUT_METHODS,
  PAYOUT_METHOD_LABELS,
  WITHDRAWAL_MIN_CENTS,
} from "@/lib/payout";
import { PLATFORM_FEE_CENTS } from "@/lib/engine/constants";
import { FormError } from "@/components/auth/form-field";

const selectClass =
  "h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25";

/** Parse what the user typed, returning null instead of throwing. */
function tryParse(input: string): number | null {
  try {
    return parseAmountToCents(input);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ withdrawal --- */

export function WithdrawForm({ balanceCents }: { balanceCents: number }) {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [destination, setDestination] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // A live preview of the client-side verdict — the server re-checks anyway.
  const preview = React.useMemo(() => {
    if (!amount.trim()) return null;
    let cents: number;
    try {
      cents = parseAmountToCents(amount);
    } catch {
      return { ok: false as const, reason: "Enter a valid amount (up to 2 decimals)." };
    }
    return canWithdraw(balanceCents, cents);
  }, [amount, balanceCents]);

  const needsDestination = method === "BANK_TRANSFER" || method === "CRYPTO";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await postJson<{ ok: boolean; id: string }>(
      "/api/wallet/withdrawals",
      { amount, method, destination, details },
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/dashboard/wallet");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm">
        <span className="text-faint">Available to withdraw</span>
        <div className="font-display text-lg font-bold text-foreground">
          {formatCents(balanceCents)}
        </div>
      </div>

      <label htmlFor="amount" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Amount</span>
        <input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <span className="text-xs text-faint">
          Minimum {formatCentsCompact(WITHDRAWAL_MIN_CENTS)}. The amount is held as
          soon as you request it.
        </span>
      </label>

      <label htmlFor="method" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Method</span>
        <select
          id="method"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          {PAYOUT_METHODS.map((value) => (
            <option key={value} value={value}>
              {PAYOUT_METHOD_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      {needsDestination && (
        <label htmlFor="destination" className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">
            {method === "CRYPTO" ? "Wallet address" : "Account details"}
          </span>
          <input
            id="destination"
            name="destination"
            type="text"
            autoComplete="off"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={
              method === "CRYPTO"
                ? "e.g. TRC20 address"
                : "Bank name, account name and number"
            }
            className="h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
        </label>
      )}

      <label htmlFor="details" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          Anything else? <span className="text-faint">(optional)</span>
        </span>
        <textarea
          id="details"
          name="details"
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Notes for the team handling your withdrawal."
          className="w-full rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
      </label>

      {preview && !preview.ok && (
        <p className="text-sm text-faint">{preview.reason}</p>
      )}

      <FormError message={error} />

      <button
        type="submit"
        disabled={busy || (preview !== null && !preview.ok)}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Requesting…" : "Request withdrawal"}
      </button>
    </form>
  );
}

export function DepositForm() {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("CRYPTO");
  const [reference, setReference] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const preview = React.useMemo(() => {
    if (!amount.trim()) return null;
    let cents: number;
    try {
      cents = parseAmountToCents(amount);
    } catch {
      return { ok: false as const, reason: "Enter a valid amount (up to 2 decimals)." };
    }
    const verdict = canDeposit(cents);
    if (!verdict.ok) return verdict;
    return { ok: true as const, gross: depositGrossCents(cents), net: cents };
  }, [amount]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await postJson<{
      ok: boolean;
      id: string;
      grossCents: number;
      feeCents: number;
    }>("/api/wallet/deposits", { amount, method, reference });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/dashboard/wallet");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <label htmlFor="deposit-amount" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          Amount to add
        </span>
        <input
          id="deposit-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <span className="text-xs text-faint">
          Minimum {formatCentsCompact(DEPOSIT_MIN_CENTS)}. A{" "}
          {formatCentsCompact(PLATFORM_FEE_CENTS)} platform fee is added on top.
        </span>
      </label>

      {preview && preview.ok && (
        <div className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-faint">You send</span>
            <span className="font-mono text-foreground">
              {formatCents(depositGrossCents(parseAmountToCents(amount)))}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-faint">Credited to your wallet</span>
            <span className="font-mono text-gold">
              {formatCents(parseAmountToCents(amount))}
            </span>
          </div>
        </div>
      )}

      <label htmlFor="deposit-method" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Method</span>
        <select
          id="deposit-method"
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          {PAYOUT_METHODS.map((value) => (
            <option key={value} value={value}>
              {PAYOUT_METHOD_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="reference" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">
          Reference <span className="text-faint">(optional)</span>
        </span>
        <input
          id="reference"
          name="reference"
          type="text"
          autoComplete="off"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Transaction hash or bank reference, if you have one"
          className="h-11 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
      </label>

      <p className="text-xs text-faint">
        Filing a request does not move money. Our team confirms the funds arrived
        and credits your wallet — you will see it appear in your ledger.
      </p>

      <FormError message={error} />

      <button
        type="submit"
        disabled={busy || amount.trim().length === 0}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Filing…" : "File deposit request"}
      </button>
    </form>
  );
}
