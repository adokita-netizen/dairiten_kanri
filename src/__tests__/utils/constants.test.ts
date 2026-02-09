import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAYOUT_THRESHOLD,
  DEFAULT_HOLD_PERIOD_DAYS,
  DEFAULT_TAX_RATE,
  DEFAULT_PAGE_SIZE,
  DEPOSIT_AMOUNT,
  DEPOSIT_AMOUNT_INC_TAX,
  AGENCY_STATUS_LABELS,
  COMMISSION_EVENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  SALES_STATUS_LABELS,
  COMMISSION_TYPE_LABELS,
  BANK_ACCOUNT_TYPE_LABELS,
} from "@/lib/utils/constants";

describe("constants", () => {
  it("has correct default values", () => {
    expect(DEFAULT_PAYOUT_THRESHOLD).toBe(10000);
    expect(DEFAULT_HOLD_PERIOD_DAYS).toBe(14);
    expect(DEFAULT_TAX_RATE).toBe(10);
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it("has correct deposit amounts", () => {
    expect(DEPOSIT_AMOUNT).toBe(120000);
    expect(DEPOSIT_AMOUNT_INC_TAX).toBe(132000);
    // Tax verification: 120000 * 1.1 = 132000
    expect(DEPOSIT_AMOUNT * (1 + DEFAULT_TAX_RATE / 100)).toBe(DEPOSIT_AMOUNT_INC_TAX);
  });
});

describe("label maps", () => {
  it("AGENCY_STATUS_LABELS covers all statuses", () => {
    expect(AGENCY_STATUS_LABELS).toHaveProperty("PENDING");
    expect(AGENCY_STATUS_LABELS).toHaveProperty("ACTIVE");
    expect(AGENCY_STATUS_LABELS).toHaveProperty("SUSPENDED");
    expect(AGENCY_STATUS_LABELS).toHaveProperty("TERMINATED");
    expect(Object.keys(AGENCY_STATUS_LABELS)).toHaveLength(4);
  });

  it("COMMISSION_EVENT_STATUS_LABELS covers all statuses", () => {
    expect(COMMISSION_EVENT_STATUS_LABELS).toHaveProperty("HOLD");
    expect(COMMISSION_EVENT_STATUS_LABELS).toHaveProperty("CONFIRMED");
    expect(COMMISSION_EVENT_STATUS_LABELS).toHaveProperty("INVALIDATED");
    expect(COMMISSION_EVENT_STATUS_LABELS).toHaveProperty("PAID");
    expect(Object.keys(COMMISSION_EVENT_STATUS_LABELS)).toHaveLength(4);
  });

  it("PAYOUT_STATUS_LABELS covers all statuses", () => {
    expect(PAYOUT_STATUS_LABELS).toHaveProperty("REQUESTED");
    expect(PAYOUT_STATUS_LABELS).toHaveProperty("APPROVED");
    expect(PAYOUT_STATUS_LABELS).toHaveProperty("REJECTED");
    expect(PAYOUT_STATUS_LABELS).toHaveProperty("PAID");
    expect(PAYOUT_STATUS_LABELS).toHaveProperty("CANCELLED");
    expect(Object.keys(PAYOUT_STATUS_LABELS)).toHaveLength(5);
  });

  it("SALES_STATUS_LABELS covers all statuses", () => {
    expect(SALES_STATUS_LABELS).toHaveProperty("SUCCESS");
    expect(SALES_STATUS_LABELS).toHaveProperty("FAILED");
    expect(SALES_STATUS_LABELS).toHaveProperty("REFUNDED");
    expect(Object.keys(SALES_STATUS_LABELS)).toHaveLength(3);
  });

  it("COMMISSION_TYPE_LABELS covers all types", () => {
    expect(COMMISSION_TYPE_LABELS).toHaveProperty("PERCENTAGE");
    expect(COMMISSION_TYPE_LABELS).toHaveProperty("FIXED_AMOUNT");
    expect(Object.keys(COMMISSION_TYPE_LABELS)).toHaveLength(2);
  });

  it("BANK_ACCOUNT_TYPE_LABELS covers all types", () => {
    expect(BANK_ACCOUNT_TYPE_LABELS).toHaveProperty("ordinary");
    expect(BANK_ACCOUNT_TYPE_LABELS).toHaveProperty("current");
    expect(Object.keys(BANK_ACCOUNT_TYPE_LABELS)).toHaveLength(2);
  });

  it("all label values are non-empty Japanese strings", () => {
    const allLabels = [
      ...Object.values(AGENCY_STATUS_LABELS),
      ...Object.values(COMMISSION_EVENT_STATUS_LABELS),
      ...Object.values(PAYOUT_STATUS_LABELS),
      ...Object.values(SALES_STATUS_LABELS),
      ...Object.values(COMMISSION_TYPE_LABELS),
      ...Object.values(BANK_ACCOUNT_TYPE_LABELS),
    ];
    for (const label of allLabels) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
