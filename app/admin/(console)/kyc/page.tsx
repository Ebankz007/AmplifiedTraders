import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { KycStatus } from "@/lib/generated/prisma/enums";

export const metadata = { title: "KYC" };

const PAGE_SIZE = 25;

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

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "VERIFIED", label: "Verified" },
  { key: "REJECTED", label: "Rejected" },
];

function pageHref(page: number, status: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", page.toString());
  if (status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `/admin/kyc?${qs}` : "/admin/kyc";
}

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdminPermission("kyc");
  const { page: pageRaw, status: statusRaw } = await searchParams;

  const status = FILTERS.some((f) => f.key === statusRaw) ? statusRaw! : "all";
  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const where = status === "all" ? {} : { status: status as KycStatus };

  const [total, profiles] = await Promise.all([
    prisma.kycProfile.count({ where }),
    prisma.kycProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        legalName: true,
        country: true,
        idType: true,
        submittedAt: true,
        reviewedAt: true,
        createdAt: true,
        user: { select: { email: true, fullName: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          KYC
        </h1>
        <p className="mt-1 text-sm text-muted">
          {total.toLocaleString("en-US")} profile{total === 1 ? "" : "s"}{" "}
          {status === "all" ? "total" : `filtered by ${status.toLowerCase()}`}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={pageHref(1, f.key)}
            className={
              status === f.key
                ? "text-brand"
                : "text-muted hover:text-foreground"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-faint">
              {page > 1
                ? "Nothing on this page — you may have reached the end of the list."
                : "No KYC profiles match this filter."}
            </p>
            {page > 1 && (
              <Link
                href={pageHref(1, status)}
                className="mt-3 inline-block text-sm text-brand"
              >
                Back to the first page
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Member
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Legal name
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Country
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      ID type
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Submitted
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Reviewed
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">
                          {profile.user.fullName}
                        </div>
                        <div className="text-xs text-faint">
                          {profile.user.email}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={kycVariant[profile.status]}>
                          {kycLabel[profile.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {profile.legalName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {profile.country ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {profile.idType ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {profile.submittedAt
                          ? formatDate(profile.submittedAt)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {profile.reviewedAt
                          ? formatDate(profile.reviewedAt)
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/kyc/${profile.id}`}
                          className="text-sm text-brand hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pages > 1 && (
        <nav
          aria-label="KYC pages"
          className="flex items-center justify-between"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1, status)}
              className="text-sm text-brand"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-sm text-faint">← Previous</span>
          )}
          <span className="text-sm text-faint">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={pageHref(page + 1, status)}
              className="text-sm text-brand"
            >
              Next →
            </Link>
          ) : (
            <span className="text-sm text-faint">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
