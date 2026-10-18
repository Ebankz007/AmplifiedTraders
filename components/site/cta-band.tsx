import * as React from "react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";

/**
 * The closing band on every marketing page.
 *
 * Defaults to the register/contact pair; a page that needs a different door
 * passes one. Keeping it a component (rather than copy-pasted markup) is what
 * stops six pages drifting into six different CTAs.
 */
export function CtaBand({
  eyebrow = "Join the ecosystem",
  title = "Ready to amplify your trading?",
  body,
  primary = { href: "/register", label: "Join Amplified Traders" },
  secondary = { href: "/contact", label: "Talk to us" },
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  body?: React.ReactNode;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string } | null;
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="card border-gold-gradient glow-gold relative overflow-hidden px-6 py-14 text-center sm:px-12">
            <div
              className="net-field pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
            />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
                <span className="node-dot node-dot-gold h-1.5 w-1.5" />
                {eyebrow}
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
              {body ? <p className="mt-4 text-muted">{body}</p> : null}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href={primary.href} size="lg" variant="gold">
                  {primary.label}
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                {secondary ? (
                  <ButtonLink href={secondary.href} size="lg" variant="secondary">
                    {secondary.label}
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
