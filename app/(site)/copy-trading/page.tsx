import { getTraders, getPackages, getBrokers, getCourses, getStats, getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { StatsBand } from "@/components/site/stats-band";
import { TraderCard } from "@/components/site/trader-card";
import { PackageCard } from "@/components/site/package-card";
import { BrokerCard } from "@/components/site/broker-card";
import { CourseCard } from "@/components/site/course-card";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copy Trading",
  description: "Connect with selected trading strategies and participate on your own terms.",
};

export default async function CopyTradingPage() {
  const [traders, packages, brokers, courses, stats, page] = await Promise.all([
    getTraders(),
    getPackages(),
    getBrokers(),
    getCourses(),
    getStats(),
    getPage("copy-trading"),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Amplify Trade"
        title="Copy Trading"
        lead="Follow. Learn. Participate. Connect with selected strategies through technology built for transparency."
      />
      <StatsBand stats={stats} />
      <Section>
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-tight">How it works</h2>
          {page ? (
            <Prose markdown={page.content} className="mt-4" />
          ) : (
            <p className="mt-4 text-muted">
              Copy trading connects participants to selected strategies. Execution remains on your own broker account. Amplified Traders does not hold client funds.
            </p>
          )}
        </div>
      </Section>
      {traders.length > 0 && (
        <Section>
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">Featured Traders</h2>
            <p className="mt-2 text-muted">Selected profiles for review. Risk profiles vary by trader.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {traders.map((t) => (
              <TraderCard key={t.id} trader={t} />
            ))}
          </div>
        </Section>
      )}
      {brokers.length > 0 && (
        <Section>
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">Broker Connections</h2>
            <p className="mt-2 text-muted">
              Amplified Traders is non-custodial. You connect an account you already hold with one of
              these venues — your capital stays with them, never with us. Naming a venue here is not a
              partnership claim; confirm availability during onboarding.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {brokers.map((b) => (
              <BrokerCard key={b.id} broker={b} />
            ))}
          </div>
        </Section>
      )}
      {packages.length > 0 && (
        <Section>
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">Participation Tiers</h2>
            <p className="mt-2 text-muted">Structured options. No performance guarantees.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        </Section>
      )}
      {courses.length > 0 && (
        <Section>
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">Education</h2>
            <p className="mt-2 text-muted">Build knowledge before committing capital.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </Section>
      )}
      <CtaBand
        eyebrow="Get started"
        title="Ready to explore copy trading?"
        body="Review traders, understand the risks, and speak to the team before participating."
      />
    </>
  );
}
