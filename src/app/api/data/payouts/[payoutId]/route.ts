import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { payoutId } = await params;

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutId },
    include: { agency: { select: { code: true, name: true } } },
  });

  if (!payout) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...payout,
    amount: Number(payout.amount),
    transferFee: Number(payout.transferFee),
    netAmount: Number(payout.netAmount),
  });
}
