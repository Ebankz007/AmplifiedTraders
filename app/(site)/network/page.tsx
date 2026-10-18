import { getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("network");
  if (!page) return { title: "Network" };
  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
  };
}

export default async function NetworkPage() {
  const page = await getPage("network");
  return (
    <>
      <PageHero
        eyebrow="Amplify Network"
        title={page?.title ?? "Referral Network"}
        lead={page?.metaDescription ?? "Grow your network and participate in a transparent referral structure."}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          {page ? (
            <Prose markdown={page.content} />
          ) : (
            <p className="text-muted">
              A transparent, structured referral framework built around genuine community growth.
            </p>
          )}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
