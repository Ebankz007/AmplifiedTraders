import { rolePermissions, type Permission } from "@/lib/rbac";
import type { AdminRole } from "@/lib/generated/prisma/enums";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  /** The permission an admin must hold to see (and enter) this area. */
  permission: Permission;
};

/**
 * Only areas that actually exist are listed.
 *
 * A nav item pointing at an unbuilt page is a decorative dead link — the same
 * rule the member portal follows (`components/dashboard/nav-items.ts`). Areas
 * arrive as they are built, never in advance.
 */
export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    description: "Platform at a glance",
    permission: "dashboard",
  },
  {
    href: "/admin/users",
    label: "Members",
    description: "Accounts, status and roles",
    permission: "users",
  },
  {
    href: "/admin/kyc",
    label: "KYC",
    description: "Identity verification",
    permission: "kyc",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    description: "Sensitive admin actions",
    permission: "audit",
  },
  {
    href: "/admin/team",
    label: "Team",
    description: "Admin accounts and roles",
    permission: "team",
  },
];

/**
 * The nav an admin's role is actually allowed to enter.
 *
 * The nav and the guard read the **same** matrix (`ROLE_PERMISSIONS`), so the
 * sidebar can never advertise a door the guard would slam — and, because the
 * filter is derived rather than hand-maintained, adding an area to the matrix
 * cannot leave the nav stale.
 */
export function visibleAdminNav(role: AdminRole): AdminNavItem[] {
  const granted = rolePermissions(role);
  return adminNavItems.filter((item) => granted.includes(item.permission));
}
