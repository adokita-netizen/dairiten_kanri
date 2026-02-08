import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OPERATOR") {
    return NextResponse.json([], { status: 403 });
  }

  const agencies = await prisma.agency.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(agencies);
}
