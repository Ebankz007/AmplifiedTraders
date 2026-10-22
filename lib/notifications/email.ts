/**
 * Email adapter — Phase 7 stub.
 *
 * There is no SMTP transport yet (nodemailer is not a dependency). This module
 * is deliberately honest about that: in development it logs the message so the
 * verification/reset links are usable, and in production it reports failure
 * rather than pretending to have sent. **No fake success in production.**
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailResult = {
  delivered: boolean;
  reason?: string;
};

/**
 * Is a real transport behind `sendEmail`?
 *
 * `SMTP_HOST` alone does not answer this: the adapter has no implementation
 * yet, so a configured host still delivers nothing. The flag below is the
 * truth about the code, not about the environment - flip it when a transport
 * lands. `sendEmail` and `emailDeliveryAvailable` are derived from the same
 * flag so the two can never disagree about what this deployment can do.
 */
const TRANSPORT_IMPLEMENTED = false;

/**
 * Global capability: can this deployment deliver email at all?
 *
 * This is deliberately a property of the deployment and NOT of the recipient.
 * Callers that need to answer a member must be able to say "email is not
 * available here" without revealing whether a given account exists, so this
 * function must never take an email address.
 */
export function emailDeliveryAvailable(): boolean {
  return TRANSPORT_IMPLEMENTED && Boolean(process.env.SMTP_HOST);
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`,
      );
      return { delivered: false, reason: "not_configured_dev_logged" };
    }
    console.warn(
      `[email] SMTP not configured — dropped message to ${message.to}`,
    );
    return { delivered: false, reason: "not_configured" };
  }

  // Phase 7: implement the real transport (nodemailer) behind this interface.
  return { delivered: false, reason: "transport_not_implemented" };
}

/** Absolute site origin for links in emails. */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3600";
}
