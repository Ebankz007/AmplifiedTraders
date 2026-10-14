import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";

export function FinalCta() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="card border-gold-gradient glow-gold relative overflow-hidden px-6 py-16 text-center sm:px-12">
            <div className="net-field pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
                <span className="node-dot node-dot-gold h-1.5 w-1.5" />
                Join the ecosystem
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Amplify your trading.
                <br />
                <span className="text-gradient-gold">Amplify your growth.</span>
              </h2>
              <p className="mt-4 text-muted">
                Connect with traders, discover opportunities, and grow inside a
                modern community built for participation.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/register" size="lg" variant="gold">
                  Join Amplified Traders
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/contact" size="lg" variant="secondary">
                  Talk to us
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
