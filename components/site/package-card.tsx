import Link from "next/link";
import { ArrowUpRight, Building2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export type PackageCardData = {
  id: string;
  slug: string;
  name: string;
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

export function PackageCard({ pkg }: { pkg: PackageCardData }) {
  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">{pkg.name}</p>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {pkg.slug}
          </h3>
        </div>
        {pkg.isFeatured ? (
          <Badge variant="gold">Featured</Badge>
        ) : (
          <Badge variant="outline">Tier</Badge>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{pkg.summary}</p>

      <div className="mt-5 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-faint">Entry range</span>
          <span className="font-mono text-foreground">
            {formatRange(pkg.minCents, pkg.maxCents, pkg.currency)}
          </span>
        </div>
        {pkg.termMonths ? (
          <div className="flex items-center justify-between">
            <span className="text-faint">Term</span>
            <span className="text-foreground">{pkg.termMonths} months</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-faint">Risk level</span>
          <span className="text-foreground">{pkg.riskLevel}</span>
        </div>
      </div>

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
