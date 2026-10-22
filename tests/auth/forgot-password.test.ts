import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";

/**
 * The password-reset endpoint, and the two properties that actually matter.
 *
 * 1. **No account-existence oracle.** The response must be identical whether
 *    or not the account exists, or the endpoint becomes an account-enumeration
 *    tool for anyone who can reach it.
 * 2. **No fake success.** If this deployment cannot deliver mail, it must say
 *    so instead of telling a member that a link is on its way. A member who
 *    cannot log in, and who is told to check their inbox, waits forever. The
 *    mail adapter was written to report failure honestly; a route that throws
 *    that verdict away puts the lie back.
 *
 * The database and the transport are mocked, so both branches run anywhere -
 * no database, no SMTP, no mail. The real adapter has no implementation yet,
 * so production is always the "unavailable" branch.
 */
const h = vi.hoisted(() => ({
  findUnique: vi.fn(),
  resetCreate: vi.fn(),
  sent: [] as Array<{ to: string }>,
  emailAvailable: true,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: h.findUnique },
    passwordReset: { create: h.resetCreate },
  },
}));

vi.mock("@/lib/notifications/email", () => ({
  emailDeliveryAvailable: () => h.emailAvailable,
  siteOrigin: () => "https://amplifiedtraders.com",
  sendEmail: vi.fn(async (message: { to: string }) => {
    h.sent.push(message);
    return { delivered: true };
  }),
}));

/** A distinct source address per request: the limiter allows 5 per hour per IP. */
function post(email: string, ip: string) {
  return new Request("https://amplifiedtraders.com/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email }),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    h.findUnique.mockReset();
    h.resetCreate.mockReset();
    h.sent.length = 0;
    h.emailAvailable = true;
    h.findUnique.mockResolvedValue(null);
    h.resetCreate.mockResolvedValue({ id: "reset_1" });
  });

  it("never claims a link was sent when this deployment cannot deliver mail", async () => {
    h.emailAvailable = false;

    const res = await POST(post("member@example.test", "10.0.0.1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.emailDelivery).toBe("unavailable");
    expect(body.message).toMatch(/not available/i);
    // It must not say a link is on its way.
    expect(body.message).not.toMatch(/has been sent/i);
    // And it must not touch the database: no token is minted for a mail that
    // cannot leave, and no account is looked up on the way to that answer.
    expect(h.findUnique).not.toHaveBeenCalled();
    expect(h.resetCreate).not.toHaveBeenCalled();
  });

  it("answers existing and unknown accounts identically", async () => {
    h.findUnique.mockResolvedValue({ id: "user_1" });
    const known = await POST(post("known@example.test", "10.0.0.2"));
    const knownBody = await known.json();

    h.findUnique.mockResolvedValue(null);
    const unknown = await POST(post("nobody@example.test", "10.0.0.3"));
    const unknownBody = await unknown.json();

    expect(known.status).toBe(unknown.status);
    expect(knownBody).toEqual(unknownBody);
  });

  it("mints one token and sends one mail, and only for the account that exists", async () => {
    h.findUnique.mockResolvedValue({ id: "user_1" });
    await POST(post("known@example.test", "10.0.0.4"));

    expect(h.resetCreate).toHaveBeenCalledTimes(1);
    expect(h.resetCreate.mock.calls[0][0].data.email).toBe("known@example.test");
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].to).toBe("known@example.test");

    h.findUnique.mockResolvedValue(null);
    await POST(post("nobody@example.test", "10.0.0.5"));

    expect(h.resetCreate).toHaveBeenCalledTimes(1);
    expect(h.sent).toHaveLength(1);
  });

  it("rejects a malformed address before doing anything else", async () => {
    const res = await POST(post("not-an-email", "10.0.0.6"));

    expect(res.status).toBe(400);
    expect(h.findUnique).not.toHaveBeenCalled();
    expect(h.resetCreate).not.toHaveBeenCalled();
  });
});
