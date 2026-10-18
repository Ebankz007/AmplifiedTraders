import { getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

const FALLBACK_TITLE = "About Amplified Traders";
const FALLBACK_BODY = `Amplified Traders is a trading ecosystem built around three ideas: copy trading that mirrors real decisions, structured investment packages with clear terms, and a network that rewards the people who bring others in.

We are a technology and community platform. We provide the software, the infrastructure, and the education. We do not hold your funds, and we do not promise returns. The brokers you connect to are third parties with their own terms, and every trade carries risk.

The platform is built on a single fee model: a registration fee and a small platform fee per payment, both disclosed up front. There are no hidden charges and no performance guarantees.

This page will be expanded with the full company story once it is ready.`;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return {
    title: page?.metaTitle ?? page?.title ?? FALLBACK_TITLE,
    description: page?.metaDescription ?? undefined,
  };
}

export default async function AboutPage() {
  const page = await getPage("about");

  return (
    <>
      <PageHero
        eyebrow="Amplified Traders"
        title={page?.title ?? FALLBACK_TITLE}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Prose markdown={page?.content ?? FALLBACK_BODY} />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
