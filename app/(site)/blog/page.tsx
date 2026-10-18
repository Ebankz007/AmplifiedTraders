import { getPosts, getBlogCategories, countPosts } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { PostCard } from "@/components/site/post-card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Dispatches from the Amplified Traders ecosystem.",
};

const PAGE_SIZE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { page: pageRaw, category } = await searchParams;
  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [posts, total, categories] = await Promise.all([
    getPosts({ take: PAGE_SIZE, skip, categorySlug: category }),
    countPosts(category),
    getBlogCategories(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHero
        eyebrow="Insights"
        title="Amplified Traders Dispatch"
        lead="Clear, measured updates from the platform and the wider trading community."
      />
      <Section>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              !category
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-border text-muted hover:bg-elevated hover:text-foreground",
            )}
          >
            All
          </Link>
          {categories.map((c) => {
            const active = category === c.slug;
            return (
              <Link
                key={c.slug}
                href={`/blog?category=${c.slug}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border text-muted hover:bg-elevated hover:text-foreground",
                )}
              >
                {c.name} ({c._count.posts})
              </Link>
            );
          })}
        </div>

        {posts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">No published posts in this category yet.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  title: post.title,
                  slug: post.slug,
                  excerpt: post.excerpt,
                  publishedAt: post.publishedAt,
                  authorName: post.authorName,
                  category: post.category,
                }}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-10 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={`/blog?page=${page - 1}${category ? `&category=${category}` : ""}`} className="text-brand">
                ← Previous
              </Link>
            ) : (
              <span className="text-faint">← Previous</span>
            )}
            {page < pages ? (
              <Link href={`/blog?page=${page + 1}${category ? `&category=${category}` : ""}`} className="text-brand">
                Next →
              </Link>
            ) : (
              <span className="text-faint">Next →</span>
            )}
          </nav>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
