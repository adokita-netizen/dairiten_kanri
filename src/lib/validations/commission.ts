import { z } from "zod";

export const createCommissionRuleSchema = z.object({
  agencyId: z.string().min(1, "代理店は必須です"),
  planId: z.string().optional().nullable(),
  commissionType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  rate: z.coerce.number().min(0, "還元率は0以上で入力してください").max(100, "還元率は100以下で入力してください"),
  effectiveFrom: z.coerce.date({ error: "適用開始日は必須です" }),
  effectiveTo: z.coerce.date().optional().nullable(),
  description: z.string().optional(),
});

export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>;
