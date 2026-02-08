import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { SALES_STATUS_LABELS, COMMISSION_EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import Link from "next/link";

export default async function AgencySalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");
  const agencyId = session.user.agencyId;

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 20;

  const [sales, total] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { agencyId },
      include: {
        plan: { select: { code: true, name: true } },
        commissionEvent: {
          select: {
            status: true,
            commissionRate: true,
            agencyAmount: true,
            operatorAmount: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesRecord.count({ where: { agencyId } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">売上明細</h1>
          <p className="text-sm text-muted-foreground mt-1">売上データの詳細と報酬状況を確認できます</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/export/sales?format=csv`} download>CSV出力</a>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>取引日</TableHead>
                <TableHead>顧客</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>売上（税抜）</TableHead>
                <TableHead>税額</TableHead>
                <TableHead>売上（税込）</TableHead>
                <TableHead>決済</TableHead>
                <TableHead>還元率</TableHead>
                <TableHead>報酬額</TableHead>
                <TableHead>運営者取り分</TableHead>
                <TableHead>報酬状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDate(sale.transactionDate)}</TableCell>
                  <TableCell>{sale.customerName || sale.customerRef || "-"}</TableCell>
                  <TableCell>{sale.plan?.name || "-"}</TableCell>
                  <TableCell>{formatJPY(Number(sale.saleAmountExTax))}</TableCell>
                  <TableCell>{formatJPY(Number(sale.taxAmount))}</TableCell>
                  <TableCell>{formatJPY(Number(sale.saleAmountIncTax))}</TableCell>
                  <TableCell>
                    <Badge variant={sale.paymentStatus === "SUCCESS" ? "success" : "destructive"}>
                      {SALES_STATUS_LABELS[sale.paymentStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sale.commissionEvent ? `${Number(sale.commissionEvent.commissionRate)}%` : "-"}
                  </TableCell>
                  <TableCell className="font-medium text-green-700">
                    {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
                  </TableCell>
                  <TableCell>
                    {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.operatorAmount)) : "-"}
                  </TableCell>
                  <TableCell>
                    {sale.commissionEvent ? (
                      <Badge variant={sale.commissionEvent.status === "CONFIRMED" ? "success" : "secondary"}>
                        {COMMISSION_EVENT_STATUS_LABELS[sale.commissionEvent.status]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">未計算</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    売上データがありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {total > pageSize && (
            <div className="mt-4 flex justify-center gap-2">
              {page > 1 && (
                <Link href={`/agency/sales?page=${page - 1}`}>
                  <Button variant="outline" size="sm">前へ</Button>
                </Link>
              )}
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              {page < Math.ceil(total / pageSize) && (
                <Link href={`/agency/sales?page=${page + 1}`}>
                  <Button variant="outline" size="sm">次へ</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
