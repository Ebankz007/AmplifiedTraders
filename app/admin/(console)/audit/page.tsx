import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 25;

function pageHref(page: number) {
  return page <= 1 ? "/admin/audit" : `/admin/audit?page=${page}`;
}

/** Render a before/after snapshot compactly; an absent value reads as "—". */
function Snapshot({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-faint">—</span>;
  }
  return (
    <pre className="mt-1 max-w-md overflow-x-auto rounded-md border border-border bg-elevated/60 p-2 text-xs text-muted">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPermission("audit");
  const { page: pageRaw } = await searchParams;

  const requested = Number.parseInt(pageRaw ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [total, entries] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        before: true,
        after: true,
        ip: true,
        createdAt: true,
        admin: { select: { name: true, email: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted">
          {total.toLocaleString("en-US")} recorded action
          {total === 1 ? "" : "s"}, newest first. Every sensitive admin action
          lands here — append-only, never edited.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-faint">
              {page > 1
                ? "Nothing on this page — you may have reached the end of the list."
                : "No admin actions recorded yet."}
            </p>
            {page > 1 && (
              <Link href={pageHref(1)} className="mt-3 inline-block text-sm text-brand">
                Back to the first page
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      When
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Admin
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Action
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Entity
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      IP
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="align-top transition-colors hover:bg-elevated/50"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-faint">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        {entry.admin ? (
                          <>
                            <p className="font-medium text-foreground">
                              {entry.admin.name}
                            </p>
                            <p className="text-xs text-faint">
                              {entry.admin.email}
                            </p>
                          </>
                        ) : (
                          <span className="text-faint">System</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <code className="rounded bg-elevated px-1.5 py-0.5 text-xs text-brand">
                          {entry.action}
                        </code>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <div>{entry.entity}</div>
                        {entry.entityId && (
                          <div className="font-mono text-xs text-faint">
                            {entry.entityId}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-faint">
                        {entry.ip ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <details>
                          <summary className="cursor-pointer text-sm text-brand">
                            Before / after
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                                Before
                              </p>
                              <Snapshot value={entry.before} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                                After
                              </p>
                              <Snapshot value={entry.after} />
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pages > 1 && (
        <nav
          aria-label="Audit pages"
          className="flex items-center justify-between"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-sm text-brand">
              ← Previous
            </Link>
          ) : (
            <span className="text-sm text-faint">← Previous</span>
          )}
          <span className="text-sm text-faint">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-sm text-brand">
              Next →
            </Link>
          ) : (
            <span className="text-sm text-faint">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
