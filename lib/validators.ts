import { z } from "zod";
import { MAX_PASSWORD_BYTES } from "@/lib/password";
import { MEMBER_STATUS_ACTIONS } from "@/lib/member-status";
import { ADMIN_ROLES } from "@/lib/admin-team";
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/support";
import { PAYOUT_METHODS } from "@/lib/payout";

/** Normalise (trim + lowercase) then validate. Stored emails are always lowercase. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

/**
 * Password policy. The max is `MAX_PASSWORD_BYTES` (72) because bcrypt silently
 * truncates beyond that — accepting a longer password would create collisions.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(
    MAX_PASSWORD_BYTES,
    `Password must be at most ${MAX_PASSWORD_BYTES} characters`,
  )
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(32).optional(),
  country: z.string().trim().max(64).optional(),
  referralCode: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(MAX_PASSWORD_BYTES),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token"),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Missing verification token"),
});

/**
 * Self-service profile edit. Email is deliberately absent — changing it re-runs
 * verification, which is its own flow. `phone`/`country` accept an empty string
 * so an HTML form can clear a field, and normalise it to null at the edge.
 */
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .max(32, "Phone number is too long")
    .or(z.literal(""))
    .optional(),
  country: z
    .string()
    .trim()
    .max(64, "Country name is too long")
    .or(z.literal(""))
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/* ------------------------------------------------------------- support ----- */

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(160, "Subject is too long"),
  category: z.string().trim().max(40).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a bit more — at least 10 characters")
    .max(4000, "Message is too long"),
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000, "Message is too long"),
});

/* ------------------------------------------------------------ community ----- */

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .max(160, "Title is too long")
    .or(z.literal(""))
    .optional(),
  body: z
    .string()
    .trim()
    .min(2, "Write something — at least 2 characters")
    .max(4000, "Post is too long"),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment").max(2000, "Comment is too long"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/* --------------------------------------------------------------- admin ----- */

/**
 * A KYC decision. Approval carries no reason; a rejection MUST carry one — the
 * member sees it, so a bare "rejected" is not an acceptable answer.
 */
export const kycDecisionSchema = z
  .object({
    decision: z.enum(["VERIFIED", "REJECTED"]),
    reason: z
      .string()
      .trim()
      .max(2000, "Reason is too long")
      .or(z.literal(""))
      .optional(),
  })
  .refine(
    (v) => v.decision !== "REJECTED" || (v.reason ?? "").trim().length >= 3,
    {
      message: "Give a reason for the rejection (at least 3 characters)",
      path: ["reason"],
    },
  );

export type KycDecisionInput = z.infer<typeof kycDecisionSchema>;

/**
 * A member account-status action. The payload names the intent, never the
 * target status — `memberStatusTransition` derives that on the server.
 */
export const memberStatusSchema = z.object({
  action: z.enum(MEMBER_STATUS_ACTIONS),
});

export type MemberStatusInput = z.infer<typeof memberStatusSchema>;

/** Provision a new admin. The password must satisfy the full policy. */
export const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: emailSchema,
  role: z.enum(ADMIN_ROLES),
  password: passwordSchema,
});

/** Update an admin's role and/or active flag. At least one field is required. */
export const updateAdminSchema = z
  .object({
    role: z.enum(ADMIN_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "Nothing to update",
  });

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

/**
 * A site-setting write. Only the envelope is checked here — the value's shape is
 * validated against its definition in `lib/site-settings.ts`, which is also the
 * allowlist that decides whether the key may be written at all.
 */
export const updateSettingSchema = z.object({
  value: z.record(z.string(), z.unknown()),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

/**
 * A staff change to a ticket's status and/or priority. Both are optional, but a
 * request that changes neither is rejected — an empty PATCH would write an audit
 * row recording nothing.
 */
export const updateTicketSchema = z
  .object({
    status: z.enum(SUPPORT_STATUSES).optional(),
    priority: z.enum(SUPPORT_PRIORITIES).optional(),
  })
  .refine((data) => data.status !== undefined || data.priority !== undefined, {
    message: "Nothing to update",
  });

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

/* --------------------------------------------------------------- wallet ----- */

/**
 * A member's withdrawal request. `amount` is a string so the form can send what
 * the user typed; the route parses it to integer cents with `parseAmountToCents`,
 * which rejects sub-cent precision rather than rounding it away.
 */
export const withdrawalRequestSchema = z.object({
  amount: z.string().trim().min(1, "Enter an amount"),
  method: z.enum(PAYOUT_METHODS).default("BANK_TRANSFER"),
  destination: z
    .string()
    .trim()
    .max(120, "Destination is too long")
    .or(z.literal(""))
    .optional(),
  details: z
    .string()
    .trim()
    .max(1000, "Details are too long")
    .or(z.literal(""))
    .optional(),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;

/** A member's deposit intent — the amount they want credited, plus a reference. */
export const depositRequestSchema = z.object({
  amount: z.string().trim().min(1, "Enter an amount"),
  method: z.enum(PAYOUT_METHODS).default("CRYPTO"),
  reference: z
    .string()
    .trim()
    .max(160, "Reference is too long")
    .or(z.literal(""))
    .optional(),
});

export type DepositRequestInput = z.infer<typeof depositRequestSchema>;

/**
 * An operator's decision on a payout. A rejection MUST carry a reason — the
 * member sees it on the returned funds, so a bare "rejected" is not an answer.
 */
export const payoutDecisionSchema = z
  .object({
    action: z.enum(["approve", "reject", "mark_paid"]),
    reason: z
      .string()
      .trim()
      .max(2000, "Reason is too long")
      .or(z.literal(""))
      .optional(),
  })
  .refine((v) => v.action !== "reject" || (v.reason ?? "").trim().length >= 3, {
    message: "Give a reason for the rejection (at least 3 characters)",
    path: ["reason"],
  });

export type PayoutDecisionInput = z.infer<typeof payoutDecisionSchema>;

/** An operator's decision on a deposit. A rejection must carry a reason. */
export const depositDecisionSchema = z
  .object({
    action: z.enum(["confirm", "reject"]),
    reason: z
      .string()
      .trim()
      .max(2000, "Reason is too long")
      .or(z.literal(""))
      .optional(),
  })
  .refine((v) => v.action !== "reject" || (v.reason ?? "").trim().length >= 3, {
    message: "Give a reason for the rejection (at least 3 characters)",
    path: ["reason"],
  });

export type DepositDecisionInput = z.infer<typeof depositDecisionSchema>;

/** First human-readable message from a Zod error. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
