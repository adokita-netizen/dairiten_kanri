"use server";

import { prisma } from "@/lib/prisma";
import { requireOperator, requireAuth } from "@/lib/auth";
import { logAudit } from "./audit.service";
import { toDecimal, calculateTax } from "@/lib/utils/currency";
import { salesRowSchema } from "@/lib/validations/sales";
import Papa from "papaparse";

export async function listSalesRecords(params: {
  agencyId?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const session = await requireAuth();
  const { page = 1, pageSize = 20, status, dateFrom, dateTo } = params;
  let { agencyId } = params;

  if (session.user.role === "AGENCY") {
    agencyId = session.user.agencyId!;
  }

  const where: Record<string, unknown> = {};
  if (agencyId) where.agencyId = agencyId;
  if (status) where.paymentStatus = status;
  if (dateFrom || dateTo) {
    where.transactionDate = {};
    if (dateFrom) (where.transactionDate as Record<string, unknown>).gte = dateFrom;
    if (dateTo) (where.transactionDate as Record<string, unknown>).lte = dateTo;
  }

  const [data, total] = await Promise.all([
    prisma.salesRecord.findMany({
      where,
      include: {
        agency: { select: { code: true, name: true } },
        plan: { select: { code: true, name: true } },
        commissionEvent: {
          select: {
            status: true,
            commissionRate: true,
            agencyAmount: true,
            operatorAmount: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesRecord.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function importSalesCSV(csvContent: string) {
  const session = await requireOperator();
  const userId = session.user.id;

  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const batch = await prisma.importBatch.create({
    data: {
      fileName: "csv-import",
      uploadedBy: userId,
      totalRows: parsed.data.length,
    },
  });

  const errors: { row: number; message: string }[] = [];
  const validRecords: {
    agencyId: string;
    planId: string | null;
    transactionDate: Date;
    saleAmountExTax: number;
    saleAmountIncTax: number;
    taxAmount: number;
    quantity: number;
    customerName: string | undefined;
    customerRef: string | undefined;
    contractId: string | undefined;
    externalId: string | undefined;
    source: string;
    importBatchId: string;
  }[] = [];

  const agencies = await prisma.agency.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true },
  });
  const agencyMap = new Map(agencies.map((a) => [a.code, a.id]));

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });
  const planMap = new Map(plans.map((p) => [p.code, p.id]));

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;
    const result = salesRowSchema.safeParse(row);

    if (!result.success) {
      errors.push({ row: i + 1, message: result.error.issues.map((e) => e.message).join(", ") });
      continue;
    }

    const agencyId = agencyMap.get(result.data.agencyCode);
    if (!agencyId) {
      errors.push({ row: i + 1, message: `代理店コード ${result.data.agencyCode} が見つかりません` });
      continue;
    }

    let planId: string | null = null;
    if (result.data.planCode) {
      planId = planMap.get(result.data.planCode) || null;
      if (!planId) {
        errors.push({ row: i + 1, message: `プランコード ${result.data.planCode} が見つかりません` });
        continue;
      }
    }

    const amountExTax = toDecimal(result.data.saleAmountExTax);
    const { taxAmount, amountIncTax } = calculateTax(amountExTax, result.data.taxRate);

    validRecords.push({
      agencyId,
      planId,
      transactionDate: new Date(result.data.transactionDate),
      saleAmountExTax: Number(amountExTax),
      saleAmountIncTax: Number(amountIncTax),
      taxAmount: Number(taxAmount),
      quantity: result.data.quantity,
      customerName: result.data.customerName,
      customerRef: result.data.customerRef,
      contractId: result.data.contractId,
      externalId: result.data.externalId || undefined,
      source: "csv",
      importBatchId: batch.id,
    });
  }

  let successCount = 0;
  if (validRecords.length > 0) {
    const result = await prisma.salesRecord.createMany({
      data: validRecords.map((r) => ({
        ...r,
        externalId: r.externalId || null,
      })),
      skipDuplicates: true,
    });
    successCount = result.count;
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      successRows: successCount,
      errorRows: errors.length,
      status: "completed",
      errors: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
    },
  });

  await logAudit({
    userId,
    action: "IMPORT",
    entityType: "SalesRecord",
    entityId: batch.id,
    metadata: {
      totalRows: parsed.data.length,
      successRows: successCount,
      errorRows: errors.length,
    },
  });

  return {
    batchId: batch.id,
    total: parsed.data.length,
    success: successCount,
    errors,
  };
}

export async function invalidateSalesRecord(salesRecordId: string, reason: string) {
  const session = await requireOperator();

  await prisma.$transaction(async (tx) => {
    await tx.salesRecord.update({
      where: { id: salesRecordId },
      data: { paymentStatus: "REFUNDED" },
    });

    const event = await tx.commissionEvent.findUnique({
      where: { salesRecordId },
    });

    if (event && event.status !== "INVALIDATED") {
      const wasConfirmed = event.status === "CONFIRMED";

      await tx.commissionEvent.update({
        where: { id: event.id },
        data: {
          status: "INVALIDATED",
          invalidatedAt: new Date(),
          invalidReason: reason,
        },
      });

      if (wasConfirmed) {
        await tx.balance.update({
          where: { agencyId: event.agencyId },
          data: {
            confirmedBalance: { decrement: event.agencyAmount },
            totalEarned: { decrement: event.agencyAmount },
          },
        });
      } else if (event.status === "HOLD") {
        await tx.balance.update({
          where: { agencyId: event.agencyId },
          data: {
            holdBalance: { decrement: event.agencyAmount },
          },
        });
      }
    }
  });

  await logAudit({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "SalesRecord",
    entityId: salesRecordId,
    metadata: { reason },
  });
}

export async function getSalesSummary(agencyId?: string) {
  const session = await requireAuth();
  if (session.user.role === "AGENCY") {
    agencyId = session.user.agencyId!;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: Record<string, unknown> = {
    paymentStatus: "SUCCESS",
    transactionDate: { gte: monthStart },
  };
  if (agencyId) where.agencyId = agencyId;

  const [monthlyRecords, totalRecords] = await Promise.all([
    prisma.salesRecord.aggregate({
      where,
      _sum: { saleAmountExTax: true },
      _count: true,
    }),
    prisma.salesRecord.aggregate({
      where: {
        paymentStatus: "SUCCESS",
        ...(agencyId ? { agencyId } : {}),
      },
      _sum: { saleAmountExTax: true },
      _count: true,
    }),
  ]);

  return {
    monthlyAmount: Number(monthlyRecords._sum.saleAmountExTax || 0),
    monthlyCount: monthlyRecords._count,
    totalAmount: Number(totalRecords._sum.saleAmountExTax || 0),
    totalCount: totalRecords._count,
  };
}
