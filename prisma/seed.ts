import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create operator user
  const operatorPassword = await bcrypt.hash("operator123", 10);
  const operator = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "管理者",
      passwordHash: operatorPassword,
      role: "OPERATOR",
    },
  });
  console.log("Created operator:", operator.email);

  // Create plans
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { code: "PLAN-STARTER" },
      update: {},
      create: { code: "PLAN-STARTER", name: "スタータープラン", monthlyPrice: 9800 },
    }),
    prisma.plan.upsert({
      where: { code: "PLAN-PRO" },
      update: {},
      create: { code: "PLAN-PRO", name: "プロプラン", monthlyPrice: 29800 },
    }),
    prisma.plan.upsert({
      where: { code: "PLAN-ENTERPRISE" },
      update: {},
      create: { code: "PLAN-ENTERPRISE", name: "エンタープライズプラン", monthlyPrice: 98000 },
    }),
  ]);
  console.log("Created plans:", plans.length);

  // Create agencies
  const agencyPassword = await bcrypt.hash("agency123", 10);

  const agency1 = await prisma.agency.upsert({
    where: { code: "AGC-0001" },
    update: {},
    create: {
      code: "AGC-0001",
      name: "株式会社テスト代理店",
      contactName: "田中太郎",
      contactEmail: "tanaka@agency1.example.com",
      contactPhone: "03-1234-5678",
      status: "ACTIVE",
      bankName: "三菱UFJ銀行",
      bankBranchName: "渋谷支店",
      bankAccountType: "ordinary",
      bankAccountNumber: "1234567",
      bankAccountHolder: "カ）テストダイリテン",
      payoutThreshold: 10000,
      holdPeriodDays: 14,
    },
  });

  await prisma.balance.upsert({
    where: { agencyId: agency1.id },
    update: {},
    create: { agencyId: agency1.id },
  });

  const agency1User = await prisma.user.upsert({
    where: { email: "tanaka@agency1.example.com" },
    update: {},
    create: {
      email: "tanaka@agency1.example.com",
      name: "田中太郎",
      passwordHash: agencyPassword,
      role: "AGENCY",
      agencyId: agency1.id,
    },
  });

  const agency2 = await prisma.agency.upsert({
    where: { code: "AGC-0002" },
    update: {},
    create: {
      code: "AGC-0002",
      name: "合同会社パートナー",
      contactName: "鈴木花子",
      contactEmail: "suzuki@agency2.example.com",
      status: "ACTIVE",
      payoutThreshold: 10000,
      holdPeriodDays: 7,
    },
  });

  await prisma.balance.upsert({
    where: { agencyId: agency2.id },
    update: {},
    create: { agencyId: agency2.id },
  });

  await prisma.user.upsert({
    where: { email: "suzuki@agency2.example.com" },
    update: {},
    create: {
      email: "suzuki@agency2.example.com",
      name: "鈴木花子",
      passwordHash: agencyPassword,
      role: "AGENCY",
      agencyId: agency2.id,
    },
  });

  console.log("Created agencies: 2");

  // Create commission rules
  await prisma.commissionRule.createMany({
    data: [
      {
        agencyId: agency1.id,
        planId: null,
        commissionType: "PERCENTAGE",
        rate: 20,
        effectiveFrom: new Date("2026-01-01"),
        description: "デフォルト還元率 20%",
      },
      {
        agencyId: agency1.id,
        planId: plans[2].id,
        commissionType: "PERCENTAGE",
        rate: 25,
        effectiveFrom: new Date("2026-01-01"),
        description: "エンタープライズプラン特別還元率 25%",
      },
      {
        agencyId: agency2.id,
        planId: null,
        commissionType: "PERCENTAGE",
        rate: 15,
        effectiveFrom: new Date("2026-01-01"),
        description: "デフォルト還元率 15%",
      },
    ],
    skipDuplicates: true,
  });
  console.log("Created commission rules");

  // Create sample sales records
  const sampleSales = [];
  for (let i = 0; i < 10; i++) {
    const date = new Date(2026, 0, i + 5);
    sampleSales.push({
      agencyId: agency1.id,
      planId: plans[i % 3].id,
      transactionDate: date,
      customerName: `顧客${i + 1}`,
      customerRef: `CUST-${String(i + 1).padStart(3, "0")}`,
      saleAmountExTax: Number(plans[i % 3].monthlyPrice),
      saleAmountIncTax: Math.floor(Number(plans[i % 3].monthlyPrice) * 1.1),
      taxAmount: Math.floor(Number(plans[i % 3].monthlyPrice) * 0.1),
      paymentStatus: "SUCCESS" as const,
      source: "manual",
    });
  }

  for (let i = 0; i < 5; i++) {
    const date = new Date(2026, 0, i + 10);
    sampleSales.push({
      agencyId: agency2.id,
      planId: plans[i % 2].id,
      transactionDate: date,
      customerName: `顧客A${i + 1}`,
      customerRef: `CUST-A${String(i + 1).padStart(3, "0")}`,
      saleAmountExTax: Number(plans[i % 2].monthlyPrice),
      saleAmountIncTax: Math.floor(Number(plans[i % 2].monthlyPrice) * 1.1),
      taxAmount: Math.floor(Number(plans[i % 2].monthlyPrice) * 0.1),
      paymentStatus: "SUCCESS" as const,
      source: "manual",
    });
  }

  await prisma.salesRecord.createMany({
    data: sampleSales,
    skipDuplicates: true,
  });
  console.log("Created sample sales records:", sampleSales.length);

  console.log("\nSeed completed!");
  console.log("\nLogin credentials:");
  console.log("  Operator: admin@example.com / operator123");
  console.log("  Agency 1: tanaka@agency1.example.com / agency123");
  console.log("  Agency 2: suzuki@agency2.example.com / agency123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
