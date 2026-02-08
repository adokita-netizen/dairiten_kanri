import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { COMMISSION_EVENT_STATUS_LABELS, PAYOUT_STATUS_LABELS } from "@/lib/utils/constants";
import { Wallet, TrendingUp, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

export default async function AgencyDashboard() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");
  const agencyId = session.user.agencyId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [agency, balance, monthlySales, recentSales, pendingPayouts, latestPayout] = await Promise.all([
    prisma.agency.findUniqueOrThrow({
      where: { id: agencyId },
      select: { payoutThreshold: true, name: true },
    }),
    prisma.balance.findUnique({ where: { agencyId } }),
    prisma.salesRecord.aggregate({
      where: { agencyId, paymentStatus: "SUCCESS", transactionDate: { gte: monthStart } },
      _sum: { saleAmountExTax: true },
      _count: true,
    }),
    prisma.salesRecord.findMany({
      where: { agencyId },
      include: {
        plan: { select: { name: true } },
        commissionEvent: { select: { status: true, commissionRate: true, agencyAmount: true } },
      },
      orderBy: { transactionDate: "desc" },
      take: 10,
    }),
    prisma.payoutRequest.aggregate({
      where: { agencyId, status: { in: ["REQUESTED", "APPROVED"] } },
      _sum: { amount: true },
    }),
    prisma.payoutRequest.findFirst({
      where: { agencyId },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const confirmedBalance = Number(balance?.confirmedBalance || 0);
  const holdBalance = Number(balance?.holdBalance || 0);
  const totalEarned = Number(balance?.totalEarned || 0);
  const totalPaidOut = Number(balance?.totalPaidOut || 0);
  const pendingAmount = Number(pendingPayouts._sum.amount || 0);
  const availableBalance = confirmedBalance - pendingAmount;
  const threshold = Number(agency.payoutThreshold);
  const canRequestPayout = availableBalance >= threshold;
  const amountUntilThreshold = canRequestPayout ? 0 : threshold - availableBalance;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">確定残高</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(availableBalance)}</div>
            {pendingAmount > 0 && (
              <p className="text-xs text-muted-foreground">申請中: {formatJPY(pendingAmount)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">保留中</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(holdBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">累計報酬</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(totalEarned)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">支払済</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(totalPaidOut)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>引き出し申請</CardTitle>
            <Link href="/agency/payouts/new">
              <Button disabled={!canRequestPayout} size="sm">
                引き出し申請
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {canRequestPayout ? (
            <p className="text-sm text-green-600">
              確定残高が閾値（{formatJPY(threshold)}）以上です。引き出し申請が可能です。
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              確定残高が閾値（{formatJPY(threshold)}）に達していません。
              あと{formatJPY(amountUntilThreshold)}で申請可能になります。未達分は自動で翌月以降に繰り越されます。
            </p>
          )}
          {latestPayout && (
            <div className="mt-3 rounded-md bg-muted p-3">
              <p className="text-sm">
                最新の申請: {formatJPY(Number(latestPayout.amount))} -{" "}
                <Badge variant={latestPayout.status === "PAID" ? "success" : "warning"}>
                  {PAYOUT_STATUS_LABELS[latestPayout.status]}
                </Badge>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>今月の売上: {formatJPY(Number(monthlySales._sum.saleAmountExTax || 0))}（{monthlySales._count}件）</CardTitle>
            <Link href="/agency/sales">
              <Button variant="outline" size="sm">全て見る</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>取引日</TableHead>
                <TableHead>顧客</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>売上（税抜）</TableHead>
                <TableHead>還元率</TableHead>
                <TableHead>報酬額</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatDate(sale.transactionDate)}</TableCell>
                  <TableCell>{sale.customerName || sale.customerRef || "-"}</TableCell>
                  <TableCell>{sale.plan?.name || "-"}</TableCell>
                  <TableCell>{formatJPY(Number(sale.saleAmountExTax))}</TableCell>
                  <TableCell>
                    {sale.commissionEvent ? `${Number(sale.commissionEvent.commissionRate)}%` : "-"}
                  </TableCell>
                  <TableCell className="font-medium text-green-700">
                    {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.commissionEvent?.status === "CONFIRMED" ? "success" : "secondary"}>
                      {sale.commissionEvent ? COMMISSION_EVENT_STATUS_LABELS[sale.commissionEvent.status] : "未計算"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">売上データがありません</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
