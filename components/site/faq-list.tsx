import { ChevronDown } from "lucide-react";
import { Prose } from "@/components/site/prose";

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
};

/**
 * A `<details>` disclosure list — no JavaScript, so it renders in the static
 * shell and works with scripting disabled. The native marker is hidden and the
 * chevron rotates via `group-open`.
 */
export function FaqList({ items }: { items: readonly FaqEntry[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-sm text-faint">
        No answers have been published yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <details key={item.id} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-foreground transition-colors hover:bg-elevated/60 [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="px-5 pb-5">
            <Prose markdown={item.answer} />
          </div>
        </details>
      ))}
    </div>
  );
}
