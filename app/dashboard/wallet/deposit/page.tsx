import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { DepositForm } from "@/components/dashboard/wallet-forms";

export const metadata = { title: "Add funds" };

export default async function DepositPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/dashboard/wallet" className="text-sm text-brand">
          ← Wallet
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
          Add funds
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tell us how much you want to add. We confirm the funds arrived, then
          credit your wallet.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <DepositForm />
        </CardContent>
      </Card>
    </div>
  );
}
