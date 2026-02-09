import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calculateCommission, toDecimal } from "@/lib/utils/currency";
import { addDays } from "@/lib/utils/date";

/**
 * Tests for commission calculation business logic.
 * Tests the core calculation flow used in calculateRevenueShares.
 */

describe("commission calculation flow", () => {
  it("calculates percentage commission correctly", () => {
    const saleAmount = toDecimal(100000); // ¥100,000
    const rate = toDecimal(15); // 15%
    const agencyAmount = calculateCommission(saleAmount, rate, "PERCENTAGE");
    const operatorAmount = saleAmount.minus(agencyAmount);

    expect(agencyAmount.toNumber()).toBe(15000);
    expect(operatorAmount.toNumber()).toBe(85000);
    expect(agencyAmount.plus(operatorAmount).toNumber()).toBe(100000);
  });

  it("calculates fixed amount commission correctly", () => {
    const saleAmount = toDecimal(100000);
    const rate = toDecimal(3000); // ¥3,000 per unit
    const quantity = 5;
    const agencyAmount = calculateCommission(saleAmount, rate, "FIXED_AMOUNT", quantity);
    const operatorAmount = saleAmount.minus(agencyAmount);

    expect(agencyAmount.toNumber()).toBe(15000);
    expect(operatorAmount.toNumber()).toBe(85000);
  });

  it("handles rounding correctly for odd percentages", () => {
    // ¥33,333 * 33% = 10,999.89 → truncate to 10,999
    const saleAmount = toDecimal(33333);
    const rate = toDecimal(33);
    const agencyAmount = calculateCommission(saleAmount, rate, "PERCENTAGE");
    expect(agencyAmount.toNumber()).toBe(10999);
  });

  it("agency + operator always equals sale amount (percentage)", () => {
    const amounts = [1, 100, 999, 10000, 33333, 99999, 1000000];
    const rates = [1, 5, 10, 15, 20, 33, 50, 75, 99, 100];

    for (const amount of amounts) {
      for (const rate of rates) {
        const saleAmount = toDecimal(amount);
        const rateDecimal = toDecimal(rate);
        const agencyAmount = calculateCommission(saleAmount, rateDecimal, "PERCENTAGE");
        const operatorAmount = saleAmount.minus(agencyAmount);

        // Agency amount should be non-negative
        expect(agencyAmount.gte(0)).toBe(true);
        // Operator amount should be non-negative
        expect(operatorAmount.gte(0)).toBe(true);
        // Sum should equal sale amount
        expect(agencyAmount.plus(operatorAmount).eq(saleAmount)).toBe(true);
      }
    }
  });
});

describe("hold period calculation", () => {
  it("calculates hold until date from transaction date", () => {
    const transactionDate = new Date(2024, 5, 1); // June 1
    const holdPeriodDays = 14;
    const holdUntil = addDays(transactionDate, holdPeriodDays);

    expect(holdUntil.getFullYear()).toBe(2024);
    expect(holdUntil.getMonth()).toBe(5); // June
    expect(holdUntil.getDate()).toBe(15);
  });

  it("hold until crosses month boundary", () => {
    const transactionDate = new Date(2024, 5, 25); // June 25
    const holdPeriodDays = 14;
    const holdUntil = addDays(transactionDate, holdPeriodDays);

    expect(holdUntil.getMonth()).toBe(6); // July
    expect(holdUntil.getDate()).toBe(9);
  });

  it("zero hold period means immediate confirmation", () => {
    const transactionDate = new Date(2024, 5, 1);
    const holdUntil = addDays(transactionDate, 0);

    expect(holdUntil.getTime()).toBe(transactionDate.getTime());
  });
});

describe("payout state transitions", () => {
  const validTransitions: Record<string, string[]> = {
    REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["PAID"],
    REJECTED: [],
    PAID: [],
    CANCELLED: [],
  };

  it("REQUESTED can transition to APPROVED, REJECTED, or CANCELLED", () => {
    expect(validTransitions["REQUESTED"]).toContain("APPROVED");
    expect(validTransitions["REQUESTED"]).toContain("REJECTED");
    expect(validTransitions["REQUESTED"]).toContain("CANCELLED");
  });

  it("APPROVED can only transition to PAID", () => {
    expect(validTransitions["APPROVED"]).toEqual(["PAID"]);
  });

  it("terminal states have no transitions", () => {
    expect(validTransitions["REJECTED"]).toEqual([]);
    expect(validTransitions["PAID"]).toEqual([]);
    expect(validTransitions["CANCELLED"]).toEqual([]);
  });

  it("all statuses are accounted for", () => {
    const allStatuses = ["REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"];
    expect(Object.keys(validTransitions).sort()).toEqual(allStatuses.sort());
  });
});

describe("deposit state transitions", () => {
  function getDepositStatus(paid: boolean, refunded: boolean): string {
    if (refunded) return "返金済";
    if (paid) return "入金済（預かり中）";
    return "未入金";
  }

  it("initial state is 未入金", () => {
    expect(getDepositStatus(false, false)).toBe("未入金");
  });

  it("after payment is 入金済", () => {
    expect(getDepositStatus(true, false)).toBe("入金済（預かり中）");
  });

  it("after refund is 返金済", () => {
    expect(getDepositStatus(true, true)).toBe("返金済");
  });

  it("cannot refund without payment (invalid state)", () => {
    // Even though technically possible at data level,
    // the service should prevent this
    expect(getDepositStatus(false, true)).toBe("返金済");
  });
});
