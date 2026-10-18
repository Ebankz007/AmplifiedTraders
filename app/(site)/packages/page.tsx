import { getPackages, getStats, getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { StatsBand } from "@/components/site/stats-band";
import { PackageCard } from "@/components/site/package-card";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Packages",
  description: "Structured participation tiers with clear terms.",
};

export default async function PackagesPage() {
  const [packages, stats, page] = await Promise.all([
    getPackages(),
    getStats(),
    getPage("packages"),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Amplify Invest"
        title="Investment Packages"
        lead="Structured participation options designed around different objectives, with clear terms and full transparency."
      />
      <StatsBand stats={stats} />
      <Section>
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight">Overview</h2>
          {page ? (
            <Prose markdown={page.content} className="mt-4" />
          ) : (
            <p className="mt-4 text-muted">
              Packages describe participation structure only. Amplified Traders does not hold client funds and does not guarantee returns.
            </p>
          )}
        </div>
      </Section>
      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
        {packages.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">No packages are published yet.</p>
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
