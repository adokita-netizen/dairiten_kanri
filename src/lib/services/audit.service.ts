"use server";

import { prisma } from "@/lib/prisma";
import { computeChanges } from "@/lib/utils/changes";

export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "EXPORT"
  | "CALCULATE"
  | "IMPORT"
  | "PAYOUT";

export { computeChanges };

export async function logAudit(params: {
  userId: string | null;
  action: AuditActionType;
  entityType: string;
  entityId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes ? JSON.parse(JSON.stringify(params.changes)) : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
    },
  });
}

export async function getAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditActionType;
  page?: number;
  pageSize?: number;
}) {
  const { entityType, entityId, userId, action, page = 1, pageSize = 20 } = params;
  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
