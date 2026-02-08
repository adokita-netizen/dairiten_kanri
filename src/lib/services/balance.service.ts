"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { BalanceSummary } from "@/lib/types";

export async function getBalanceSummary(agencyId: string): Promise<BalanceSummary> {
  const session = await requireAuth();
  if (session.user.role === "AGENCY" && session.user.agencyId !== agencyId) {
    throw new Error("Forbidden");
  }

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
    select: { payoutThreshold: true },
  });

  const balance = await prisma.balance.findUnique({
    where: { agencyId },
  });

  const pendingPayouts = await prisma.payoutRequest.aggregate({
    where: {
      agencyId,
      status: { in: ["REQUESTED", "APPROVED"] },
    },
    _sum: { amount: true },
  });

  const confirmedBalance = Number(balance?.confirmedBalance || 0);
  const holdBalance = Number(balance?.holdBalance || 0);
  const totalEarned = Number(balance?.totalEarned || 0);
  const totalPaidOut = Number(balance?.totalPaidOut || 0);
  const pendingAmount = Number(pendingPayouts._sum.amount || 0);
  const threshold = Number(agency.payoutThreshold);
  const availableBalance = confirmedBalance - pendingAmount;
  const canRequestPayout = availableBalance >= threshold;
  const amountUntilThreshold = canRequestPayout ? 0 : threshold - availableBalance;

  return {
    confirmedBalance,
    holdBalance,
    totalEarned,
    totalPaidOut,
    pendingPayouts: pendingAmount,
    availableBalance,
    threshold,
    canRequestPayout,
    amountUntilThreshold,
  };
}
