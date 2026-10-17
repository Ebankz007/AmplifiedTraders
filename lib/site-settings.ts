/**
 * The `SiteSetting` allowlist, editor shapes, and seed defaults.
 *
 * One module feeds four consumers: the seed (which provisions the keys), the
 * admin page (which renders an editor per definition), the settings API (which
 * refuses any key not listed here), and the guard test that asserts they agree.
 * A second copy of this list is a copy that drifts (lessons 190/199).
 *
 * Settings are **fail-closed**: a key that is not listed here cannot be written
 * by the settings API, even by a superadmin. Arbitrary-key writes would let an
 * admin create settings nothing reads, and would make the audit trail
 * meaningless — there would be no schema to diff against.
 *
 * The seed owns the *keys*; the console only ever edits their **values**. The
 * API updates, never upserts, so a key cannot come into existence except
 * through the seed.
 */

export type SettingField = {
  name: string;
  label: string;
  /** Long-form copy gets a textarea rather than a single-line input. */
  multiline?: boolean;
};

export type SettingDefinition = {
  key: string;
  title: string;
  description: string;
  /** `fields` edits known string properties; `json` edits the whole value. */
  mode: "fields" | "json";
  fields?: readonly SettingField[];
};

export type SettingValue = Record<string, unknown>;

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: "site.identity",
    title: "Identity",
    description: "The name and domain shown across the site.",
    mode: "fields",
    fields: [
      { name: "name", label: "Site name" },
      { name: "shortName", label: "Short name" },
      { name: "tagline", label: "Tagline" },
      { name: "domain", label: "Domain" },
    ],
  },
  {
    key: "site.contact",
    title: "Contact",
    description: "How members and visitors reach you.",
    mode: "fields",
    fields: [
      { name: "email", label: "Contact email" },
      { name: "supportEmail", label: "Support email" },
      { name: "phone", label: "Phone" },
      { name: "address", label: "Address", multiline: true },
    ],
  },
  {
    key: "site.compliance",
    title: "Compliance copy",
    description:
      "The risk and custody disclosures shown to visitors. Editing these is regulatory-adjacent — every save is recorded in the audit log.",
    mode: "fields",
    fields: [
      { name: "riskNotice", label: "Risk notice", multiline: true },
      {
        name: "custodyDisclosure",
        label: "Custody disclosure",
        multiline: true,
      },
    ],
  },
  {
    key: "site.social",
    title: "Social links",
    description:
      'Social profiles shown in the footer, as JSON. Shape: { "links": [{ "label": "X", "url": "https://…" }] }.',
    mode: "json",
  },
];

/**
 * The values the seed writes when a key is **absent**. An existing row is never
 * overwritten (see `prisma/seed.ts`), so a default changed here reaches a fresh
 * database only — never a live one. That is deliberate: `db:seed` must not
 * revert copy an admin has edited (lesson 191).
 */
export const SETTING_DEFAULTS: Readonly<Record<string, SettingValue>> = {
  "site.identity": {
    name: "Amplified Traders",
    shortName: "Amplified",
    tagline: "Your Trading. Your Network. Amplified.",
    domain: "amplifiedtraders.com",
  },
  "site.contact": {
    email: "hello@amplifiedtraders.com",
    supportEmail: "support@amplifiedtraders.com",
    phone: "",
    address: "",
  },
  "site.compliance": {
    riskNotice:
      "Trading involves substantial risk and is not suitable for every investor. " +
      "Past performance is not indicative of future results. Amplified Traders is a " +
      "software and community platform: it does not hold client funds and does not " +
      "provide investment advice.",
    custodyDisclosure:
      "Amplified Traders never takes custody of client funds. Copying is executed " +
      "manually on your own broker account.",
  },
  "site.social": { links: [] },
};

const BY_KEY = new Map(SETTING_DEFINITIONS.map((d) => [d.key, d]));

export function isAllowedSettingKey(key: string): boolean {
  return BY_KEY.has(key);
}

export function settingDefinition(key: string): SettingDefinition | null {
  return BY_KEY.get(key) ?? null;
}

/** Cap a single setting payload so a superadmin cannot store megabytes. */
export const MAX_SETTING_JSON_CHARS = 20_000;

export type SettingValidation =
  | { ok: true; value: SettingValue }
  | { ok: false; error: string };

/**
 * Validate a candidate value against its definition. Pure, so the route and the
 * tests exercise the same rule.
 *
 * `fields` mode requires every declared field to be **text** — otherwise a
 * crafted request could store `{"name": 123}` and the public site would render a
 * number where a name belongs. Unknown keys are preserved rather than stripped:
 * the editor starts from the live value, so a field added to a definition later
 * can be saved without a migration, and a key the UI does not render is never
 * silently destroyed.
 */
export function validateSettingValue(
  definition: SettingDefinition,
  value: unknown,
): SettingValidation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "Value must be a JSON object." };
  }

  const record = value as SettingValue;

  const size = JSON.stringify(record).length;
  if (size > MAX_SETTING_JSON_CHARS) {
    return {
      ok: false,
      error: `Value is too large (${size} characters; the limit is ${MAX_SETTING_JSON_CHARS}).`,
    };
  }

  if (definition.mode === "fields") {
    for (const field of definition.fields ?? []) {
      if (typeof record[field.name] !== "string") {
        return { ok: false, error: `"${field.label}" must be text.` };
      }
    }
  }

  return { ok: true, value: record };
}
