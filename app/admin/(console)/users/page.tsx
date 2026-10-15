import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  KycStatus,
  UserRole,
  UserStatus,
} from "@/lib/generated/prisma/enums";

export const metadata = { title: "Members" };

const PAGE_SIZE = 25;

const roleLabel: Record<UserRole, string> = {
  CLIENT: "Client",
  TRADER: "Trader",
};

const statusLabel: Record<UserStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

const statusVariant: Record<UserStatus, BadgeVariant> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
};

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

function pageHref(page: number) {
  return page <= 1 ? "/admin/users" : `/admin/users?page=${page}`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPermission("users");
  const { page: pageRaw } = await searchParams;

  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [total, members] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        kycStatus: true,
        isActiveMember: true,
        createdAt: true,
        sponsor: { select: { fullName: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted">
          {total.toLocaleString("en-US")} registered account
          {total === 1 ? "" : "s"}, newest first.
        </p>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-faint">
              {page > 1
                ? "Nothing on this page — you may have reached the end of the list."
                : "No members yet. Accounts appear here once people register."}
            </p>
            {page > 1 && (
              <Link href={pageHref(1)} className="mt-3 inline-block text-sm text-brand">
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
                      Role
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      KYC
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Membership
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Sponsor
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr key={member.id} className="transition-colors hover:bg-elevated/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-faint">{member.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline">{roleLabel[member.role]}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[member.status]}>
                          {statusLabel[member.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={kycVariant[member.kycStatus]}>
                          {kycLabel[member.kycStatus]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {member.isActiveMember ? (
                          <Badge variant="gold">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {member.sponsor?.fullName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {formatDate(member.createdAt)}
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
        <nav aria-label="Member pages" className="flex items-center justify-between">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-sm text-brand">
              ← Previous
            </Link>
          ) : (
            <span className="text-sm text-faint">← Previous</span>
          )}
          <span className="text-sm text-faint">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-sm text-brand">
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
