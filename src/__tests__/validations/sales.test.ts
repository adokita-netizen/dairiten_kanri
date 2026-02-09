import { describe, it, expect } from "vitest";
import { salesRowSchema, manualSalesSchema } from "@/lib/validations/sales";

describe("salesRowSchema", () => {
  const validRow = {
    agencyCode: "AGC-0001",
    transactionDate: "2024-06-15",
    saleAmountExTax: "10000",
  };

  it("accepts valid row with required fields only", () => {
    const result = salesRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agencyCode).toBe("AGC-0001");
      expect(result.data.taxRate).toBe(10); // default
      expect(result.data.quantity).toBe(1); // default
    }
  });

  it("accepts valid row with all fields", () => {
    const result = salesRowSchema.safeParse({
      ...validRow,
      planCode: "PLAN-001",
      taxRate: "8",
      quantity: "3",
      customerName: "Test Corp",
      customerRef: "REF-001",
      contractId: "CTR-001",
      externalId: "EXT-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxRate).toBe(8);
      expect(result.data.quantity).toBe(3);
    }
  });

  it("rejects empty agencyCode", () => {
    const result = salesRowSchema.safeParse({ ...validRow, agencyCode: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing transactionDate", () => {
    const result = salesRowSchema.safeParse({
      agencyCode: "AGC-0001",
      saleAmountExTax: "10000",
      transactionDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative saleAmountExTax", () => {
    const result = salesRowSchema.safeParse({ ...validRow, saleAmountExTax: "-100" });
    expect(result.success).toBe(false);
  });

  it("rejects zero saleAmountExTax", () => {
    const result = salesRowSchema.safeParse({ ...validRow, saleAmountExTax: "0" });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers to number", () => {
    const result = salesRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.saleAmountExTax).toBe("number");
      expect(result.data.saleAmountExTax).toBe(10000);
    }
  });

  it("rejects taxRate > 100", () => {
    const result = salesRowSchema.safeParse({ ...validRow, taxRate: "101" });
    expect(result.success).toBe(false);
  });

  it("rejects negative taxRate", () => {
    const result = salesRowSchema.safeParse({ ...validRow, taxRate: "-1" });
    expect(result.success).toBe(false);
  });
});

describe("manualSalesSchema", () => {
  it("accepts valid manual sales input", () => {
    const result = manualSalesSchema.safeParse({
      agencyId: "agency-id-123",
      transactionDate: "2024-06-15",
      saleAmountExTax: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty agencyId", () => {
    const result = manualSalesSchema.safeParse({
      agencyId: "",
      transactionDate: "2024-06-15",
      saleAmountExTax: 10000,
    });
    expect(result.success).toBe(false);
  });
});
