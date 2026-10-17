import { describe, expect, it } from "vitest";
import { memberStatusTransition } from "@/lib/member-status";
import { memberStatusSchema } from "@/lib/validators";

describe("memberStatusTransition", () => {
  it("suspends an active account", () => {
    expect(memberStatusTransition("SUSPEND", "ACTIVE", true)).toEqual({
      ok: true,
      status: "SUSPENDED",
    });
  });

  it("suspends a pending account", () => {
    expect(memberStatusTransition("SUSPEND", "PENDING", false)).toEqual({
      ok: true,
      status: "SUSPENDED",
    });
  });

  it("refuses to suspend an already-suspended account", () => {
    const result = memberStatusTransition("SUSPEND", "SUSPENDED", true);
    expect(result.ok).toBe(false);
  });

  it("reinstates a verified account to ACTIVE", () => {
    expect(memberStatusTransition("REINSTATE", "SUSPENDED", true)).toEqual({
      ok: true,
      status: "ACTIVE",
    });
  });

  it("reinstates an unverified account to PENDING, never ACTIVE", () => {
    // The invariant that matters: reinstatement must not launder an unverified
    // account into good standing.
    expect(memberStatusTransition("REINSTATE", "SUSPENDED", false)).toEqual({
      ok: true,
      status: "PENDING",
    });
  });

  it("refuses to reinstate an account that is not suspended", () => {
    expect(memberStatusTransition("REINSTATE", "ACTIVE", true).ok).toBe(false);
    expect(memberStatusTransition("REINSTATE", "PENDING", false).ok).toBe(false);
  });
});

describe("memberStatusSchema", () => {
  it("accepts the two intents", () => {
    expect(memberStatusSchema.safeParse({ action: "SUSPEND" }).success).toBe(true);
    expect(memberStatusSchema.safeParse({ action: "REINSTATE" }).success).toBe(
      true,
    );
  });

  it("rejects a raw target status (the client names intent, not outcome)", () => {
    expect(memberStatusSchema.safeParse({ action: "ACTIVE" }).success).toBe(false);
    expect(memberStatusSchema.safeParse({ action: "SUSPENDED" }).success).toBe(
      false,
    );
    expect(memberStatusSchema.safeParse({}).success).toBe(false);
  });
});
