import { getCourses, getPage } from "@/lib/content";
import { PageHero, Section } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { CourseCard } from "@/components/site/course-card";
import { Prose } from "@/components/site/prose";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Education",
  description: "Practical trading education for the Amplified Traders community.",
};

export default async function EducationPage() {
  const [courses, page] = await Promise.all([getCourses(), getPage("education")]);

  return (
    <>
      <PageHero
        eyebrow="Learn"
        title={page?.title ?? "Education"}
        lead={page?.metaDescription ?? "Build knowledge, discipline and risk awareness."}
      />
      <Section>
        <div className="max-w-2xl">
          {page ? (
            <Prose markdown={page.content} />
          ) : (
            <p className="text-muted">
              Structured learning designed to help participants make informed decisions.
            </p>
          )}
        </div>
      </Section>
      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
        {courses.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">No courses are published yet.</p>
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
