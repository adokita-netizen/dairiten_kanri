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
import { Receipt, TrendingUp, Clock } from "lucide-react";
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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sales, total, monthlySummary, totalCommission] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { agencyId },
      include: {
        plan: { select: { code: true, name: true } },
        commissionEvent: {
          select: {
            status: true,
            commissionRate: true,
            agencyAmount: true,
          },
        },
      },
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesRecord.count({ where: { agencyId } }),
    prisma.salesRecord.aggregate({
      where: { agencyId, paymentStatus: "SUCCESS", transactionDate: { gte: monthStart } },
      _sum: { saleAmountExTax: true },
      _count: true,
    }),
    prisma.commissionEvent.aggregate({
      where: { agencyId, status: { in: ["HOLD", "CONFIRMED", "PAID"] } },
      _sum: { agencyAmount: true },
      _count: true,
    }),
  ]);

  const stats = [
    {
      label: "今月の売上（税抜）",
      value: formatJPY(Number(monthlySummary._sum.saleAmountExTax || 0)),
      sub: `${monthlySummary._count}件`,
      icon: Receipt,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "累計報酬額",
      value: formatJPY(Number(totalCommission._sum.agencyAmount || 0)),
      sub: `${totalCommission._count}件`,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "全売上件数",
      value: `${total}件`,
      icon: Clock,
      color: "text-violet-600 bg-violet-50",
    },
  ];

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

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden lg:block">
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
                    <TableCell className="font-medium text-emerald-700">
                      {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
                    </TableCell>
                    <TableCell>
                      {sale.commissionEvent ? (
                        <Badge variant={sale.commissionEvent.status === "CONFIRMED" || sale.commissionEvent.status === "PAID" ? "success" : sale.commissionEvent.status === "INVALIDATED" ? "destructive" : "secondary"}>
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
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      売上データがありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(sale.transactionDate)}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={sale.paymentStatus === "SUCCESS" ? "success" : "destructive"} className="text-[10px]">
                      {SALES_STATUS_LABELS[sale.paymentStatus]}
                    </Badge>
                    <Badge variant={sale.commissionEvent?.status === "CONFIRMED" || sale.commissionEvent?.status === "PAID" ? "success" : "secondary"} className="text-[10px]">
                      {sale.commissionEvent ? COMMISSION_EVENT_STATUS_LABELS[sale.commissionEvent.status] : "未計算"}
                    </Badge>
                  </div>
                </div>
                <p className="font-medium">{sale.customerName || sale.customerRef || "-"}</p>
                <p className="text-xs text-muted-foreground">{sale.plan?.name || "-"}</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">税抜</p>
                    <p className="font-semibold">{formatJPY(Number(sale.saleAmountExTax))}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">還元率</p>
                    <p>{sale.commissionEvent ? `${Number(sale.commissionEvent.commissionRate)}%` : "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">報酬額</p>
                    <p className="font-semibold text-emerald-600">
                      {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <p className="text-center text-muted-foreground py-8">売上データがありません。</p>
            )}
          </div>

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
