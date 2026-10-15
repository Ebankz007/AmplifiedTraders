import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type AuditInput = {
  adminId?: string | null;
  /** Verb, e.g. "user.suspend", "payout.approve". */
  action: string;
  /** Entity type, e.g. "User", "Payout". */
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string | null;
};

/**
 * Append an audit record for a sensitive admin/financial action.
 *
 * Throws on failure — an audit trail that silently drops entries is worse than
 * no trail, because it looks complete. Callers that must not fail on audit
 * should catch explicitly.
 *
 * Pass `client` (the `tx` of a `$transaction` callback) to write the record in
 * the **same** transaction as the change it describes. A mutation that commits
 * while its audit row is lost is precisely the silent gap this table exists to
 * close, so a mutation with side effects should always pass its `tx` here.
 */
export async function recordAudit(
  input: AuditInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: {
      adminId: input.adminId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before,
      after: input.after,
      ip: input.ip ?? null,
    },
  });
}
