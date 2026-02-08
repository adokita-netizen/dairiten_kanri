import { z } from "zod";

export const rejectPayoutSchema = z.object({
  payoutId: z.string().min(1),
  rejectionReason: z.string().min(1, "却下理由は必須です").max(500),
});

export type RejectPayoutInput = z.infer<typeof rejectPayoutSchema>;
