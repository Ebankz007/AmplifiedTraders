import { getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("community");
  if (!page) return { title: "Community" };
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
  };
}

export default async function CommunityPage() {
  const page = await getPage("community");
  return (
    <>
      <PageHero
        eyebrow="Amplify Community"
        title={page?.title ?? "Community"}
        lead={page?.metaDescription ?? "A global trader community sharing ideas, education and experience."}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          {page ? (
            <Prose markdown={page.content} />
          ) : (
            <p className="text-muted">
              Trade together. Learn together. Grow together.
            </p>
          )}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
