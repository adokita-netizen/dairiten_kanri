"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "./audit.service";
import Papa from "papaparse";

export async function exportSalesCSV(params: {
  agencyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const session = await requireAuth();
  let { agencyId } = params;

  if (session.user.role === "AGENCY") {
    agencyId = session.user.agencyId!;
  }

  const where: Record<string, unknown> = {};
  if (agencyId) where.agencyId = agencyId;
  if (params.dateFrom || params.dateTo) {
    where.transactionDate = {};
    if (params.dateFrom) (where.transactionDate as Record<string, unknown>).gte = params.dateFrom;
    if (params.dateTo) (where.transactionDate as Record<string, unknown>).lte = params.dateTo;
  }

  const records = await prisma.salesRecord.findMany({
    where,
    include: {
      agency: { select: { code: true, name: true } },
      plan: { select: { code: true, name: true } },
      commissionEvent: true,
    },
    orderBy: { transactionDate: "desc" },
  });

  const isAgency = session.user.role === "AGENCY";

  const csvData = records.map((r) => {
    const row: Record<string, string | number> = {
      売上日: r.transactionDate.toISOString().split("T")[0],
      代理店コード: r.agency.code,
      代理店名: r.agency.name,
      プラン: r.plan?.name || "",
      顧客名: r.customerName || "",
      顧客Ref: r.customerRef || "",
      売上金額_税抜: Number(r.saleAmountExTax),
      税額: Number(r.taxAmount),
      売上金額_税込: Number(r.saleAmountIncTax),
      決済ステータス: r.paymentStatus,
      還元率: r.commissionEvent ? `${Number(r.commissionEvent.commissionRate)}%` : "",
      代理店報酬: r.commissionEvent ? Number(r.commissionEvent.agencyAmount) : "",
      報酬ステータス: r.commissionEvent?.status || "",
    };
    if (!isAgency) {
      row["運営者取り分"] = r.commissionEvent ? Number(r.commissionEvent.operatorAmount) : "";
    }
    return row;
  });

  const csv = Papa.unparse(csvData);

  await logAudit({
    userId: session.user.id,
    action: "EXPORT",
    entityType: "SalesRecord",
    metadata: { recordCount: records.length, agencyId },
  });

  return csv;
}

export async function exportPayoutsCSV(params: { agencyId?: string }) {
  const session = await requireAuth();
  let { agencyId } = params;

  if (session.user.role === "AGENCY") {
    agencyId = session.user.agencyId!;
  }

  const where: Record<string, unknown> = {};
  if (agencyId) where.agencyId = agencyId;

  const records = await prisma.payoutRequest.findMany({
    where,
    include: { agency: { select: { code: true, name: true } } },
    orderBy: { requestedAt: "desc" },
  });

  const csvData = records.map((r) => ({
    申請日: r.requestedAt.toISOString().split("T")[0],
    代理店コード: r.agency.code,
    代理店名: r.agency.name,
    申請額: Number(r.amount),
    振込手数料: Number(r.transferFee),
    振込金額: Number(r.netAmount),
    ステータス: r.status,
    承認日: r.approvedAt?.toISOString().split("T")[0] || "",
    支払日: r.paidAt?.toISOString().split("T")[0] || "",
    銀行名: r.bankName,
    支店名: r.bankBranchName || "",
    口座番号: r.bankAccountNumber,
    口座名義: r.bankAccountHolder,
  }));

  const csv = Papa.unparse(csvData);

  await logAudit({
    userId: session.user.id,
    action: "EXPORT",
    entityType: "PayoutRequest",
    metadata: { recordCount: records.length, agencyId },
  });

  return csv;
}
