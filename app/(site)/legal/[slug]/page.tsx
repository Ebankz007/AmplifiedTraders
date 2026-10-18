import { getPage } from "@/lib/content";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <>
      <PageHero eyebrow="Legal" title={page.title} />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Prose markdown={page.content} />
        </div>
      </Section>
      <CtaBand
        eyebrow="Questions"
        title="Need clarity before you start?"
        body="Reach out to our team and we'll point you in the right direction."
        primary={{ href: "/contact", label: "Contact us" }}
        secondary={{ href: "/register", label: "Create an account" }}
      />
    </>
  );
}
