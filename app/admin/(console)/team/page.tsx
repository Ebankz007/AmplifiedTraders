import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminCreateForm } from "@/components/admin/admin-create-form";
import { AdminRowActions } from "@/components/admin/admin-row-actions";
import { ADMIN_ROLE_LABELS } from "@/lib/admin-team";

export const metadata = { title: "Team" };

export default async function AdminTeamPage() {
  const admin = await requireAdminPermission("team");

  const admins = await prisma.admin.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Team
        </h1>
        <p className="mt-1 text-sm text-muted">
          {admins.length} admin account{admins.length === 1 ? "" : "s"}. Roles
          decide which areas each admin can enter.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                    Admin
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                    Role
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                    Last login
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                    Manage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((row) => {
                  const isSelf = row.id === admin.id;
                  return (
                    <tr
                      key={row.id}
                      className="align-top transition-colors hover:bg-elevated/50"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">
                          {row.name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-faint">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-faint">{row.email}</p>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {ADMIN_ROLE_LABELS[row.role]}
                      </td>
                      <td className="px-5 py-3">
                        {row.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Disabled</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {row.lastLoginAt
                          ? formatDateTime(row.lastLoginAt)
                          : "Never"}
                      </td>
                      <td className="px-5 py-3">
                        <AdminRowActions
                          adminId={row.id}
                          role={row.role}
                          isActive={row.isActive}
                          isSelf={isSelf}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Add an admin
          </h2>
          <p className="mt-1 text-sm text-muted">
            Create an account and set its role. The new admin signs in at{" "}
            <span className="text-foreground">/admin/login</span> with the
            password you set here.
          </p>
          <div className="mt-5">
            <AdminCreateForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
