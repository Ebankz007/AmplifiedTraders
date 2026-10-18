import { getPostBySlug, getPostSlugs } from "@/lib/content";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { readingMinutes } from "@/lib/content-shape";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <PageHero
        eyebrow={post.category?.name ?? "Dispatch"}
        title={post.title}
        lead={post.excerpt}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-faint">
          <span>{post.authorName}</span>
          <span>·</span>
          <span>{formatDate(post.publishedAt)}</span>
          <span>·</span>
          <span>{readingMinutes(post.content)} min read</span>
          {post.isFeatured ? (
            <>
              <span>·</span>
              <Badge variant="gold">Featured</Badge>
            </>
          ) : null}
        </div>
      </PageHero>
      <Section>
        <div className="mx-auto max-w-3xl">
          <Prose markdown={post.content} />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
