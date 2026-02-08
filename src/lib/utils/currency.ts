import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function calculateTax(amountExTax: Decimal, taxRate: number = 10): { taxAmount: Decimal; amountIncTax: Decimal } {
  const taxAmount = amountExTax.mul(taxRate).div(100).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  const amountIncTax = amountExTax.plus(taxAmount);
  return { taxAmount, amountIncTax };
}

export function calculateCommission(
  saleAmount: Decimal,
  rate: Decimal,
  type: "PERCENTAGE" | "FIXED_AMOUNT",
  quantity: number = 1
): Decimal {
  if (type === "PERCENTAGE") {
    return saleAmount.mul(rate).div(100).toDecimalPlaces(0, Decimal.ROUND_DOWN);
  }
  return rate.mul(quantity).toDecimalPlaces(0, Decimal.ROUND_DOWN);
}

export function formatJPY(amount: number | string | Decimal): string {
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return "¥0";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(num);
}

export function decimalToNumber(d: Decimal | { toString(): string }): number {
  return Number(d.toString());
}
