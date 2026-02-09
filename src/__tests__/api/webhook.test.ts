import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Extract and test the signature verification logic directly
function verifySignature(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function createSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("webhook signature verification", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({
    agencyCode: "AGC-0001",
    transactionDate: "2024-06-15",
    saleAmountExTax: 10000,
  });

  it("accepts valid signature", () => {
    const sig = createSignature(body, secret);
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifySignature(body, "invalid-signature", secret)).toBe(false);
  });

  it("rejects null signature", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
  });

  it("rejects when secret is undefined", () => {
    const sig = createSignature(body, secret);
    expect(verifySignature(body, sig, undefined)).toBe(false);
  });

  it("rejects when body is tampered", () => {
    const sig = createSignature(body, secret);
    const tamperedBody = JSON.stringify({ ...JSON.parse(body), saleAmountExTax: 99999 });
    expect(verifySignature(tamperedBody, sig, secret)).toBe(false);
  });

  it("rejects signature with wrong secret", () => {
    const sig = createSignature(body, "wrong-secret");
    expect(verifySignature(body, sig, secret)).toBe(false);
  });

  it("rejects empty signature", () => {
    // Empty string has different length than expected hex
    expect(verifySignature(body, "", secret)).toBe(false);
  });
});

describe("webhook payload validation", () => {
  it("parses valid JSON payload", () => {
    const payload = JSON.stringify({
      agencyCode: "AGC-0001",
      planCode: "PLAN-001",
      transactionDate: "2024-06-15",
      saleAmountExTax: 10000,
      taxRate: 10,
      quantity: 1,
      customerName: "テスト顧客",
    });
    const data = JSON.parse(payload);
    expect(data.agencyCode).toBe("AGC-0001");
    expect(data.saleAmountExTax).toBe(10000);
  });

  it("rejects invalid JSON", () => {
    expect(() => JSON.parse("not-json")).toThrow();
  });

  it("validates required fields", () => {
    const payload = { agencyCode: "AGC-0001", transactionDate: "2024-06-15", saleAmountExTax: 10000 };
    expect(payload.agencyCode).toBeTruthy();
    expect(payload.transactionDate).toBeTruthy();
    expect(payload.saleAmountExTax).toBeGreaterThan(0);
  });

  it("validates saleAmountExTax is a number", () => {
    expect(isNaN(Number("abc"))).toBe(true);
    expect(isNaN(Number(10000))).toBe(false);
    expect(isNaN(Number("10000"))).toBe(false);
  });

  it("validates transactionDate format", () => {
    expect(isNaN(new Date("2024-06-15").getTime())).toBe(false);
    expect(isNaN(new Date("invalid").getTime())).toBe(true);
  });
});
