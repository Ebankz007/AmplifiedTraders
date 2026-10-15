import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: { template: "%s · Admin", default: "Admin" },
};

/**
 * Every route under the `(console)` group is admin-only. The guard lives in the
 * layout so no child page can forget it. `/admin/login` sits in the sibling
 * `(auth)` group precisely so this guard does not wrap it.
 */
export default async function AdminConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
