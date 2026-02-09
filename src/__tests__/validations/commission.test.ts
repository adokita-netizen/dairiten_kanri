import { describe, it, expect } from "vitest";
import { createCommissionRuleSchema } from "@/lib/validations/commission";

describe("createCommissionRuleSchema", () => {
  const validInput = {
    agencyId: "agency-id-123",
    rate: 20,
    effectiveFrom: "2024-06-01",
  };

  it("accepts valid percentage rule", () => {
    const result = createCommissionRuleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commissionType).toBe("PERCENTAGE"); // default
    }
  });

  it("accepts valid fixed amount rule", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      commissionType: "FIXED_AMOUNT",
      rate: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects percentage > 100", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      commissionType: "PERCENTAGE",
      rate: 101,
    });
    expect(result.success).toBe(false);
  });

  it("allows 100% rate", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      rate: 100,
    });
    expect(result.success).toBe(true);
  });

  it("allows 0% rate", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      rate: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative rate", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      rate: -1,
    });
    expect(result.success).toBe(false);
  });

  it("allows > 100 for FIXED_AMOUNT", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      commissionType: "FIXED_AMOUNT",
      rate: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty agencyId", () => {
    const result = createCommissionRuleSchema.safeParse({ ...validInput, agencyId: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional planId", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      planId: "plan-123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null planId", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      planId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional effectiveTo", () => {
    const result = createCommissionRuleSchema.safeParse({
      ...validInput,
      effectiveTo: "2024-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("coerces effectiveFrom string to Date", () => {
    const result = createCommissionRuleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effectiveFrom).toBeInstanceOf(Date);
    }
  });
});
