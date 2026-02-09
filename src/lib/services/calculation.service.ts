"use server";

import { prisma } from "@/lib/prisma";
import { requireOperator } from "@/lib/auth";
import { logAudit } from "./audit.service";
import { findApplicableRule } from "./commission.service";
import { toDecimal, calculateCommission } from "@/lib/utils/currency";
import { addDays } from "@/lib/utils/date";
import Decimal from "decimal.js";

export async function calculateRevenueShares(options: {
  agencyId?: string;
  periodYear: number;
  periodMonth: number;
}) {
  const session = await requireOperator();

  const periodStart = new Date(options.periodYear, options.periodMonth - 1, 1);
  const periodEnd = new Date(options.periodYear, options.periodMonth, 1);

  const where: Record<string, unknown> = {
    transactionDate: { gte: periodStart, lt: periodEnd },
    paymentStatus: "SUCCESS",
    commissionEvent: null,
  };
  if (options.agencyId) where.agencyId = options.agencyId;

  const sales = await prisma.salesRecord.findMany({
    where,
    include: { agency: { select: { holdPeriodDays: true } } },
  });

  const results: {
    agencyId: string;
    processed: number;
    totalAmount: number;
    errors: string[];
  }[] = [];

  const agencyGroups = new Map<string, typeof sales>();
  for (const sale of sales) {
    const group = agencyGroups.get(sale.agencyId) || [];
    group.push(sale);
    agencyGroups.set(sale.agencyId, group);
  }

  for (const [agencyId, agencySales] of agencyGroups) {
    let processed = 0;
    let totalAmount = new Decimal(0);
    const errors: string[] = [];

    const eventsToCreate: {
      agencyId: string;
      salesRecordId: string;
      commissionRuleId: string;
      saleAmount: number;
      commissionType: "PERCENTAGE" | "FIXED_AMOUNT";
      commissionRate: number;
      agencyAmount: number;
      operatorAmount: number;
      status: "HOLD";
      holdUntil: Date;
      periodYear: number;
      periodMonth: number;
    }[] = [];

    for (const sale of agencySales) {
      const rule = await findApplicableRule(agencyId, sale.planId, sale.transactionDate);
      if (!rule) {
        errors.push(`売上ID ${sale.id}: 適用可能な還元率ルールが見つかりません`);
        continue;
      }

      const saleAmount = toDecimal(sale.saleAmountExTax);
      const rate = toDecimal(rule.rate);
      const agencyAmount = calculateCommission(saleAmount, rate, rule.commissionType, sale.quantity);
      const operatorAmount = saleAmount.minus(agencyAmount);

      const holdDays = sale.agency.holdPeriodDays;
      const holdUntil = addDays(sale.transactionDate, holdDays);

      eventsToCreate.push({
        agencyId,
        salesRecordId: sale.id,
        commissionRuleId: rule.id,
        saleAmount: Number(saleAmount),
        commissionType: rule.commissionType,
        commissionRate: Number(rule.rate),
        agencyAmount: Number(agencyAmount),
        operatorAmount: Number(operatorAmount),
        status: "HOLD",
        holdUntil,
        periodYear: options.periodYear,
        periodMonth: options.periodMonth,
      });

      totalAmount = totalAmount.plus(agencyAmount);
      processed++;
    }

    if (eventsToCreate.length > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const event of eventsToCreate) {
            await tx.commissionEvent.create({ data: event });
          }

          await tx.balance.upsert({
            where: { agencyId },
            create: {
              agencyId,
              holdBalance: Number(totalAmount),
            },
            update: {
              holdBalance: { increment: Number(totalAmount) },
              lastCalculatedAt: new Date(),
            },
          });
        });
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === "P2002") {
          errors.push("一部の売上は既に計算済みのためスキップされました");
          processed = 0;
          totalAmount = new Decimal(0);
        } else {
          throw err;
        }
      }
    }

    results.push({ agencyId, processed, totalAmount: Number(totalAmount), errors });
  }

  await logAudit({
    userId: session.user.id,
    action: "CALCULATE",
    entityType: "CommissionEvent",
    metadata: {
      periodYear: options.periodYear,
      periodMonth: options.periodMonth,
      totalSales: sales.length,
      results: results.map((r) => ({
        agencyId: r.agencyId,
        processed: r.processed,
        totalAmount: r.totalAmount,
        errorCount: r.errors.length,
      })),
    },
  });

  return results;
}

export async function confirmHeldCommissions() {
  const session = await requireOperator();

  const now = new Date();
  const eventsToConfirm = await prisma.commissionEvent.findMany({
    where: {
      status: "HOLD",
      holdUntil: { lte: now },
    },
  });

  const agencyAmounts = new Map<string, Decimal>();
  for (const event of eventsToConfirm) {
    const current = agencyAmounts.get(event.agencyId) || new Decimal(0);
    agencyAmounts.set(event.agencyId, current.plus(toDecimal(event.agencyAmount)));
  }

  await prisma.$transaction(async (tx) => {
    await tx.commissionEvent.updateMany({
      where: {
        status: "HOLD",
        holdUntil: { lte: now },
      },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
      },
    });

    for (const [agencyId, amount] of agencyAmounts) {
      await tx.balance.update({
        where: { agencyId },
        data: {
          holdBalance: { decrement: Number(amount) },
          confirmedBalance: { increment: Number(amount) },
          totalEarned: { increment: Number(amount) },
        },
      });
    }
  });

  await logAudit({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "CommissionEvent",
    metadata: {
      confirmed: eventsToConfirm.length,
      agencyCount: agencyAmounts.size,
    },
  });

  return { confirmed: eventsToConfirm.length };
}

export async function getCalculationSummary(periodYear: number, periodMonth: number) {
  await requireOperator();

  const events = await prisma.commissionEvent.groupBy({
    by: ["agencyId", "status"],
    where: { periodYear, periodMonth },
    _sum: { agencyAmount: true, operatorAmount: true, saleAmount: true },
    _count: true,
  });

  return events;
}
