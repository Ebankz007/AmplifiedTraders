import { getPage } from "@/lib/content";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Prose } from "@/components/site/prose";
import { LEGAL_SLUGS } from "@/lib/navigation";
import type { Metadata } from "next";

/**
 * Fallback copy for the four legal documents. The real text is authored by
 * counsel (PLAN §4) and stored as a published `Page` row; until those rows
 * exist, the footer must not lead to a 404. This fallback is deliberately
 * conservative: it states what the platform *is*, restates the risk notice,
 * and says the full document is being prepared. It invents no clauses.
 */
const FALLBACK: Record<string, { title: string; body: string }> = {
  "risk-disclosure": {
    title: "Risk Disclosure",
    body: `Trading and investing involve substantial risk and may not be suitable for all participants.

Amplified Traders is a technology and community platform. We provide software for copy trading, structured investment packages, referral networking, and education. We do not provide investment advice, and nothing on this platform is a guarantee of returns.

Past performance is not indicative of future results. Copy trading mirrors the decisions of other traders; those decisions can and will lose money. Structured packages carry the risk of partial or total loss of the amount you commit. You should never participate with funds you cannot afford to lose.

The full risk disclosure document is being prepared and will be published here.`,
  },
  terms: {
    title: "Terms of Service",
    body: `These terms govern your use of the Amplified Traders platform.

Amplified Traders provides software and community infrastructure. We are not a broker, an investment adviser, or a custodian of investment returns. Accounts you hold with third-party brokers remain subject to those brokers' own terms.

You are responsible for the security of your account credentials and for the compliance of your activity with the laws of your jurisdiction.

The full Terms of Service are being drafted by counsel and will be published here.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `This policy explains what we collect and why.

We collect the minimum information needed to operate your account: your name, email address, and the verification data required by our identity checks. We do not sell your personal data.

You can request access to or deletion of your personal data through the support channel at any time, subject to the record-retention obligations that apply to financial platforms.

The full Privacy Policy is being prepared and will be published here.`,
  },
  cookies: {
    title: "Cookie Policy",
    body: `We use a small number of cookies to keep you signed in and to remember your preferences.

We do not use third-party advertising cookies. Session cookies expire when you sign out or your browser session ends.

The full Cookie Policy will be published here.`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!LEGAL_SLUGS.includes(slug)) return { title: "Not found" };
  const page = await getPage(`legal/${slug}`);
  const fallback = FALLBACK[slug];
  return {
    title: page?.metaTitle ?? page?.title ?? fallback?.title ?? "Legal",
    description: page?.metaDescription ?? undefined,
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!LEGAL_SLUGS.includes(slug)) notFound();

  // The Page row may be keyed as `legal/<slug>` (full path) or `<slug>`.
  const page = (await getPage(`legal/${slug}`)) ?? (await getPage(slug));
  const fallback = FALLBACK[slug];

  const title = page?.title ?? fallback?.title ?? "Legal";
  const content = page?.content ?? fallback?.body ?? "";

  return (
    <>
      <PageHero eyebrow="Legal" title={title} />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Prose markdown={content} />
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
