import { ArrowRight, Repeat2, Layers, Network, MessagesSquare } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";

const PILLARS = [
  { icon: Repeat2, label: "Copy Trading", tone: "brand" as const },
  { icon: Layers, label: "Investment Packages", tone: "gold" as const },
  { icon: Network, label: "Referral Network", tone: "brand" as const },
  { icon: MessagesSquare, label: "Trader Community", tone: "gold" as const },
];

export function Hero() {
  return (
    <section className="glow-brand relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28">
      <div className="net-field pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand">
            <span className="node-dot h-1.5 w-1.5" />
            Global Trading &amp; Investment Ecosystem
          </span>
        </Reveal>

        <Reveal delay={60}>
          <h1 className="mt-7 font-display text-4xl font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-gradient-brand">Amplify Your</span>
            <br />
            Trading Journey
          </h1>
        </Reveal>

        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Copy trading. Structured investment packages. Referral rewards. A global
            trader community — one modern ecosystem built to connect traders and
            investors with technology, market opportunities, and each other.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/register" size="lg">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/about" size="lg" variant="secondary">
              Explore the Platform
            </ButtonLink>
          </div>
        </Reveal>
      </div>

      {/* Network ribbon — the four pillars as connected nodes */}
      <Reveal delay={240} className="relative mx-auto mt-16 max-w-5xl px-4 sm:px-6">
        <div className="relative">
          <div
            className="pointer-events-none absolute left-[12%] right-[12%] top-9 hidden h-px bg-gradient-to-r from-brand/0 via-brand/50 to-brand/0 lg:block"
            aria-hidden="true"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.label} className="card card-hover relative p-5 text-center">
                <span
                  className={
                    p.tone === "brand"
                      ? "mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/12 text-brand"
                      : "mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/12 text-gold"
                  }
                >
                  <p.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-sm font-semibold tracking-tight">
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
