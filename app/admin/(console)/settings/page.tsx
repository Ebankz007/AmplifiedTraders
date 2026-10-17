import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_DEFINITIONS } from "@/lib/site-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingForm } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

/**
 * Public-facing site settings.
 *
 * Every key rendered here is on the allowlist in `lib/site-settings.ts` — the API
 * refuses anything else, so this page can only ever write values the rest of the
 * site actually reads. A key that is allowlisted but absent from the database is
 * shown as missing rather than quietly omitted: the seed provisions keys, and a
 * gap should be visible, not invisible.
 */
export default async function AdminSettingsPage() {
  await requireAdminPermission("settings");

  const rows = await prisma.siteSetting.findMany();
  const byKey = new Map(
    rows.map((row) => [row.key, row.value as Record<string, unknown>]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Public-facing copy and contact details. Every save is recorded in the
          audit log with its before and after value.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {SETTING_DEFINITIONS.map((definition) => {
          const value = byKey.get(definition.key);
          return (
            <Card key={definition.key}>
              <CardHeader>
                <CardTitle>{definition.title}</CardTitle>
                <CardDescription>
                  {value === undefined
                    ? "Not provisioned in the database yet."
                    : definition.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {value === undefined ? (
                  <p className="text-sm text-faint">
                    Missing. Run{" "}
                    <code className="font-mono text-muted">pnpm db:seed</code> to
                    provision it.
                  </p>
                ) : (
                  <SettingForm definition={definition} initial={value} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
