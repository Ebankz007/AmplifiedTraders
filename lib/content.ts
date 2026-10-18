/**
 * The public site's content readers.
 *
 * Every marketing page reads through here rather than calling Prisma inline, so
 * "what is published" is decided in exactly one place. A reader that forgot
 * `status: "PUBLISHED"` would leak drafts onto the public site, and there would
 * be no single place to notice.
 *
 * Server-only by construction: only server components import this module.
 */
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------- pages ------ */

export async function getPage(slug: string) {
  return prisma.page.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      slug: true,
      title: true,
      content: true,
      metaTitle: true,
      metaDescription: true,
      updatedAt: true,
    },
  });
}

/* --------------------------------------------------------------- faq ------ */

export async function getFaqs() {
  return prisma.faq.findMany({
    where: { isEnabled: true },
    orderBy: [{ order: "asc" }, { question: "asc" }],
    select: { id: true, question: true, answer: true, category: true },
  });
}

/* -------------------------------------------------------------- blog ------ */

const postCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  authorName: true,
  publishedAt: true,
  isFeatured: true,
  category: { select: { name: true, slug: true } },
} as const;

export async function getPosts({
  take = 12,
  skip = 0,
  categorySlug,
}: {
  take?: number;
  skip?: number;
  categorySlug?: string;
} = {}) {
  return prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: [
      { publishedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take,
    skip,
    select: postCardSelect,
  });
}

export async function countPosts(categorySlug?: string) {
  return prisma.blogPost.count({
    where: {
      status: "PUBLISHED",
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
  });
}

export async function getPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: { select: { name: true, slug: true } } },
  });
}

export async function getBlogCategories() {
  return prisma.blogCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
    },
  });
}

export async function getPostSlugs() {
  return prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });
}

/* ------------------------------------------------------------ listings ---- */

export async function getStats() {
  return prisma.stat.findMany({
    where: { isEnabled: true },
    orderBy: { order: "asc" },
    select: { id: true, label: true, value: true, suffix: true, note: true },
  });
}

export async function getTraders() {
  return prisma.trader.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { displayName: "asc" }],
    select: {
      id: true,
      slug: true,
      displayName: true,
      headline: true,
      bio: true,
      country: true,
      riskLevel: true,
      isFeatured: true,
    },
  });
}

export async function getPackages() {
  return prisma.package.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { tier: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      minCents: true,
      maxCents: true,
      currency: true,
      termMonths: true,
      riskLevel: true,
      isFeatured: true,
      features: true,
    },
  });
}

export async function getBrokers() {
  return prisma.broker.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, url: true, description: true, region: true },
  });
}

export async function getCourses() {
  return prisma.course.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      level: true,
      lessons: { select: { id: true, title: true }, orderBy: { order: "asc" } },
    },
  });
}
