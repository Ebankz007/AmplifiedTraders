import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdminPermission("dashboard");
  const { error } = await searchParams;

  const [totalMembers, activeMembers, pendingKyc, openTickets, publishedPosts] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActiveMember: true } }),
      prisma.user.count({ where: { kycStatus: "PENDING" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
      prisma.communityPost.count({ where: { status: "PUBLISHED" } }),
    ]);

  const stats = [
    { label: "Members", value: totalMembers, hint: "All registered accounts" },
    { label: "Active members", value: activeMembers, hint: "Activated (fee cleared)" },
    { label: "KYC pending", value: pendingKyc, hint: "Awaiting review" },
    { label: "Open tickets", value: openTickets, hint: "Open or awaiting reply" },
    { label: "Published posts", value: publishedPosts, hint: "Community, visible" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {admin.name}. Here is the platform at a glance.
        </p>
      </div>

      {error === "forbidden" && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          You do not have permission to view that area.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-xs uppercase tracking-wide text-faint">{stat.label}</p>
            <p className="mt-1 font-display text-3xl font-bold text-foreground">
              {stat.value.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs text-muted">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              Members
            </p>
            <p className="mt-1 text-sm text-muted">
              Browse accounts, status and verification.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-brand hover:underline"
          >
            Open members →
          </Link>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-faint">
        <Badge variant="outline">{admin.role}</Badge>
        <span>More areas appear here as they are built.</span>
      </div>
    </div>
  );
}
