import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportPayoutsCSV } from "@/lib/services/export.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agencyId = searchParams.get("agencyId") || undefined;

  try {
    const csv = await exportPayoutsCSV({ agencyId });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payouts-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "CSVエクスポートに失敗しました" }, { status: 500 });
  }
}
