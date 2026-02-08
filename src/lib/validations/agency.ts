import { z } from "zod";

export const createAgencySchema = z.object({
  name: z.string().min(1, "代理店名は必須です").max(200),
  contactName: z.string().min(1, "担当者名は必須です").max(100),
  contactEmail: z.string().email("有効なメールアドレスを入力してください"),
  contactPhone: z.string().optional(),
  payoutThreshold: z.coerce.number().min(0).default(10000),
  holdPeriodDays: z.coerce.number().min(0).default(14),
  notes: z.string().optional(),
});

export const updateAgencySchema = createAgencySchema.partial();

export const bankInfoSchema = z.object({
  bankName: z.string().min(1, "銀行名は必須です"),
  bankBranchName: z.string().optional(),
  bankAccountType: z.enum(["ordinary", "current"], {
    error: "口座種別を選択してください",
  }),
  bankAccountNumber: z.string().min(1, "口座番号は必須です").max(20),
  bankAccountHolder: z.string().min(1, "口座名義は必須です"),
});

export const updateAgencyStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"]),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
export type BankInfoInput = z.infer<typeof bankInfoSchema>;
