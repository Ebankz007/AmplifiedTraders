import * as React from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/reveal";

/**
 * The one place a section eyebrow/heading/lead is styled.
 *
 * Every marketing page composes from this, so the type scale cannot drift page
 * by page — the same reasoning as `lib/site-settings.ts` for copy.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  tone = "brand",
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  tone?: "brand" | "gold";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "font-display text-sm font-semibold uppercase tracking-wider",
            tone === "gold" ? "text-gold" : "text-brand",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 leading-relaxed text-muted">{lead}</p> : null}
      {children}
    </Reveal>
  );
}

/**
 * The top of every interior page. `pt-32` clears the fixed header — the header
 * is fixed rather than sticky so the hero can sit underneath it.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="glow-brand relative overflow-hidden pt-32 pb-14 sm:pt-40 sm:pb-20">
      <div
        className="net-field pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-3xl">
          {eyebrow ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-medium text-brand">
              <span className="node-dot h-1.5 w-1.5" />
              {eyebrow}
            </span>
          ) : null}
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {title}
          </h1>
          {lead ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              {lead}
            </p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </Reveal>
      </div>
    </section>
  );
}

/** A plain content section wrapper with the house gutter. */
export function Section({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
