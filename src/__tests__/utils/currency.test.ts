import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  toDecimal,
  calculateTax,
  calculateCommission,
  formatJPY,
  decimalToNumber,
} from "@/lib/utils/currency";

describe("toDecimal", () => {
  it("converts number to Decimal", () => {
    expect(toDecimal(100).toString()).toBe("100");
  });

  it("converts string to Decimal", () => {
    expect(toDecimal("99.99").toString()).toBe("99.99");
  });

  it("passes through Decimal instance", () => {
    const d = new Decimal("123.45");
    expect(toDecimal(d).eq(d)).toBe(true);
  });
});

describe("calculateTax", () => {
  it("calculates 10% tax with ROUND_DOWN", () => {
    const { taxAmount, amountIncTax } = calculateTax(new Decimal(1000));
    expect(taxAmount.toNumber()).toBe(100);
    expect(amountIncTax.toNumber()).toBe(1100);
  });

  it("calculates custom tax rate", () => {
    const { taxAmount, amountIncTax } = calculateTax(new Decimal(1000), 8);
    expect(taxAmount.toNumber()).toBe(80);
    expect(amountIncTax.toNumber()).toBe(1080);
  });

  it("rounds tax amount down (truncates)", () => {
    // 999 * 10% = 99.9 → floor = 99
    const { taxAmount } = calculateTax(new Decimal(999));
    expect(taxAmount.toNumber()).toBe(99);
  });

  it("handles zero amount", () => {
    const { taxAmount, amountIncTax } = calculateTax(new Decimal(0));
    expect(taxAmount.toNumber()).toBe(0);
    expect(amountIncTax.toNumber()).toBe(0);
  });

  it("handles large amounts precisely", () => {
    const { taxAmount, amountIncTax } = calculateTax(new Decimal(9999999));
    expect(taxAmount.toNumber()).toBe(999999);
    expect(amountIncTax.toNumber()).toBe(10999998);
  });
});

describe("calculateCommission", () => {
  describe("PERCENTAGE type", () => {
    it("calculates percentage commission", () => {
      const result = calculateCommission(
        new Decimal(10000),
        new Decimal(20),
        "PERCENTAGE"
      );
      expect(result.toNumber()).toBe(2000);
    });

    it("rounds down fractional commission", () => {
      // 10000 * 15% = 1500, but 9999 * 15% = 1499.85 → 1499
      const result = calculateCommission(
        new Decimal(9999),
        new Decimal(15),
        "PERCENTAGE"
      );
      expect(result.toNumber()).toBe(1499);
    });

    it("handles 100% rate", () => {
      const result = calculateCommission(
        new Decimal(5000),
        new Decimal(100),
        "PERCENTAGE"
      );
      expect(result.toNumber()).toBe(5000);
    });

    it("handles 0% rate", () => {
      const result = calculateCommission(
        new Decimal(5000),
        new Decimal(0),
        "PERCENTAGE"
      );
      expect(result.toNumber()).toBe(0);
    });

    it("handles small percentage with large amount", () => {
      // 1000000 * 0.5% = 5000
      const result = calculateCommission(
        new Decimal(1000000),
        new Decimal(0.5),
        "PERCENTAGE"
      );
      expect(result.toNumber()).toBe(5000);
    });
  });

  describe("FIXED_AMOUNT type", () => {
    it("calculates fixed amount commission", () => {
      const result = calculateCommission(
        new Decimal(10000),
        new Decimal(500),
        "FIXED_AMOUNT"
      );
      expect(result.toNumber()).toBe(500);
    });

    it("multiplies by quantity", () => {
      const result = calculateCommission(
        new Decimal(10000),
        new Decimal(500),
        "FIXED_AMOUNT",
        3
      );
      expect(result.toNumber()).toBe(1500);
    });

    it("ignores sale amount for fixed type", () => {
      const r1 = calculateCommission(new Decimal(100), new Decimal(500), "FIXED_AMOUNT");
      const r2 = calculateCommission(new Decimal(99999), new Decimal(500), "FIXED_AMOUNT");
      expect(r1.toNumber()).toBe(r2.toNumber());
    });
  });
});

describe("formatJPY", () => {
  // Intl.NumberFormat may output ¥ (U+00A5) or ￥ (U+FFE5) depending on locale environment
  it("formats number as JPY currency", () => {
    expect(formatJPY(1000)).toMatch(/[¥￥]1,000/);
  });

  it("formats zero", () => {
    expect(formatJPY(0)).toMatch(/[¥￥]0/);
  });

  it("formats large number with commas", () => {
    expect(formatJPY(1234567)).toMatch(/[¥￥]1,234,567/);
  });

  it("formats string input", () => {
    expect(formatJPY("5000")).toMatch(/[¥￥]5,000/);
  });

  it("formats Decimal input", () => {
    expect(formatJPY(new Decimal(3000))).toMatch(/[¥￥]3,000/);
  });

  it("returns ¥0 for NaN input", () => {
    expect(formatJPY("invalid")).toMatch(/[¥￥]0/);
  });

  it("formats negative numbers", () => {
    expect(formatJPY(-1000)).toMatch(/-[¥￥]1,000/);
  });
});

describe("decimalToNumber", () => {
  it("converts Decimal to number", () => {
    expect(decimalToNumber(new Decimal("123.45"))).toBe(123.45);
  });

  it("handles integer Decimal", () => {
    expect(decimalToNumber(new Decimal(100))).toBe(100);
  });
});
