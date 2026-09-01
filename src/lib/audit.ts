import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(params: {
  adminId?: string | null;
  actor: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        adminId: params.adminId ?? null,
        actor: params.actor,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        before: (params.before ?? undefined) as Prisma.InputJsonValue | undefined,
        after: (params.after ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
