import { describe, it, expect } from "vitest";
import {
  createAgencySchema,
  updateAgencySchema,
  bankInfoSchema,
  updateAgencyStatusSchema,
} from "@/lib/validations/agency";

describe("createAgencySchema", () => {
  const validInput = {
    name: "テスト代理店",
    contactName: "田中太郎",
    contactEmail: "tanaka@example.com",
  };

  it("accepts valid input with required fields", () => {
    const result = createAgencySchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payoutThreshold).toBe(10000); // default
      expect(result.data.holdPeriodDays).toBe(14); // default
    }
  });

  it("accepts all fields", () => {
    const result = createAgencySchema.safeParse({
      ...validInput,
      contactPhone: "03-1234-5678",
      payoutThreshold: 50000,
      holdPeriodDays: 30,
      notes: "テスト備考",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payoutThreshold).toBe(50000);
      expect(result.data.holdPeriodDays).toBe(30);
    }
  });

  it("rejects empty name", () => {
    const result = createAgencySchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty contactName", () => {
    const result = createAgencySchema.safeParse({ ...validInput, contactName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createAgencySchema.safeParse({ ...validInput, contactEmail: "not-email" });
    expect(result.success).toBe(false);
  });

  it("rejects name > 200 chars", () => {
    const result = createAgencySchema.safeParse({ ...validInput, name: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects negative payoutThreshold", () => {
    const result = createAgencySchema.safeParse({ ...validInput, payoutThreshold: -1 });
    expect(result.success).toBe(false);
  });
});

describe("updateAgencySchema", () => {
  it("accepts partial updates", () => {
    const result = updateAgencySchema.safeParse({ name: "新しい名前" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateAgencySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("bankInfoSchema", () => {
  const validBank = {
    bankName: "みずほ銀行",
    bankAccountType: "ordinary",
    bankAccountNumber: "1234567",
    bankAccountHolder: "タナカ タロウ",
  };

  it("accepts valid bank info", () => {
    const result = bankInfoSchema.safeParse(validBank);
    expect(result.success).toBe(true);
  });

  it("accepts with optional branchName", () => {
    const result = bankInfoSchema.safeParse({ ...validBank, bankBranchName: "東京支店" });
    expect(result.success).toBe(true);
  });

  it("rejects empty bankName", () => {
    const result = bankInfoSchema.safeParse({ ...validBank, bankName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid account type", () => {
    const result = bankInfoSchema.safeParse({ ...validBank, bankAccountType: "savings" });
    expect(result.success).toBe(false);
  });

  it("accepts current account type", () => {
    const result = bankInfoSchema.safeParse({ ...validBank, bankAccountType: "current" });
    expect(result.success).toBe(true);
  });

  it("rejects empty account number", () => {
    const result = bankInfoSchema.safeParse({ ...validBank, bankAccountNumber: "" });
    expect(result.success).toBe(false);
  });

  it("rejects account number > 20 chars", () => {
    const result = bankInfoSchema.safeParse({
      ...validBank,
      bankAccountNumber: "1".repeat(21),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAgencyStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const status of ["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"]) {
      const result = updateAgencyStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = updateAgencyStatusSchema.safeParse({ status: "DELETED" });
    expect(result.success).toBe(false);
  });
});
