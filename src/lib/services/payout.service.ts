"use server";

import { prisma } from "@/lib/prisma";
import { requireOperator, requireAgency, requireAuth } from "@/lib/auth";
import { logAudit } from "./audit.service";
import { getBalanceSummary } from "./balance.service";

export async function requestPayout(agencyId: string) {
  const session = await requireAgency();
  if (session.user.agencyId !== agencyId) {
    throw new Error("Forbidden");
  }

  const balanceSummary = await getBalanceSummary(agencyId);
  if (!balanceSummary.canRequestPayout) {
    throw new Error(
      `確定残高が最低支払額（${balanceSummary.threshold.toLocaleString()}円）に達していません。あと${balanceSummary.amountUntilThreshold.toLocaleString()}円必要です。`
    );
  }

  const existingPending = await prisma.payoutRequest.findFirst({
    where: {
      agencyId,
      status: { in: ["REQUESTED", "APPROVED"] },
    },
  });
  if (existingPending) {
    throw new Error("既に処理中の引き出し申請があります。");
  }

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
  });

  if (!agency.bankName || !agency.bankAccountNumber || !agency.bankAccountHolder) {
    throw new Error("振込先情報が登録されていません。プロフィール画面で登録してください。");
  }

  if (agency.status !== "ACTIVE") {
    throw new Error("代理店のステータスが有効ではありません。");
  }

  const amount = balanceSummary.availableBalance;

  const payout = await prisma.payoutRequest.create({
    data: {
      agencyId,
      amount,
      transferFee: 0,
      netAmount: amount,
      status: "REQUESTED",
      bankName: agency.bankName,
      bankBranchName: agency.bankBranchName,
      bankAccountType: agency.bankAccountType,
      bankAccountNumber: agency.bankAccountNumber,
      bankAccountHolder: agency.bankAccountHolder,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "PAYOUT",
    entityType: "PayoutRequest",
    entityId: payout.id,
    metadata: { amount, status: "REQUESTED" },
  });

  return payout;
}

export async function listPayouts(params: {
  agencyId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await requireAuth();
  const { page = 1, pageSize = 20, status } = params;
  let { agencyId } = params;

  if (session.user.role === "AGENCY") {
    agencyId = session.user.agencyId!;
  }

  const where: Record<string, unknown> = {};
  if (agencyId) where.agencyId = agencyId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.payoutRequest.findMany({
      where,
      include: { agency: { select: { code: true, name: true } } },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payoutRequest.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function approvePayout(payoutId: string) {
  const session = await requireOperator();

  const payout = await prisma.payoutRequest.findUniqueOrThrow({
    where: { id: payoutId },
  });

  if (payout.status !== "REQUESTED") {
    throw new Error("この申請は承認できる状態ではありません。");
  }

  const updated = await prisma.payoutRequest.update({
    where: { id: payoutId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "PAYOUT",
    entityType: "PayoutRequest",
    entityId: payoutId,
    changes: { status: { old: "REQUESTED", new: "APPROVED" } },
  });

  return updated;
}

export async function rejectPayout(payoutId: string, reason: string) {
  const session = await requireOperator();

  const payout = await prisma.payoutRequest.findUniqueOrThrow({
    where: { id: payoutId },
  });

  if (payout.status !== "REQUESTED") {
    throw new Error("この申請は却下できる状態ではありません。");
  }

  const updated = await prisma.payoutRequest.update({
    where: { id: payoutId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "PAYOUT",
    entityType: "PayoutRequest",
    entityId: payoutId,
    changes: { status: { old: "REQUESTED", new: "REJECTED" } },
    metadata: { reason },
  });

  return updated;
}

export async function markPayoutAsPaid(payoutId: string) {
  const session = await requireOperator();

  const payout = await prisma.payoutRequest.findUniqueOrThrow({
    where: { id: payoutId },
  });

  if (payout.status !== "APPROVED") {
    throw new Error("この申請は支払い処理できる状態ではありません。承認済みの申請のみ処理できます。");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    await tx.balance.update({
      where: { agencyId: payout.agencyId },
      data: {
        confirmedBalance: { decrement: payout.amount },
        totalPaidOut: { increment: payout.netAmount },
      },
    });

    return result;
  });

  await logAudit({
    userId: session.user.id,
    action: "PAYOUT",
    entityType: "PayoutRequest",
    entityId: payoutId,
    changes: { status: { old: "APPROVED", new: "PAID" } },
    metadata: { amount: Number(payout.amount) },
  });

  return updated;
}

export async function cancelPayout(payoutId: string) {
  const session = await requireAgency();

  const payout = await prisma.payoutRequest.findUniqueOrThrow({
    where: { id: payoutId },
  });

  if (payout.agencyId !== session.user.agencyId) {
    throw new Error("Forbidden");
  }

  if (payout.status !== "REQUESTED") {
    throw new Error("申請中のもののみ取消可能です。");
  }

  const updated = await prisma.payoutRequest.update({
    where: { id: payoutId },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    userId: session.user.id,
    action: "PAYOUT",
    entityType: "PayoutRequest",
    entityId: payoutId,
    changes: { status: { old: "REQUESTED", new: "CANCELLED" } },
  });

  return updated;
}

export async function getPayoutStats() {
  await requireOperator();

  const stats = await prisma.payoutRequest.groupBy({
    by: ["status"],
    _sum: { amount: true },
    _count: true,
  });

  return stats;
}
