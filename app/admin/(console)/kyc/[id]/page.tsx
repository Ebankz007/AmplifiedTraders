import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { KycReviewForm } from "@/components/admin/kyc-review-form";
import type { KycStatus } from "@/lib/generated/prisma/enums";

export const metadata = { title: "KYC review" };

const kycLabel: Record<KycStatus, string> = {
  NOT_STARTED: "Not started",
  PENDING: "In review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

const kycVariant: Record<KycStatus, BadgeVariant> = {
  NOT_STARTED: "outline",
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};

/**
 * Only surface a URL we are willing to render as a link. `documents` is
 * member-supplied JSON, so a `javascript:` (or other scheme) URL must never
 * reach an `href` — that is stored XSS with extra steps.
 */
function safeUrl(url: string): string | null {
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    /* not an absolute URL */
  }
  return null;
}

function documentLinks(documents: unknown): { label: string; url: string }[] {
  if (!Array.isArray(documents)) return [];
  const out: { label: string; url: string }[] = [];
  for (const entry of documents) {
    if (entry && typeof entry === "object" && "url" in entry) {
      const raw = (entry as { url?: unknown }).url;
      if (typeof raw !== "string") continue;
      const url = safeUrl(raw);
      if (!url) continue;
      const record = entry as Record<string, unknown>;
      const label = record.label ?? record.name ?? record.type ?? "Document";
      out.push({ label: String(label), url });
    }
  }
  return out;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminKycReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("kyc");
  const { id } = await params;

  const profile = await prisma.kycProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, kycStatus: true },
      },
      reviewedBy: { select: { name: true, email: true } },
    },
  });

  if (!profile) notFound();

  const docs = documentLinks(profile.documents);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/kyc"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to KYC
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {profile.user.fullName}
          </h1>
          <Badge variant={kycVariant[profile.status]}>
            {kycLabel[profile.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{profile.user.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Submitted details
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Legal name" value={profile.legalName ?? "—"} />
                <Field
                  label="Date of birth"
                  value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : "—"}
                />
                <Field label="Country" value={profile.country ?? "—"} />
                <Field label="ID type" value={profile.idType ?? "—"} />
                <Field label="ID number" value={profile.idNumber ?? "—"} />
                <Field
                  label="Submitted"
                  value={profile.submittedAt ? formatDateTime(profile.submittedAt) : "—"}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    value={
                      <span className="whitespace-pre-line">
                        {profile.address ?? "—"}
                      </span>
                    }
                  />
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Documents
              </h2>
              {(() => {
                const docs = documentLinks(profile.documents);
                if (docs.length === 0) {
                  return (
                    <p className="mt-2 text-sm text-faint">
                      No documents attached.
                    </p>
                  );
                }
                return (
                  <ul className="mt-3 space-y-2">
                    {docs.map((doc) => (
                      <li key={doc.url}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand hover:underline"
                        >
                          {doc.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Decision
              </h2>
              <p className="mt-1 text-sm text-muted">
                Approving verifies the member. Rejecting requires a reason they
                will see.
              </p>
              <div className="mt-4">
                <KycReviewForm profileId={profile.id} status={profile.status} />
              </div>
            </CardContent>
          </Card>

          {profile.reviewedAt && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-sm font-semibold text-foreground">
                  Review record
                </h2>
                <dl className="mt-3 space-y-3">
                  <Field label="Reviewed" value={formatDateTime(profile.reviewedAt)} />
                  <Field label="Reviewer" value={profile.reviewedBy?.name ?? "—"} />
                  {profile.rejectionReason && (
                    <Field label="Reason" value={profile.rejectionReason} />
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
