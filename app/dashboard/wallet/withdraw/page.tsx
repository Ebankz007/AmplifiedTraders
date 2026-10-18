import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getBalance } from "@/lib/wallet";
import { Card, CardContent } from "@/components/ui/card";
import { WithdrawForm } from "@/components/dashboard/wallet-forms";

export const metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await requireUser();
  const balance = await getBalance(user.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/dashboard/wallet" className="text-sm text-brand">
          ← Wallet
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
          Withdraw funds
        </h1>
        <p className="mt-1 text-sm text-muted">
          The amount is held the moment you request it, and returned in full if
          the request is rejected.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <WithdrawForm balanceCents={balance.balanceCents} />
        </CardContent>
      </Card>
    </div>
  );
}
