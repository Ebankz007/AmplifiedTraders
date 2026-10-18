import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { postHref } from "@/lib/content-shape";

export type PostCardData = {
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  authorName: string;
  category: { name: string; slug: string } | null;
};

export function PostCard({ post }: { post: PostCardData }) {
  const href = postHref(post.slug);
  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-3">
        {post.category ? (
          <Badge variant="brand">{post.category.name}</Badge>
        ) : (
          <Badge variant="outline">Dispatch</Badge>
        )}
        <span className="text-xs text-faint">{formatDate(post.publishedAt)}</span>
      </div>

      <h3 className="mt-4 font-display text-lg font-bold tracking-tight">
        <Link href={href} className="transition-colors hover:text-brand">
          {post.title}
        </Link>
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted">{post.excerpt}</p>

      <p className="mt-auto pt-5 text-xs text-faint">{post.authorName}</p>
    </article>
  );
}
