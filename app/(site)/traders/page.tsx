import { getTraders, getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { TraderCard } from "@/components/site/trader-card";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Traders",
  description: "Meet the traders on the Amplified Traders platform.",
};

export default async function TradersPage() {
  const [traders, page] = await Promise.all([getTraders(), getPage("traders")]);

  return (
    <>
      <PageHero
        eyebrow="Amplify Trade"
        title="Traders"
        lead="Review trader profiles, risk levels and focus areas before connecting."
      />
      <Section>
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight">Overview</h2>
          {page ? (
            <Prose markdown={page.content} className="mt-4" />
          ) : (
            <p className="mt-4 text-muted">
              Connecting to a trader means following their strategy on your own broker account. Past performance is not indicative of future results.
            </p>
          )}
        </div>
      </Section>
      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {traders.map((t) => (
            <TraderCard key={t.id} trader={t} />
          ))}
        </div>
        {traders.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">No trader profiles are published yet.</p>
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
