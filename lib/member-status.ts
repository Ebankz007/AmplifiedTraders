import type { UserStatus } from "@/lib/generated/prisma/enums";

/**
 * Admin account-status actions. The client sends the *intent* ("suspend" /
 * "reinstate"); the server derives the resulting status. A client that could
 * name the target status directly could flip an unverified account straight to
 * ACTIVE — i.e. grant standing that email verification never did.
 */
export const MEMBER_STATUS_ACTIONS = ["SUSPEND", "REINSTATE"] as const;

export type MemberStatusAction = (typeof MEMBER_STATUS_ACTIONS)[number];

export type StatusTransition =
  | { ok: true; status: UserStatus }
  | { ok: false; error: string };

/**
 * Resolve the status an action produces, or explain why it is a no-op.
 *
 * Reinstate is deliberately not a blind "→ ACTIVE": an account that never
 * verified its email returns to PENDING, so reinstatement can never launder an
 * unverified account into good standing. `emailVerified` is the discriminator.
 */
export function memberStatusTransition(
  action: MemberStatusAction,
  current: UserStatus,
  emailVerified: boolean,
): StatusTransition {
  if (action === "SUSPEND") {
    if (current === "SUSPENDED") {
      return { ok: false, error: "This account is already suspended." };
    }
    return { ok: true, status: "SUSPENDED" };
  }

  if (current !== "SUSPENDED") {
    return { ok: false, error: "This account is not suspended." };
  }
  return { ok: true, status: emailVerified ? "ACTIVE" : "PENDING" };
}
