import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, resetLoginAttempts } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8時間でセッション期限切れ
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();

        // レート制限チェック
        const hdrs = await headers();
        const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rateCheck = checkLoginRateLimit(ip, email);
        if (!rateCheck.allowed) {
          throw new Error(rateCheck.message || "ログイン試行回数の上限に達しました");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            agencyId: true,
            isActive: true,
            failedLoginAttempts: true,
            lockedUntil: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // アカウント無効チェック
        if (!user.isActive) {
          throw new Error("このアカウントは無効化されています。管理者にお問い合わせください。");
        }

        // アカウントロックチェック
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`アカウントがロックされています。${minutes}分後に再試行してください。`);
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          // 失敗回数を増やす
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const MAX_FAILED = 5;
          const updateData: Record<string, unknown> = {
            failedLoginAttempts: newAttempts,
          };
          // 5回失敗でアカウントを30分ロック
          if (newAttempts >= MAX_FAILED) {
            updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
          }
          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          if (newAttempts >= MAX_FAILED) {
            throw new Error("ログイン試行回数が上限に達したため、アカウントが30分間ロックされました。");
          }

          return null;
        }

        // ログイン成功：失敗回数をリセット
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
        resetLoginAttempts(ip, email);

        // ログイン監査ログ
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entityType: "User",
            entityId: user.id,
            ipAddress: ip,
            metadata: { email: user.email },
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.agencyId = user.agencyId;
        token.userId = user.id!;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.agencyId = token.agencyId;
      }
      return session;
    },
  },
});

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireOperator() {
  const session = await requireAuth();
  if (session.user.role !== "OPERATOR") {
    throw new Error("Forbidden: Operator access required");
  }
  return session;
}

export async function requireAgency() {
  const session = await requireAuth();
  if (session.user.role !== "AGENCY" || !session.user.agencyId) {
    throw new Error("Forbidden: Agency access required");
  }
  return session;
}
