import { describe, it, expect } from "vitest";
import { rejectPayoutSchema } from "@/lib/validations/payout";

describe("rejectPayoutSchema", () => {
  it("accepts valid rejection", () => {
    const result = rejectPayoutSchema.safeParse({
      payoutId: "payout-123",
      rejectionReason: "書類不備のため",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty payoutId", () => {
    const result = rejectPayoutSchema.safeParse({
      payoutId: "",
      rejectionReason: "理由",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty rejectionReason", () => {
    const result = rejectPayoutSchema.safeParse({
      payoutId: "payout-123",
      rejectionReason: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rejectionReason > 500 chars", () => {
    const result = rejectPayoutSchema.safeParse({
      payoutId: "payout-123",
      rejectionReason: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts rejectionReason exactly 500 chars", () => {
    const result = rejectPayoutSchema.safeParse({
      payoutId: "payout-123",
      rejectionReason: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});
