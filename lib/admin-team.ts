import { AdminRole } from "@/lib/generated/prisma/enums";
import type { AdminRole as AdminRoleValue } from "@/lib/generated/prisma/enums";

/**
 * Every admin role, derived from the generated enum so the picker can never
 * drift from the schema. Cast to a non-empty tuple for `z.enum`.
 */
export const ADMIN_ROLES = Object.values(AdminRole) as [
  AdminRoleValue,
  ...AdminRoleValue[],
];

export const ADMIN_ROLE_LABELS: Record<AdminRoleValue, string> = {
  SUPER_ADMIN: "Super admin",
  CONTENT_ADMIN: "Content admin",
  SUPPORT_ADMIN: "Support admin",
  FINANCE_ADMIN: "Finance admin",
  NETWORK_ADMIN: "Network admin",
  TRADER_ADMIN: "Trader admin",
};

export type TeamChangeInput = {
  /** The signed-in admin performing the change. */
  actorId: string;
  targetId: string;
  targetRole: AdminRoleValue;
  targetActive: boolean;
  /** How many admins currently hold SUPER_ADMIN *and* are active. */
  activeSuperAdmins: number;
  nextRole?: AdminRoleValue;
  nextActive?: boolean;
};

export type TeamChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Guard a team change against lockout. Two ways to brick the console:
 *  1. An admin demotes or deactivates **themselves** — the classic foot-gun.
 *  2. The **last active super admin** is demoted or deactivated — nobody can
 *     ever manage the team again.
 *
 * Both are refused here, in one pure function, so the rule is testable and the
 * API route cannot forget it.
 */
export function checkTeamChange(input: TeamChangeInput): TeamChangeResult {
  const nextRole = input.nextRole ?? input.targetRole;
  const nextActive = input.nextActive ?? input.targetActive;

  if (input.targetId === input.actorId) {
    if (!nextActive) {
      return { ok: false, error: "You cannot deactivate your own account." };
    }
    if (nextRole !== input.targetRole) {
      return { ok: false, error: "You cannot change your own role." };
    }
  }

  const isLastActiveSuperAdmin =
    input.targetRole === "SUPER_ADMIN" &&
    input.targetActive &&
    input.activeSuperAdmins <= 1;

  if (isLastActiveSuperAdmin) {
    if (nextRole !== "SUPER_ADMIN") {
      return { ok: false, error: "You cannot demote the last active super admin." };
    }
    if (!nextActive) {
      return {
        ok: false,
        error: "You cannot deactivate the last active super admin.",
      };
    }
  }

  return { ok: true };
}
