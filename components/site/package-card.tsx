import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export type PackageCardData = {
  id: string;
  slug: string;
  name: string;
  tier: number;
  summary: string;
  minCents: number;
  maxCents: number | null;
  currency: string;
  termMonths: number | null;
  riskLevel: string;
  isFeatured: boolean;
  features: unknown;
};

function formatRange(minCents: number, maxCents: number | null, currency: string) {
  const min = formatPrice(minCents / 100, currency);
  if (!maxCents) return `${min}+`;
  return `${min} — ${formatPrice(maxCents / 100, currency)}`;
}

/**
 * `features` is a Json column, so its shape is only as trustworthy as whatever
 * last wrote it. Keep the strings and drop everything else, rather than letting
 * a stray object reach React and take the page down with it.
 */
function featureList(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.filter((item): item is string => typeof item === "string");
}

export function PackageCard({ pkg }: { pkg: PackageCardData }) {
  const features = featureList(pkg.features);

  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">
            Tier {pkg.tier}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {pkg.name}
          </h3>
        </div>
        {pkg.isFeatured ? <Badge variant="gold">Featured</Badge> : null}
      </div>

      <p className="mt-3 text-sm text-muted">{pkg.summary}</p>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-faint">Entry range</dt>
          <dd className="text-right font-medium">
            {formatRange(pkg.minCents, pkg.maxCents, pkg.currency)}
          </dd>
        </div>
        {pkg.termMonths ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-faint">Term</dt>
            <dd className="text-right font-medium">{pkg.termMonths} months</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-faint">Risk level</dt>
          <dd className="text-right font-medium capitalize">
            {pkg.riskLevel.toLowerCase()}
          </dd>
        </div>
      </dl>

      {features.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-white/5 pt-5 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span className="text-muted">{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-6">
        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-bright"
        >
          Enquire about this tier
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
