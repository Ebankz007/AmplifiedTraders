import { describe, expect, it } from "vitest";
import {
  MAX_SETTING_JSON_CHARS,
  SETTING_DEFAULTS,
  SETTING_DEFINITIONS,
  isAllowedSettingKey,
  settingDefinition,
  validateSettingValue,
} from "@/lib/site-settings";
import { updateSettingSchema } from "@/lib/validators";

describe("the setting allowlist", () => {
  it("lists each key exactly once", () => {
    const keys = SETTING_DEFINITIONS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("agrees with the seed defaults, both ways", () => {
    // The seed provisions the keys and the API refuses any key it does not know.
    // If the two lists drift, a key becomes either unwritable or unprovisionable
    // — and the failure is silent until someone edits that setting.
    const defined = new Set(SETTING_DEFINITIONS.map((d) => d.key));
    const seeded = new Set(Object.keys(SETTING_DEFAULTS));

    for (const key of defined) expect(seeded.has(key)).toBe(true);
    for (const key of seeded) expect(defined.has(key)).toBe(true);
  });

  it("accepts a listed key and refuses anything else", () => {
    for (const definition of SETTING_DEFINITIONS) {
      expect(isAllowedSettingKey(definition.key)).toBe(true);
    }
    for (const key of ["site.secrets", "site.identity ", "", "SITE.IDENTITY"]) {
      expect(isAllowedSettingKey(key)).toBe(false);
    }
  });

  it("resolves a definition by key, and null for an unknown one", () => {
    expect(settingDefinition("site.identity")?.mode).toBe("fields");
    expect(settingDefinition("site.nope")).toBeNull();
  });

  it("gives every fields-mode definition fields to validate", () => {
    // A fields-mode definition with no fields would accept any object at all —
    // the mode's whole guarantee, silently absent.
    for (const definition of SETTING_DEFINITIONS) {
      if (definition.mode === "fields") {
        expect((definition.fields ?? []).length).toBeGreaterThan(0);
      } else {
        expect(definition.fields).toBeUndefined();
      }
    }
  });

  it("seeds a value its own validator accepts", () => {
    // Ties the seed to the API: a default that fails validation would ship a
    // setting no admin could ever re-save.
    for (const definition of SETTING_DEFINITIONS) {
      const seedValue = SETTING_DEFAULTS[definition.key];
      expect(validateSettingValue(definition, seedValue)).toEqual({
        ok: true,
        value: seedValue,
      });
    }
  });

  it("seeds every declared field as text", () => {
    for (const definition of SETTING_DEFINITIONS) {
      for (const field of definition.fields ?? []) {
        expect(typeof SETTING_DEFAULTS[definition.key][field.name]).toBe(
          "string",
        );
      }
    }
  });
});

describe("validateSettingValue", () => {
  const identity = settingDefinition("site.identity")!;
  const social = settingDefinition("site.social")!;

  const validIdentity = {
    name: "Amplified Traders",
    shortName: "Amplified",
    tagline: "Your Trading. Your Network. Amplified.",
    domain: "amplifiedtraders.com",
  };

  it("accepts a well-formed fields-mode value", () => {
    expect(validateSettingValue(identity, validIdentity)).toEqual({
      ok: true,
      value: validIdentity,
    });
  });

  it("refuses a non-object", () => {
    for (const value of ["text", 7, null, true, ["a"]]) {
      expect(validateSettingValue(identity, value).ok).toBe(false);
    }
  });

  it("refuses a fields-mode value with a missing field", () => {
    const { tagline: _drop, ...partial } = validIdentity;
    expect(validateSettingValue(identity, partial).ok).toBe(false);
  });

  it("refuses a fields-mode field that is not text", () => {
    expect(
      validateSettingValue(identity, { ...validIdentity, name: 123 }).ok,
    ).toBe(false);
    expect(
      validateSettingValue(identity, { ...validIdentity, tagline: null }).ok,
    ).toBe(false);
  });

  it("keeps keys the definition does not render", () => {
    // The editor starts from the live value, so a key the UI does not know about
    // must survive a save rather than be silently destroyed.
    const result = validateSettingValue(identity, {
      ...validIdentity,
      future: "kept",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.future).toBe("kept");
  });

  it("accepts an arbitrary object in json mode", () => {
    const value = { links: [{ label: "X", url: "https://x.com" }] };
    expect(validateSettingValue(social, value)).toEqual({ ok: true, value });
  });

  it("refuses a non-object even in json mode", () => {
    expect(validateSettingValue(social, "nope").ok).toBe(false);
    expect(validateSettingValue(social, []).ok).toBe(false);
  });

  it("refuses a payload past the size cap", () => {
    const huge = { blob: "x".repeat(MAX_SETTING_JSON_CHARS) };
    const result = validateSettingValue(social, huge);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too large/i);
  });
});

describe("updateSettingSchema", () => {
  it("accepts a value envelope", () => {
    expect(
      updateSettingSchema.safeParse({ value: { name: "Amplified" } }).success,
    ).toBe(true);
  });

  it("rejects a missing or non-object value", () => {
    expect(updateSettingSchema.safeParse({}).success).toBe(false);
    expect(updateSettingSchema.safeParse({ value: "text" }).success).toBe(false);
    expect(updateSettingSchema.safeParse({ value: [1, 2] }).success).toBe(false);
  });
});
