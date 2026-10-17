import { describe, expect, it } from "vitest";
import { checkTeamChange, ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/lib/admin-team";
import { createAdminSchema, updateAdminSchema } from "@/lib/validators";

const base = {
  actorId: "actor",
  targetId: "target",
  targetRole: "CONTENT_ADMIN" as const,
  targetActive: true,
  activeSuperAdmins: 2,
};

describe("checkTeamChange", () => {
  it("allows changing another admin's role", () => {
    expect(
      checkTeamChange({ ...base, nextRole: "SUPPORT_ADMIN" }),
    ).toEqual({ ok: true });
  });

  it("allows deactivating another admin", () => {
    expect(checkTeamChange({ ...base, nextActive: false })).toEqual({
      ok: true,
    });
  });

  it("refuses to deactivate yourself", () => {
    const result = checkTeamChange({
      ...base,
      actorId: "me",
      targetId: "me",
      nextActive: false,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses to change your own role", () => {
    const result = checkTeamChange({
      ...base,
      actorId: "me",
      targetId: "me",
      nextRole: "SUPER_ADMIN",
    });
    expect(result.ok).toBe(false);
  });

  it("refuses to demote the last active super admin", () => {
    const result = checkTeamChange({
      ...base,
      targetRole: "SUPER_ADMIN",
      activeSuperAdmins: 1,
      nextRole: "CONTENT_ADMIN",
    });
    expect(result.ok).toBe(false);
  });

  it("refuses to deactivate the last active super admin", () => {
    const result = checkTeamChange({
      ...base,
      targetRole: "SUPER_ADMIN",
      activeSuperAdmins: 1,
      nextActive: false,
    });
    expect(result.ok).toBe(false);
  });

  it("allows demoting a super admin when another active one remains", () => {
    expect(
      checkTeamChange({
        ...base,
        targetRole: "SUPER_ADMIN",
        activeSuperAdmins: 2,
        nextRole: "CONTENT_ADMIN",
      }),
    ).toEqual({ ok: true });
  });

  it("allows a no-op on the last super admin", () => {
    expect(
      checkTeamChange({
        ...base,
        targetRole: "SUPER_ADMIN",
        activeSuperAdmins: 1,
      }),
    ).toEqual({ ok: true });
  });
});

describe("admin role vocabulary", () => {
  it("covers every role with a label", () => {
    for (const role of ADMIN_ROLES) {
      expect(typeof ADMIN_ROLE_LABELS[role]).toBe("string");
      expect(ADMIN_ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });
});

describe("createAdminSchema", () => {
  const valid = {
    name: "Ada Admin",
    email: "Ada@Example.com",
    role: "SUPPORT_ADMIN",
    password: "Correct-Horse-9",
  };

  it("accepts a valid admin and normalises the email", () => {
    const parsed = createAdminSchema.parse(valid);
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.role).toBe("SUPPORT_ADMIN");
  });

  it("enforces the password policy", () => {
    expect(
      createAdminSchema.safeParse({ ...valid, password: "weak" }).success,
    ).toBe(false);
  });

  it("rejects an unknown role", () => {
    expect(
      createAdminSchema.safeParse({ ...valid, role: "ROOT" }).success,
    ).toBe(false);
  });
});

describe("updateAdminSchema", () => {
  it("accepts a role-only or active-only change", () => {
    expect(updateAdminSchema.safeParse({ role: "FINANCE_ADMIN" }).success).toBe(
      true,
    );
    expect(updateAdminSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("rejects an empty change", () => {
    expect(updateAdminSchema.safeParse({}).success).toBe(false);
  });
});
