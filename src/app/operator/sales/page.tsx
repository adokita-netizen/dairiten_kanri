import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { SALES_STATUS_LABELS, COMMISSION_EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import Link from "next/link";
import { Upload } from "lucide-react";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; agency?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (params.agency) where.agencyId = params.agency;

  const [sales, total] = await Promise.all([
    prisma.salesRecord.findMany({
      where,
      include: {
        agency: { select: { code: true, name: true } },
        plan: { select: { code: true, name: true } },
        commissionEvent: {
          select: { status: true, commissionRate: true, agencyAmount: true, operatorAmount: true },
        },
      },
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesRecord.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">売上管理</h1>
        <Link href="/operator/sales/import">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            CSV取込
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>取引日</TableHead>
                <TableHead>代理店</TableHead>
                <TableHead>顧客</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>売上（税抜）</TableHead>
                <TableHead>決済状態</TableHead>
                <TableHead>還元率</TableHead>
                <TableHead>報酬額</TableHead>
                <TableHead>報酬状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDate(sale.transactionDate)}</TableCell>
                  <TableCell>{sale.agency.code}</TableCell>
                  <TableCell>{sale.customerName || sale.customerRef || "-"}</TableCell>
                  <TableCell>{sale.plan?.name || "-"}</TableCell>
                  <TableCell>{formatJPY(Number(sale.saleAmountExTax))}</TableCell>
                  <TableCell>
                    <Badge variant={sale.paymentStatus === "SUCCESS" ? "success" : "destructive"}>
                      {SALES_STATUS_LABELS[sale.paymentStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sale.commissionEvent ? `${Number(sale.commissionEvent.commissionRate)}%` : "-"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
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
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    売上データがありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {total > pageSize && (
            <div className="mt-4 flex justify-center gap-2">
              {page > 1 && (
                <Link href={`/operator/sales?page=${page - 1}`}>
                  <Button variant="outline" size="sm">前へ</Button>
                </Link>
              )}
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              {page < Math.ceil(total / pageSize) && (
                <Link href={`/operator/sales?page=${page + 1}`}>
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
