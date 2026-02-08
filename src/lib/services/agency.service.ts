"use server";

import { prisma } from "@/lib/prisma";
import { requireOperator, requireAuth } from "@/lib/auth";
import { logAudit, computeChanges } from "./audit.service";
import type { CreateAgencyInput, UpdateAgencyInput, BankInfoInput } from "@/lib/validations/agency";
import type { AgencyStatus } from "@/lib/types";

async function generateAgencyCode(): Promise<string> {
  const last = await prisma.agency.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const num = last ? parseInt(last.code.replace("AGC-", ""), 10) + 1 : 1;
  return `AGC-${String(num).padStart(4, "0")}`;
}

export async function listAgencies(params: {
  search?: string;
  status?: AgencyStatus;
  page?: number;
  pageSize?: number;
}) {
  await requireOperator();
  const { search, status, page = 1, pageSize = 20 } = params;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.agency.findMany({
      where,
      include: {
        balance: true,
        _count: { select: { users: true, commissionRules: true, salesRecords: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agency.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAgency(agencyId: string) {
  const session = await requireAuth();
  if (session.user.role === "AGENCY" && session.user.agencyId !== agencyId) {
    throw new Error("Forbidden");
  }

  return prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: {
      balance: true,
      users: { select: { id: true, email: true, name: true, isActive: true } },
      commissionRules: {
        orderBy: { effectiveFrom: "desc" },
        include: { plan: { select: { code: true, name: true } } },
      },
      _count: { select: { salesRecords: true, payoutRequests: true } },
    },
  });
}

export async function createAgency(data: CreateAgencyInput) {
  const session = await requireOperator();
  const code = await generateAgencyCode();

  const agency = await prisma.$transaction(async (tx) => {
    const created = await tx.agency.create({
      data: {
        code,
        name: data.name,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        payoutThreshold: data.payoutThreshold,
        holdPeriodDays: data.holdPeriodDays,
        notes: data.notes,
      },
    });

    await tx.balance.create({
      data: { agencyId: created.id },
    });

    return created;
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entityType: "Agency",
    entityId: agency.id,
    metadata: { code: agency.code, name: agency.name },
  });

  return agency;
}

export async function updateAgency(agencyId: string, data: UpdateAgencyInput) {
  const session = await requireOperator();
  const before = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });

  const changes = computeChanges(
    before as unknown as Record<string, unknown>,
    data as Record<string, unknown>,
    ["name", "contactName", "contactEmail", "contactPhone", "payoutThreshold", "holdPeriodDays", "notes"]
  );

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data,
  });

  if (Object.keys(changes).length > 0) {
    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Agency",
      entityId: agencyId,
      changes,
    });
  }

  return updated;
}

export async function updateAgencyStatus(agencyId: string, status: AgencyStatus) {
  const session = await requireOperator();
  const before = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: { status },
  });

  await logAudit({
    userId: session.user.id,
    action: "STATUS_CHANGE",
    entityType: "Agency",
    entityId: agencyId,
    changes: { status: { old: before.status, new: status } },
  });

  return updated;
}

export async function updateBankInfo(agencyId: string, data: BankInfoInput) {
  const session = await requireAuth();
  if (session.user.role === "AGENCY" && session.user.agencyId !== agencyId) {
    throw new Error("Forbidden");
  }

  const before = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });

  const changes = computeChanges(
    before as unknown as Record<string, unknown>,
    data as Record<string, unknown>,
    ["bankName", "bankBranchName", "bankAccountType", "bankAccountNumber", "bankAccountHolder"]
  );

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data,
  });

  if (Object.keys(changes).length > 0) {
    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Agency",
      entityId: agencyId,
      changes,
      metadata: { section: "bankInfo" },
    });
  }

  return updated;
}

export async function getAgencyStats() {
  await requireOperator();
  const [total, active, suspended, pending] = await Promise.all([
    prisma.agency.count(),
    prisma.agency.count({ where: { status: "ACTIVE" } }),
    prisma.agency.count({ where: { status: "SUSPENDED" } }),
    prisma.agency.count({ where: { status: "PENDING" } }),
  ]);
  return { total, active, suspended, pending };
}
