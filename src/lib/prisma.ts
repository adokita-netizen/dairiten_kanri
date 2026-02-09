import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL!;

  // Prisma Accelerate / Supabase URL
  if (url.startsWith("prisma+postgres://") || url.startsWith("prisma://")) {
    const directUrl = process.env.DIRECT_URL;
    if (directUrl) {
      // ローカル開発 (prisma dev): PG アダプターで直接接続
      // prisma dev の組み込み PostgreSQL は同時接続数が制限されているため max: 1
      const pool = new Pool({ connectionString: directUrl, max: 1 });
      const adapter = new PrismaPg(pool);
      return new PrismaClient({ adapter });
    }
    // 本番: Prisma Accelerate 経由
    return new PrismaClient({ accelerateUrl: url });
  }

  // 通常の postgres:// URL (Supabase direct 等)
  const pool = new Pool({ connectionString: url, max: 10 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
