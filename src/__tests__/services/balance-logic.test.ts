import { describe, it, expect } from "vitest";

/**
 * Tests for balance calculation business logic.
 * These test the pure computation that getBalanceSummary performs,
 * extracted from the service to test without DB dependency.
 */

function computeBalanceSummary(params: {
  confirmedBalance: number;
  holdBalance: number;
  totalEarned: number;
  totalPaidOut: number;
  pendingPayoutAmount: number;
  payoutThreshold: number;
}) {
  const { confirmedBalance, holdBalance, totalEarned, totalPaidOut, pendingPayoutAmount, payoutThreshold } = params;
  const availableBalance = confirmedBalance - pendingPayoutAmount;
  const canRequestPayout = availableBalance >= payoutThreshold;
  const amountUntilThreshold = canRequestPayout ? 0 : payoutThreshold - availableBalance;

  return {
    confirmedBalance,
    holdBalance,
    totalEarned,
    totalPaidOut,
    pendingPayouts: pendingPayoutAmount,
    availableBalance,
    threshold: payoutThreshold,
    canRequestPayout,
    amountUntilThreshold,
  };
}

describe("balance calculation logic", () => {
  it("calculates available balance as confirmed minus pending", () => {
    const result = computeBalanceSummary({
      confirmedBalance: 50000,
      holdBalance: 10000,
      totalEarned: 100000,
      totalPaidOut: 40000,
      pendingPayoutAmount: 20000,
      payoutThreshold: 10000,
    });
    expect(result.availableBalance).toBe(30000);
    expect(result.canRequestPayout).toBe(true);
    expect(result.amountUntilThreshold).toBe(0);
  });

  it("cannot request payout when below threshold", () => {
    const result = computeBalanceSummary({
      confirmedBalance: 8000,
      holdBalance: 5000,
      totalEarned: 20000,
      totalPaidOut: 7000,
      pendingPayoutAmount: 0,
      payoutThreshold: 10000,
    });
    expect(result.availableBalance).toBe(8000);
    expect(result.canRequestPayout).toBe(false);
    expect(result.amountUntilThreshold).toBe(2000);
  });

  it("cannot request payout when pending reduces balance below threshold", () => {
    const result = computeBalanceSummary({
      confirmedBalance: 15000,
      holdBalance: 0,
      totalEarned: 15000,
      totalPaidOut: 0,
      pendingPayoutAmount: 10000,
      payoutThreshold: 10000,
    });
    expect(result.availableBalance).toBe(5000);
    expect(result.canRequestPayout).toBe(false);
    expect(result.amountUntilThreshold).toBe(5000);
  });

  it("can request payout when exactly at threshold", () => {
    const result = computeBalanceSummary({
      confirmedBalance: 10000,
      holdBalance: 0,
      totalEarned: 10000,
      totalPaidOut: 0,
      pendingPayoutAmount: 0,
      payoutThreshold: 10000,
    });
    expect(result.canRequestPayout).toBe(true);
    expect(result.amountUntilThreshold).toBe(0);
  });

  it("handles zero balances", () => {
    const result = computeBalanceSummary({
      confirmedBalance: 0,
      holdBalance: 0,
      totalEarned: 0,
      totalPaidOut: 0,
      pendingPayoutAmount: 0,
      payoutThreshold: 10000,
    });
    expect(result.availableBalance).toBe(0);
    expect(result.canRequestPayout).toBe(false);
    expect(result.amountUntilThreshold).toBe(10000);
  });

  it("handles zero threshold (always payable)", () => {
    const result = computeBalanceSummary({
      confirmedBalance: 100,
      holdBalance: 0,
      totalEarned: 100,
      totalPaidOut: 0,
      pendingPayoutAmount: 0,
      payoutThreshold: 0,
    });
    expect(result.canRequestPayout).toBe(true);
  });
});
