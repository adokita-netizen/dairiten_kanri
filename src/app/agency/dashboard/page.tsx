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
import { Wallet, TrendingUp, CheckCircle, Clock, ArrowRight, AlertCircle, ArrowUpRight, ShieldCheck } from "lucide-react";
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
      select: {
        payoutThreshold: true,
        name: true,
        depositAmount: true,
        depositPaid: true,
        depositRefunded: true,
        depositRefundable: true,
      },
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

  const stats = [
    {
      label: "引き出し可能額",
      value: formatJPY(availableBalance),
      sub: pendingAmount > 0 ? `申請中: ${formatJPY(pendingAmount)}` : undefined,
      icon: Wallet,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "保留中の報酬",
      value: formatJPY(holdBalance),
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "累計報酬",
      value: formatJPY(totalEarned),
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "累計支払済",
      value: formatJPY(totalPaidOut),
      icon: CheckCircle,
      color: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm mt-1">売上と報酬の概要を確認できます</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-xl lg:text-2xl font-bold tracking-tight">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                </div>
                <div className={`flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payout Status Card */}
      <Card className={canRequestPayout ? "border-emerald-200 bg-emerald-50/30" : ""}>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {canRequestPayout ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              )}
              <div>
                {canRequestPayout ? (
                  <>
                    <p className="font-semibold text-emerald-700">引き出し申請が可能です</p>
                    <p className="text-sm text-emerald-600/80">
                      確定残高が閾値（{formatJPY(threshold)}）以上です
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">引き出し申請まであと {formatJPY(amountUntilThreshold)}</p>
                    <p className="text-sm text-muted-foreground">
                      閾値: {formatJPY(threshold)} / 未達分は自動で翌月に繰越
                    </p>
                  </>
                )}
              </div>
            </div>
            <Link href="/agency/payouts/new">
              <Button disabled={!canRequestPayout} className="w-full sm:w-auto gap-1.5">
                引き出し申請 <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {latestPayout && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                最新の申請: {formatJPY(Number(latestPayout.amount))}
              </p>
              <Badge variant={latestPayout.status === "PAID" ? "success" : "warning"}>
                {PAYOUT_STATUS_LABELS[latestPayout.status]}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Status */}
      {agency.depositPaid && !agency.depositRefunded && (
        <Card className={agency.depositRefundable ? "border-emerald-200 bg-emerald-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${agency.depositRefundable ? "bg-emerald-100" : "bg-blue-100"}`}>
                <ShieldCheck className={`h-5 w-5 ${agency.depositRefundable ? "text-emerald-600" : "text-blue-600"}`} />
              </div>
              <div>
                <p className="font-semibold">
                  デポジット: {formatJPY(Number(agency.depositAmount))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {agency.depositRefundable
                    ? "返金可能 - 返金をご希望の場合は運営者にお問い合わせください"
                    : "預かり中"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {agency.depositRefunded && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">デポジット: {formatJPY(Number(agency.depositAmount))}</p>
                <p className="text-sm text-muted-foreground">返金済み</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Sales & Recent Sales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>売上明細</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                今月の売上: {formatJPY(Number(monthlySales._sum.saleAmountExTax || 0))}（{monthlySales._count}件）
              </p>
            </div>
            <Link href="/agency/sales">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                全て見る <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
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
                    <TableCell className="text-muted-foreground">{formatDate(sale.transactionDate)}</TableCell>
                    <TableCell className="font-medium">{sale.customerName || sale.customerRef || "-"}</TableCell>
                    <TableCell>{sale.plan?.name || "-"}</TableCell>
                    <TableCell className="font-semibold">{formatJPY(Number(sale.saleAmountExTax))}</TableCell>
                    <TableCell>
                      {sale.commissionEvent ? `${Number(sale.commissionEvent.commissionRate)}%` : "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
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
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      売上データがありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="lg:hidden space-y-3">
            {recentSales.map((sale) => (
              <div key={sale.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatDate(sale.transactionDate)}</span>
                  <Badge variant={sale.commissionEvent?.status === "CONFIRMED" ? "success" : "secondary"}>
                    {sale.commissionEvent ? COMMISSION_EVENT_STATUS_LABELS[sale.commissionEvent.status] : "未計算"}
                  </Badge>
                </div>
                <p className="font-medium">{sale.customerName || sale.customerRef || "-"}</p>
                <p className="text-sm text-muted-foreground">{sale.plan?.name || "-"}</p>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">売上（税抜）</p>
                    <p className="font-semibold">{formatJPY(Number(sale.saleAmountExTax))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">報酬額</p>
                    <p className="font-semibold text-emerald-600">
                      {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                売上データがありません
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
