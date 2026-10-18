/**
 * Pure derivations over content shapes.
 *
 * Kept out of `lib/content.ts` on purpose: that module imports Prisma, and
 * importing it in a test would construct a client. Everything here is a plain
 * function over plain data, so `tests/site/content.test.ts` can exercise it
 * without a database.
 */

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
};

export type FaqGroup = {
  /** `null` for the uncategorised group. */
  category: string | null;
  label: string;
  items: FaqItem[];
};

export const UNCATEGORISED_LABEL = "General";

/** Group FAQs by category, preserving first-seen order and never dropping one. */
export function groupFaqs(faqs: readonly FaqItem[]): FaqGroup[] {
  const groups = new Map<string | null, FaqGroup>();

  for (const faq of faqs) {
    const key = faq.category?.trim() ? faq.category.trim() : null;
    let group = groups.get(key);
    if (!group) {
      group = {
        category: key,
        label: key ?? UNCATEGORISED_LABEL,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(faq);
  }

  return [...groups.values()];
}

const WORDS_PER_MINUTE = 200;

/** Estimated reading time, never less than one minute. */
export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** A card-sized blurb. Prefers the stored excerpt, falls back to the body. */
export function excerptOf(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** `/blog/some-slug` — one place, so a card and a link can never disagree. */
export function postHref(slug: string): string {
  return `/blog/${slug}`;
}
