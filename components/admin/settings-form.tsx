"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/http";
import { FormError, FormNotice } from "@/components/auth/form-field";
import type { SettingDefinition } from "@/lib/site-settings";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-border bg-elevated px-3.5 text-sm text-foreground transition-colors placeholder:text-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/25";

/**
 * One setting, one form.
 *
 * `fields` mode edits known string properties and starts from the live value, so
 * a key this form does not render is never silently dropped. `json` mode edits
 * the whole value and refuses to save invalid JSON rather than discarding it.
 */
export function SettingForm({
  definition,
  initial,
}: {
  definition: SettingDefinition;
  initial: Record<string, unknown>;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const field of definition.fields ?? []) {
      const value = initial[field.name];
      seed[field.name] =
        typeof value === "string"
          ? value
          : value == null
            ? ""
            : JSON.stringify(value);
    }
    return seed;
  });
  const [json, setJson] = useState(() =>
    definition.mode === "json" ? JSON.stringify(initial, null, 2) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function clear() {
    setError(null);
    setNotice(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    clear();

    let value: Record<string, unknown>;

    if (definition.mode === "json") {
      try {
        const parsed: unknown = JSON.parse(json);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error("not an object");
        }
        value = parsed as Record<string, unknown>;
      } catch {
        setSaving(false);
        setError(
          "That is not valid JSON. Fix it and try again — nothing was saved.",
        );
        return;
      }
    } else {
      // Start from the live value so keys this form does not render survive.
      value = { ...initial };
      for (const field of definition.fields ?? []) {
        value[field.name] = fields[field.name] ?? "";
      }
    }

    const result = await patchJson(`/api/admin/settings/${definition.key}`, {
      value,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {definition.mode === "json" ? (
        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Value (JSON)
          </span>
          <textarea
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              clear();
            }}
            spellCheck={false}
            rows={8}
            className={`${INPUT_CLASS} py-2.5 font-mono`}
          />
        </label>
      ) : (
        <div className="space-y-4">
          {(definition.fields ?? []).map((field) => (
            <label key={field.name} className="block">
              <span className="text-sm font-medium text-foreground">
                {field.label}
              </span>
              {field.multiline ? (
                <textarea
                  value={fields[field.name] ?? ""}
                  onChange={(e) => {
                    setFields((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }));
                    clear();
                  }}
                  rows={5}
                  className={`${INPUT_CLASS} py-2.5`}
                />
              ) : (
                <input
                  type="text"
                  value={fields[field.name] ?? ""}
                  onChange={(e) => {
                    setFields((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }));
                    clear();
                  }}
                  className={`${INPUT_CLASS} h-11`}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <FormError message={error} />
      <FormNotice message={notice} />

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : `Save ${definition.title.toLowerCase()}`}
      </button>
    </form>
  );
}
