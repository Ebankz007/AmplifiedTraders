export type StatRow = {
  id: string;
  label: string;
  value: string;
  suffix: string | null;
  note: string | null;
};

/**
 * The numbers band.
 *
 * Renders nothing when no stats are published — an empty grid of placeholders
 * is worse than no band, and a marketing page must never invent a figure
 * (PLAN §2). Every value here is a `Stat` row an admin typed.
 */
export function StatsBand({ stats }: { stats: readonly StatRow[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="border-y border-border bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((stat) => (
          <div key={stat.id}>
            <p className="font-display text-3xl font-bold tracking-tight text-gradient-brand">
              {stat.value}
              {stat.suffix ?? ""}
            </p>
            <p className="mt-1.5 text-sm font-medium text-foreground">
              {stat.label}
            </p>
            {stat.note ? (
              <p className="mt-1 text-xs leading-relaxed text-faint">{stat.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
