import { Repeat2, Layers, Network, MessagesSquare } from "lucide-react";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

const PILLARS = [
  {
    icon: Repeat2,
    brand: "Amplify Trade",
    name: "Copy Trading",
    promise: "Follow. Learn. Participate.",
    body: "Connect with selected trading strategies and experienced traders through copy-trading technology — participate alongside the market, on your own terms.",
    span: "lg:col-span-7",
    tone: "brand" as const,
  },
  {
    icon: Layers,
    brand: "Amplify Invest",
    name: "Investment Packages",
    promise: "Structured opportunities. Clear expectations.",
    body: "Explore structured participation options designed around different levels and objectives, with clear terms and full transparency.",
    span: "lg:col-span-5",
    tone: "gold" as const,
  },
  {
    icon: Network,
    brand: "Amplify Network",
    name: "Referral Network",
    promise: "Grow your network. Grow your influence.",
    body: "Build a network, introduce others to the platform, and participate in a transparent referral structure that rewards genuine community growth.",
    span: "lg:col-span-5",
    tone: "brand" as const,
  },
  {
    icon: MessagesSquare,
    brand: "Amplify Community",
    name: "Trader Community",
    promise: "Trade together. Learn together.",
    body: "Join a global community sharing ideas, market perspectives, education, and experience — because traders grow faster together.",
    span: "lg:col-span-7",
    tone: "gold" as const,
  },
];

export function Pillars() {
  return (
    <section className="relative py-20 sm:py-28" id="pillars">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-brand">
            The Four Pillars
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            One platform.
            <br />
            Multiple ways to participate.
          </h2>
          <p className="mt-4 text-muted">
            Amplified Traders brings copy trading, investment packages, referral
            networking, and a trader community together into one connected
            ecosystem — four ways in, one place to grow.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          {PILLARS.map((p, i) => (
            <Reveal key={p.brand} delay={i * 70} className={cn(p.span)}>
              <article className="card card-hover group relative h-full overflow-hidden p-7">
                <div
                  className={cn(
                    "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl",
                    p.tone === "brand" ? "bg-brand/10" : "bg-gold/10",
                  )}
                  aria-hidden="true"
                />
                <div className="relative flex items-start justify-between">
                  <span
                    className={cn(
                      "inline-flex h-12 w-12 items-center justify-center rounded-xl",
                      p.tone === "brand" ? "bg-brand/12 text-brand" : "bg-gold/12 text-gold",
                    )}
                  >
                    <p.icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-xs text-faint">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="relative mt-5 font-display text-lg font-bold tracking-tight">
                  {p.brand}
                </h3>
                <p
                  className={cn(
                    "relative mt-1 text-sm font-medium",
                    p.tone === "brand" ? "text-brand" : "text-gold",
                  )}
                >
                  {p.name} · {p.promise}
                </p>
                <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  {p.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
