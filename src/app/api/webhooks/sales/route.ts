import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimal, calculateTax } from "@/lib/utils/currency";
import crypto from "crypto";

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  if (process.env.WEBHOOK_SECRET && !verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: {
    agencyCode: string;
    planCode?: string;
    transactionDate: string;
    saleAmountExTax: number;
    taxRate?: number;
    quantity?: number;
    customerName?: string;
    customerRef?: string;
    contractId?: string;
    externalId?: string;
  };

  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const agency = await prisma.agency.findUnique({
    where: { code: data.agencyCode },
    select: { id: true, status: true },
  });

  if (!agency || agency.status !== "ACTIVE") {
    console.warn(`[Webhook] Agency not found or inactive: ${data.agencyCode}`);
    return NextResponse.json({ error: "Agency not found or inactive" }, { status: 404 });
  }

  let planId: string | null = null;
  if (data.planCode) {
    const plan = await prisma.plan.findUnique({ where: { code: data.planCode } });
    if (!plan) {
      console.warn(`[Webhook] Plan not found: ${data.planCode}`);
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    planId = plan.id;
  }

  if (!data.saleAmountExTax || isNaN(Number(data.saleAmountExTax))) {
    return NextResponse.json({ error: "Invalid saleAmountExTax" }, { status: 400 });
  }

  const amountExTax = toDecimal(data.saleAmountExTax);
  const { taxAmount, amountIncTax } = calculateTax(amountExTax, data.taxRate || 10);

  const txDate = new Date(data.transactionDate);
  if (isNaN(txDate.getTime())) {
    return NextResponse.json({ error: "Invalid transactionDate" }, { status: 400 });
  }

  const record = await prisma.salesRecord.create({
    data: {
      agencyId: agency.id,
      planId,
      transactionDate: txDate,
      saleAmountExTax: Number(amountExTax),
      saleAmountIncTax: Number(amountIncTax),
      taxAmount: Number(taxAmount),
      quantity: data.quantity || 1,
      customerName: data.customerName,
      customerRef: data.customerRef,
      contractId: data.contractId,
      externalId: data.externalId,
      source: "webhook",
    },
  });

  return NextResponse.json({ id: record.id }, { status: 201 });
}
