import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "@/lib/utils";

describe("formatDate", () => {
  it("formats a Date", () => {
    expect(formatDate(new Date("2026-10-14T09:30:00Z"))).toMatch(/2026/);
  });

  it("accepts an ISO string", () => {
    expect(formatDate("2026-10-14T09:30:00Z")).toBe(
      formatDate(new Date("2026-10-14T09:30:00Z")),
    );
  });

  it("renders a placeholder rather than throwing on nothing", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("renders a placeholder rather than throwing on an invalid date", () => {
    expect(formatDate("not a date")).toBe("—");
    expect(formatDate(new Date("nope"))).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("includes the time", () => {
    const out = formatDateTime(new Date("2026-10-14T09:30:00Z"));
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });

  it("renders a placeholder rather than throwing on nothing", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not a date")).toBe("—");
  });
});

/**
 * `toLocaleDateString` and `toLocaleTimeString` are typed as taking
 * `Intl.DateTimeFormatOptions` — the same type `toLocaleString` takes. So
 * TypeScript accepts `{ hour, minute }` and `{ timeStyle }` on them, and both
 * throw `TypeError: Invalid option` at render time, in production, on a page
 * that builds and typechecks cleanly. Two member pages shipped 500s that way.
 *
 * The helpers in `lib/utils.ts` use explicit `Intl.DateTimeFormat` parts and
 * cannot take those options, so the rule is: format dates through them.
 */
const FORBIDDEN_KEYS = [
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "timeStyle",
  "hour12",
  "timeZoneName",
  "dayPeriod",
];

const SCAN_DIRS = ["app", "components"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Every `<method>(...)` call in `src`, with its balanced argument text. */
function callsOf(src: string, method: string): { text: string; index: number }[] {
  const needle = `.${method}(`;
  const found: { text: string; index: number }[] = [];
  let start = src.indexOf(needle);

  while (start !== -1) {
    let depth = 0;
    let i = start + needle.length - 1;
    for (; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    found.push({ text: src.slice(start, i + 1), index: start });
    start = src.indexOf(needle, i + 1);
  }

  return found;
}

describe("date formatting stays on the helpers", () => {
  it("never passes time options to toLocaleDateString / toLocaleTimeString", () => {
    const root = process.cwd();
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(root, dir))) {
        const src = readFileSync(file, "utf8");
        for (const method of ["toLocaleDateString", "toLocaleTimeString"]) {
          for (const call of callsOf(src, method)) {
            const args = call.text.slice(call.text.indexOf("(") + 1);
            const bad = FORBIDDEN_KEYS.filter((key) =>
              new RegExp(`\\b${key}\\s*:`).test(args),
            );
            if (bad.length > 0) {
              const line = src.slice(0, call.index).split("\n").length;
              offenders.push(
                `${relative(root, file)}:${line} ${method} with ${bad.join(", ")}`,
              );
            }
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
