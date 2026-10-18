import { getFaqs } from "@/lib/content";
import { groupFaqs } from "@/lib/content-shape";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList } from "@/components/site/faq-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about Amplified Traders.",
};

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = groupFaqs(faqs);

  return (
    <>
      <PageHero
        eyebrow="Help centre"
        title="Frequently Asked Questions"
        lead="Straight answers to the questions we hear most about the platform, process and participation."
      />
      <Section>
        <div className="mx-auto max-w-3xl space-y-10">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="font-display text-xl font-bold tracking-tight">
                {group.label}
              </h2>
              <div className="mt-4">
                <FaqList items={group.items} />
              </div>
            </div>
          ))}
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted">
              No FAQs have been published yet.
            </p>
          ) : null}
        </div>
      </Section>
      <CtaBand
        eyebrow="Still need help"
        title="Can't find what you're looking for?"
        body="Send a message and we'll get back to you as soon as we can."
        primary={{ href: "/contact", label: "Contact support" }}
        secondary={{ href: "/register", label: "Join Amplified Traders" }}
      />
    </>
  );
}
