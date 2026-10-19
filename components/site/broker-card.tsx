import { Building2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Prose } from "@/components/site/prose";

export type BrokerCardData = {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string | null;
  region: string | null;
};

export function BrokerCard({ broker }: { broker: BrokerCardData }) {
  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Broker</p>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {broker.name}
          </h3>
        </div>
        <Building2 className="h-5 w-5 text-faint" aria-hidden="true" />
      </div>

      {broker.description ? (
        <div className="mt-3">
          <Prose markdown={broker.description} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          A venue you may already hold an account with. Connect it from your
          dashboard; your capital stays there.
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6 text-xs text-faint">
        {broker.region ? (
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-4 w-4" />
            {broker.region}
          </span>
        ) : null}
        <a
          href={broker.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-brand transition-colors hover:text-brand-bright"
        >
          <Building2 className="h-4 w-4" />
          Official site
        </a>
      </div>
    </article>
  );
}
