"use server";

import { prisma } from "@/lib/prisma";
import { requireOperator, requireAuth } from "@/lib/auth";
import { logAudit } from "./audit.service";
import type { CreateCommissionRuleInput } from "@/lib/validations/commission";

export async function getActiveRule(agencyId: string, planId: string | null, date: Date) {
  const where: Record<string, unknown> = {
    agencyId,
    effectiveFrom: { lte: date },
    OR: [
      { effectiveTo: null },
      { effectiveTo: { gt: date } },
    ],
  };

  if (planId) {
    where.planId = planId;
  } else {
    where.planId = null;
  }

  return prisma.commissionRule.findFirst({
    where,
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function findApplicableRule(agencyId: string, planId: string | null, date: Date) {
  let rule = null;
  if (planId) {
    rule = await getActiveRule(agencyId, planId, date);
  }
  if (!rule) {
    rule = await getActiveRule(agencyId, null, date);
  }
  return rule;
}

export async function listRulesForAgency(agencyId: string) {
  const session = await requireAuth();
  if (session.user.role === "AGENCY" && session.user.agencyId !== agencyId) {
    throw new Error("Forbidden");
  }

  return prisma.commissionRule.findMany({
    where: { agencyId },
    include: { plan: { select: { code: true, name: true } } },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function createCommissionRule(data: CreateCommissionRuleInput) {
  const session = await requireOperator();

  const rule = await prisma.$transaction(async (tx) => {
    const existingActive = await tx.commissionRule.findFirst({
      where: {
        agencyId: data.agencyId,
        planId: data.planId || null,
        effectiveTo: null,
      },
    });

    if (existingActive) {
      await tx.commissionRule.update({
        where: { id: existingActive.id },
        data: { effectiveTo: data.effectiveFrom },
      });
    }

    return tx.commissionRule.create({
      data: {
        agencyId: data.agencyId,
        planId: data.planId || null,
        commissionType: data.commissionType,
        rate: data.rate,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || null,
        description: data.description,
      },
    });
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "CommissionRule",
    entityId: rule.id,
    metadata: {
      agencyId: data.agencyId,
      planId: data.planId,
      rate: data.rate,
      commissionType: data.commissionType,
    },
  });

  return rule;
}

export async function listAllRules(params: {
  agencyId?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireOperator();
  const { agencyId, page = 1, pageSize = 20 } = params;

  const where: Record<string, unknown> = {};
  if (agencyId) where.agencyId = agencyId;

  const [data, total] = await Promise.all([
    prisma.commissionRule.findMany({
      where,
      include: {
        agency: { select: { code: true, name: true } },
        plan: { select: { code: true, name: true } },
      },
      orderBy: { effectiveFrom: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.commissionRule.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
