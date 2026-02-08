"use server";

import { prisma } from "@/lib/prisma";
import { requireOperator } from "@/lib/auth";
import { logAudit } from "./audit.service";
import { DEPOSIT_AMOUNT_INC_TAX } from "@/lib/utils/constants";

export async function listDeposits(params: {
  filter?: "all" | "unpaid" | "paid" | "refundable" | "refunded";
  page?: number;
  pageSize?: number;
}) {
  await requireOperator();
  const { filter = "all", page = 1, pageSize = 20 } = params;

  const where: Record<string, unknown> = {};
  if (filter === "unpaid") {
    where.depositPaid = false;
    where.depositRefunded = false;
  } else if (filter === "paid") {
    where.depositPaid = true;
    where.depositRefunded = false;
  } else if (filter === "refunded") {
    where.depositRefunded = true;
  } else if (filter === "refundable") {
    where.depositPaid = true;
    where.depositRefunded = false;
  }

  const [data, total] = await Promise.all([
    prisma.agency.findMany({
      where,
      include: {
        balance: { select: { confirmedBalance: true, totalEarned: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agency.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function markDepositPaid(agencyId: string) {
  const session = await requireOperator();

  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
  if (agency.depositPaid) {
    throw new Error("既にデポジット入金済みです");
  }

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: { depositPaid: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Agency",
    entityId: agencyId,
    changes: { depositPaid: { old: false, new: true } },
    metadata: { section: "deposit", amount: Number(agency.depositAmount) },
  });

  return updated;
}

export async function refundDeposit(agencyId: string) {
  const session = await requireOperator();

  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });

  if (!agency.depositPaid) {
    throw new Error("デポジットが未入金のため返金できません");
  }
  if (agency.depositRefunded) {
    throw new Error("既にデポジット返金済みです");
  }

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: { depositRefunded: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Agency",
    entityId: agencyId,
    changes: { depositRefunded: { old: false, new: true } },
    metadata: { section: "deposit", refundAmount: Number(agency.depositAmount) },
  });

  return updated;
}

export async function updateDepositAmount(agencyId: string, amount: number) {
  const session = await requireOperator();
  const before = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: { depositAmount: amount },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Agency",
    entityId: agencyId,
    changes: { depositAmount: { old: Number(before.depositAmount), new: amount } },
    metadata: { section: "deposit" },
  });

  return updated;
}

export async function getDepositSummary() {
  await requireOperator();

  const [totalAgencies, paidCount, unpaidCount, refundedCount] = await Promise.all([
    prisma.agency.count(),
    prisma.agency.count({ where: { depositPaid: true, depositRefunded: false } }),
    prisma.agency.count({ where: { depositPaid: false, depositRefunded: false } }),
    prisma.agency.count({ where: { depositRefunded: true } }),
  ]);

  const paidAgencies = await prisma.agency.findMany({
    where: { depositPaid: true, depositRefunded: false },
    select: { depositAmount: true },
  });
  const refundedAgencies = await prisma.agency.findMany({
    where: { depositRefunded: true },
    select: { depositAmount: true },
  });

  const totalDepositsHeld = paidAgencies.reduce((sum, a) => sum + Number(a.depositAmount), 0);
  const totalRefunded = refundedAgencies.reduce((sum, a) => sum + Number(a.depositAmount), 0);

  return {
    totalAgencies,
    paidCount,
    unpaidCount,
    refundedCount,
    totalDepositsHeld,
    totalRefunded,
  };
}

export async function toggleDepositRefundable(agencyId: string, refundable: boolean) {
  const session = await requireOperator();

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: { depositRefundable: refundable },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entityType: "Agency",
    entityId: agencyId,
    changes: { depositRefundable: { old: !refundable, new: refundable } },
    metadata: { section: "deposit" },
  });

  return updated;
}
