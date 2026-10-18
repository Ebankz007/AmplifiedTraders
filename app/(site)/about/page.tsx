import { getPage } from "@/lib/content";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  if (!page) return { title: "About" };
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
  };
}

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();

  return (
    <>
      <PageHero eyebrow="Amplified Traders" title={page.title} />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Prose markdown={page.content} />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
