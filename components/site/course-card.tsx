import { BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type CourseCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: string | null;
  lessons: { id: string; title: string }[];
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">Education</p>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {course.title}
          </h3>
        </div>
        <GraduationCap className="h-5 w-5 text-brand" aria-hidden="true" />
      </div>

      {course.summary ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{course.summary}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-faint">
        {course.level ? <Badge variant="outline">{course.level}</Badge> : null}
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />
          {course.lessons.length} lesson{course.lessons.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="mt-5 space-y-2 text-sm text-muted">
        {course.lessons.slice(0, 4).map((lesson) => (
          <li key={lesson.id} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand/60" />
            <span>{lesson.title}</span>
          </li>
        ))}
        {course.lessons.length > 4 ? (
          <li className="text-xs text-faint">
            +{course.lessons.length - 4} more
          </li>
        ) : null}
      </ul>
    </article>
  );
}
