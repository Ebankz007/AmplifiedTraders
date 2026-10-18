import { Badge } from "@/components/ui/badge";
import { Prose } from "@/components/site/prose";

export type TraderCardData = {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  riskLevel: string;
  isFeatured: boolean;
};

export function TraderCard({ trader }: { trader: TraderCardData }) {
  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Trader</p>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {trader.displayName}
          </h3>
          {trader.headline ? (
            <p className="mt-1 text-sm text-muted">{trader.headline}</p>
          ) : null}
        </div>
        {trader.isFeatured ? (
          <Badge variant="gold">Featured</Badge>
        ) : (
          <Badge variant="outline">Profile</Badge>
        )}
      </div>

      {trader.bio ? (
        <div className="mt-4">
          <Prose markdown={trader.bio} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Strategy details are shared privately with verified participants.
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6 text-xs text-faint">
        {trader.country ? <span>{trader.country}</span> : null}
        <span>Risk: {trader.riskLevel}</span>
      </div>
    </article>
  );
}
