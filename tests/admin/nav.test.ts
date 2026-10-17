import { describe, expect, it } from "vitest";
import { adminNavItems, visibleAdminNav } from "@/components/admin/nav-items";
import { hasPermission } from "@/lib/rbac";
import type { AdminRole } from "@/lib/generated/prisma/enums";

const ROLES: AdminRole[] = [
  "SUPER_ADMIN",
  "CONTENT_ADMIN",
  "SUPPORT_ADMIN",
  "FINANCE_ADMIN",
  "NETWORK_ADMIN",
  "TRADER_ADMIN",
];

describe("admin nav", () => {
  it("lists only real, unique /admin routes", () => {
    const hrefs = adminNavItems.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect(href.startsWith("/admin")).toBe(true);
    }
  });

  it("never shows a door the guard would slam", () => {
    // The invariant that matters: every visible item's permission is one the
    // role actually holds — the nav and the guard read the same matrix.
    for (const role of ROLES) {
      for (const item of visibleAdminNav(role)) {
        expect(hasPermission(role, item.permission)).toBe(true);
      }
    }
  });

  it("gives SUPER_ADMIN the whole nav", () => {
    expect(visibleAdminNav("SUPER_ADMIN")).toHaveLength(adminNavItems.length);
  });

  it("hides Members from roles without the users permission", () => {
    for (const role of ["CONTENT_ADMIN", "FINANCE_ADMIN", "NETWORK_ADMIN", "TRADER_ADMIN"] as AdminRole[]) {
      const labels = visibleAdminNav(role).map((item) => item.label);
      expect(labels).not.toContain("Members");
    }
  });

  it("shows Members to SUPPORT_ADMIN", () => {
    const labels = visibleAdminNav("SUPPORT_ADMIN").map((item) => item.label);
    expect(labels).toContain("Members");
  });

  it("hides the Audit log from every role but SUPER_ADMIN", () => {
    for (const role of [
      "CONTENT_ADMIN",
      "SUPPORT_ADMIN",
      "FINANCE_ADMIN",
      "NETWORK_ADMIN",
      "TRADER_ADMIN",
    ] as AdminRole[]) {
      const labels = visibleAdminNav(role).map((item) => item.label);
      expect(labels).not.toContain("Audit log");
    }
    expect(visibleAdminNav("SUPER_ADMIN").map((item) => item.label)).toContain(
      "Audit log",
    );
  });

  it("hides the Team from every role but SUPER_ADMIN", () => {
    for (const role of [
      "CONTENT_ADMIN",
      "SUPPORT_ADMIN",
      "FINANCE_ADMIN",
      "NETWORK_ADMIN",
      "TRADER_ADMIN",
    ] as AdminRole[]) {
      const labels = visibleAdminNav(role).map((item) => item.label);
      expect(labels).not.toContain("Team");
    }
    expect(visibleAdminNav("SUPER_ADMIN").map((item) => item.label)).toContain(
      "Team",
    );
  });

  it("gives every role the Overview (dashboard permission)", () => {    for (const role of ROLES) {
      const labels = visibleAdminNav(role).map((item) => item.label);
      expect(labels).toContain("Overview");
    }
  });

  it("returns nothing for an unknown role", () => {
    expect(visibleAdminNav("NOPE" as AdminRole)).toEqual([]);
  });
});
