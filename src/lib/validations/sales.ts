import { z } from "zod";

export const salesRowSchema = z.object({
  agencyCode: z.string().min(1, "代理店コードは必須です"),
  planCode: z.string().optional(),
  transactionDate: z.string().min(1, "取引日は必須です"),
  saleAmountExTax: z.coerce.number().positive("売上金額は正の値で入力してください"),
  taxRate: z.coerce.number().min(0).max(100).default(10),
  quantity: z.coerce.number().int().positive().default(1),
  customerName: z.string().optional(),
  customerRef: z.string().optional(),
  contractId: z.string().optional(),
  externalId: z.string().optional(),
});

export const manualSalesSchema = z.object({
  agencyId: z.string().min(1),
  planId: z.string().optional(),
  transactionDate: z.coerce.date(),
  saleAmountExTax: z.coerce.number().positive(),
  taxRate: z.coerce.number().min(0).max(100).default(10),
  quantity: z.coerce.number().int().positive().default(1),
  customerName: z.string().optional(),
  customerRef: z.string().optional(),
  contractId: z.string().optional(),
});

export type SalesRowInput = z.infer<typeof salesRowSchema>;
export type ManualSalesInput = z.infer<typeof manualSalesSchema>;
