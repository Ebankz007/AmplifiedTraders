import { describe, expect, it } from "vitest";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  STATUS_AFTER_STAFF_REPLY,
  canStaffReply,
  categoryLabel,
  isOpenTicket,
} from "@/lib/support";
import { createTicketSchema, updateTicketSchema } from "@/lib/validators";
import {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/lib/generated/prisma/enums";

describe("support vocabulary", () => {
  it("labels every category and nothing else", () => {
    expect(Object.keys(SUPPORT_CATEGORY_LABELS).sort()).toEqual(
      [...SUPPORT_CATEGORIES].sort(),
    );
    for (const category of SUPPORT_CATEGORIES) {
      expect(SUPPORT_CATEGORY_LABELS[category].length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate categories", () => {
    expect(new Set(SUPPORT_CATEGORIES).size).toBe(SUPPORT_CATEGORIES.length);
  });

  it("renders a known category as its label, not its enum name", () => {
    expect(categoryLabel("GENERAL")).toBe("General");
    expect(categoryLabel("COPY_TRADING")).toBe("Copy trading");
  });

  it("renders an unknown category as something readable, never the raw enum", () => {
    // `category` is a free string in the schema, so a value written by an older
    // build must still render as words rather than `SOMETHING_NEW`.
    expect(categoryLabel("SOMETHING_NEW")).toBe("something new");
    expect(categoryLabel("SOMETHING_NEW")).not.toContain("_");
  });
});

describe("support status and priority lists", () => {
  // The vocabulary and the database enum are two descriptions of one thing. If
  // they drift, the UI offers a value the schema rejects (lesson 210).
  it("matches the generated status enum in both directions", () => {
    const fromEnum = Object.values(SupportTicketStatus).sort();
    expect([...SUPPORT_STATUSES].sort()).toEqual(fromEnum);
    expect(Object.keys(SUPPORT_STATUS_LABELS).sort()).toEqual(fromEnum);
  });

  it("matches the generated priority enum in both directions", () => {
    const fromEnum = Object.values(SupportTicketPriority).sort();
    expect([...SUPPORT_PRIORITIES].sort()).toEqual(fromEnum);
    expect(Object.keys(SUPPORT_PRIORITY_LABELS).sort()).toEqual(fromEnum);
  });

  it("gives every status and priority a non-empty label", () => {
    for (const status of SUPPORT_STATUSES) {
      expect(SUPPORT_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
    for (const priority of SUPPORT_PRIORITIES) {
      expect(SUPPORT_PRIORITY_LABELS[priority].length).toBeGreaterThan(0);
    }
  });
});

describe("ticket rules", () => {
  it("treats only OPEN and PENDING as open", () => {
    expect(isOpenTicket("OPEN")).toBe(true);
    expect(isOpenTicket("PENDING")).toBe(true);
    expect(isOpenTicket("RESOLVED")).toBe(false);
    expect(isOpenTicket("CLOSED")).toBe(false);
  });

  it("lets staff reply to everything except CLOSED", () => {
    for (const status of SUPPORT_STATUSES) {
      expect(canStaffReply(status)).toBe(status !== "CLOSED");
    }
  });

  it("leaves the ticket open and replyable after a staff reply", () => {
    // If a staff reply moved the ticket somewhere `canStaffReply` refuses, the
    // reply would close the door behind it and the member could never answer.
    expect(canStaffReply(STATUS_AFTER_STAFF_REPLY)).toBe(true);
    expect(isOpenTicket(STATUS_AFTER_STAFF_REPLY)).toBe(true);
  });
});

describe("updateTicketSchema", () => {
  it("accepts a status on its own", () => {
    expect(updateTicketSchema.safeParse({ status: "RESOLVED" }).success).toBe(
      true,
    );
  });

  it("accepts a priority on its own", () => {
    expect(updateTicketSchema.safeParse({ priority: "URGENT" }).success).toBe(
      true,
    );
  });

  it("accepts both at once", () => {
    expect(
      updateTicketSchema.safeParse({ status: "CLOSED", priority: "LOW" })
        .success,
    ).toBe(true);
  });

  it("rejects a patch that changes nothing", () => {
    // An empty PATCH would write an audit row recording nothing.
    expect(updateTicketSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown status or priority", () => {
    expect(updateTicketSchema.safeParse({ status: "ARCHIVED" }).success).toBe(
      false,
    );
    expect(updateTicketSchema.safeParse({ priority: "CRITICAL" }).success).toBe(
      false,
    );
  });

  it("accepts every status and priority the vocabulary defines", () => {
    for (const status of SUPPORT_STATUSES) {
      expect(updateTicketSchema.safeParse({ status }).success).toBe(true);
    }
    for (const priority of SUPPORT_PRIORITIES) {
      expect(updateTicketSchema.safeParse({ priority }).success).toBe(true);
    }
  });
});

describe("member ticket form agrees with the API", () => {
  it("accepts every category the form offers", () => {
    // The form renders `SUPPORT_CATEGORIES`; the API validates with
    // `createTicketSchema`. If the two disagree, a member picks an option and
    // the server rejects it.
    for (const category of SUPPORT_CATEGORIES) {
      const parsed = createTicketSchema.safeParse({
        subject: "Withdrawal still pending",
        category,
        body: "It has been pending for two days now.",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("accepts every priority the form offers", () => {
    for (const priority of SUPPORT_PRIORITIES) {
      const parsed = createTicketSchema.safeParse({
        subject: "Withdrawal still pending",
        priority,
        body: "It has been pending for two days now.",
      });
      expect(parsed.success).toBe(true);
    }
  });
});
