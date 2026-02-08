import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { PAYOUT_STATUS_LABELS } from "@/lib/utils/constants";
import { Building2, Receipt, Wallet, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OperatorDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [agencyCount, monthlySales, pendingPayouts, recentPayouts, topAgencies] = await Promise.all([
    prisma.agency.count({ where: { status: "ACTIVE" } }),
    prisma.salesRecord.aggregate({
      where: { paymentStatus: "SUCCESS", transactionDate: { gte: monthStart } },
      _sum: { saleAmountExTax: true },
      _count: true,
    }),
    prisma.payoutRequest.aggregate({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payoutRequest.findMany({
      where: { status: "REQUESTED" },
      include: { agency: { select: { code: true, name: true } } },
      orderBy: { requestedAt: "desc" },
      take: 5,
    }),
    prisma.commissionEvent.groupBy({
      by: ["agencyId"],
      where: { periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 },
      _sum: { saleAmount: true, agencyAmount: true },
      orderBy: { _sum: { saleAmount: "desc" } },
      take: 5,
    }),
  ]);

  const agencyIds = topAgencies.map((a) => a.agencyId);
  const agencies = await prisma.agency.findMany({
    where: { id: { in: agencyIds } },
    select: { id: true, code: true, name: true },
  });
  const agencyMap = new Map(agencies.map((a) => [a.id, a]));

  const stats = [
    {
      label: "有効代理店数",
      value: `${agencyCount}社`,
      icon: Building2,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "今月の売上（税抜）",
      value: formatJPY(Number(monthlySales._sum.saleAmountExTax || 0)),
      sub: `${monthlySales._count}件`,
      icon: Receipt,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "未処理支払申請",
      value: formatJPY(Number(pendingPayouts._sum.amount || 0)),
      sub: `${pendingPayouts._count}件`,
      icon: Wallet,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "今月の報酬合計",
      value: formatJPY(topAgencies.reduce((sum, a) => sum + Number(a._sum.agencyAmount || 0), 0)),
      icon: Clock,
      color: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm mt-1">システム全体の概要を確認できます</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Payouts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>未処理の支払申請</CardTitle>
              <Link href="/operator/payouts">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  全て見る <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPayouts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">未処理の支払申請はありません</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>代理店</TableHead>
                        <TableHead>申請額</TableHead>
                        <TableHead>申請日</TableHead>
                        <TableHead>状態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPayouts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.agency.name}</TableCell>
                          <TableCell className="font-semibold">{formatJPY(Number(p.amount))}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(p.requestedAt)}</TableCell>
                          <TableCell>
                            <Badge variant="warning">{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-3">
                  {recentPayouts.map((p) => (
                    <div key={p.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{p.agency.name}</p>
                        <Badge variant="warning">{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{formatJPY(Number(p.amount))}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.requestedAt)}</p>
                      </div>
                      <div className="flex justify-end">
                        <Link href="/operator/payouts">
                          <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 px-2">
                            詳細 <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Agencies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>代理店別売上ランキング（今月）</CardTitle>
              <Link href="/operator/agencies">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  全て見る <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topAgencies.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">今月の売上データはありません</p>
              </div>
            ) : (
              <>
                {/* Desktop list */}
                <div className="hidden lg:block space-y-3">
                  {topAgencies.map((a, index) => {
                    const agency = agencyMap.get(a.agencyId);
                    return (
                      <div key={a.agencyId} className="flex items-center gap-4 rounded-lg border p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {agency ? agency.name : a.agencyId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {agency?.code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatJPY(Number(a._sum.saleAmount || 0))}</p>
                          <p className="text-xs text-emerald-600">報酬 {formatJPY(Number(a._sum.agencyAmount || 0))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-3">
                  {topAgencies.map((a, index) => {
                    const agency = agencyMap.get(a.agencyId);
                    return (
                      <div key={a.agencyId} className="rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {agency ? agency.name : a.agencyId}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-semibold text-sm">{formatJPY(Number(a._sum.saleAmount || 0))}</p>
                              <p className="text-xs text-emerald-600">報酬 {formatJPY(Number(a._sum.agencyAmount || 0))}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
