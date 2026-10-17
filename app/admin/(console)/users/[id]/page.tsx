import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdminPermission } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MemberStatusForm } from "@/components/admin/member-status-form";
import type {
  KycStatus,
  UserRole,
  UserStatus,
} from "@/lib/generated/prisma/enums";

export const metadata = { title: "Member" };

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

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdminPermission("users");
  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      country: true,
      role: true,
      status: true,
      kycStatus: true,
      isActiveMember: true,
      highestAssociateRank: true,
      highestLeadershipRank: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      sponsor: { select: { id: true, fullName: true, email: true } },
      kycProfile: { select: { id: true, status: true } },
      wallet: { select: { balanceCents: true } },
      _count: {
        select: {
          sponsored: true,
          ledgerEntries: true,
          payments: true,
          payouts: true,
          commissions: true,
        },
      },
    },
  });

  if (!member) notFound();

  // Only render the KYC link to a role the KYC guard would actually admit —
  // never draw a door the guard would slam.
  const canReviewKyc = hasPermission(admin.role, "kyc");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back to members
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {member.fullName}
          </h1>
          <Badge variant={statusVariant[member.status]}>
            {statusLabel[member.status]}
          </Badge>
          <Badge variant="outline">{roleLabel[member.role]}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">{member.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Identity
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" value={member.email} />
                <Field label="Phone" value={member.phone ?? "—"} />
                <Field label="Country" value={member.country ?? "—"} />
                <Field label="Role" value={roleLabel[member.role]} />
                <Field
                  label="Membership"
                  value={
                    member.isActiveMember ? (
                      <Badge variant="gold">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )
                  }
                />
                <Field
                  label="Joined"
                  value={formatDateTime(member.createdAt)}
                />
                <Field
                  label="Last updated"
                  value={formatDateTime(member.updatedAt)}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Network
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Sponsor"
                  value={
                    member.sponsor ? (
                      <Link
                        href={`/admin/users/${member.sponsor.id}`}
                        className="text-brand hover:underline"
                      >
                        {member.sponsor.fullName}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field
                  label="Direct referrals"
                  value={member._count.sponsored.toLocaleString("en-US")}
                />
                <Field
                  label="Associate rank"
                  value={member.highestAssociateRank.toLocaleString("en-US")}
                />
                <Field
                  label="Leadership rank"
                  value={member.highestLeadershipRank.toLocaleString("en-US")}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Activity
              </h2>
              <p className="mt-1 text-sm text-faint">
                Read-only counts. Money movement is not yet enabled on this
                platform.
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Wallet balance"
                  value={
                    member.wallet
                      ? formatCents(member.wallet.balanceCents)
                      : "No wallet"
                  }
                />
                <Field
                  label="Ledger entries"
                  value={member._count.ledgerEntries.toLocaleString("en-US")}
                />
                <Field
                  label="Payments"
                  value={member._count.payments.toLocaleString("en-US")}
                />
                <Field
                  label="Payouts"
                  value={member._count.payouts.toLocaleString("en-US")}
                />
                <Field
                  label="Commissions"
                  value={member._count.commissions.toLocaleString("en-US")}
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Account status
              </h2>
              <div className="mt-4">
                <MemberStatusForm userId={member.id} status={member.status} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Security
              </h2>
              <dl className="mt-4 space-y-3">
                <Field
                  label="Email verified"
                  value={
                    member.emailVerifiedAt
                      ? formatDateTime(member.emailVerifiedAt)
                      : "Not verified"
                  }
                />
                <Field
                  label="Two-factor"
                  value={member.twoFactorEnabled ? "Enabled" : "Off"}
                />
                <Field
                  label="Last login"
                  value={
                    member.lastLoginAt
                      ? formatDateTime(member.lastLoginAt)
                      : "Never"
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                KYC
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Badge variant={kycVariant[member.kycStatus]}>
                  {kycLabel[member.kycStatus]}
                </Badge>
                {member.kycProfile && canReviewKyc && (
                  <Link
                    href={`/admin/kyc/${member.kycProfile.id}`}
                    className="text-sm text-brand hover:underline"
                  >
                    Open review →
                  </Link>
                )}
              </div>
              {!member.kycProfile && (
                <p className="mt-3 text-sm text-faint">
                  This member has not started a KYC submission.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Record
              </h2>
              <dl className="mt-3 space-y-3">
                <Field label="Member ID" value={
                  <span className="font-mono text-xs text-faint">{member.id}</span>
                } />
                <Field label="Created" value={formatDate(member.createdAt)} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
