import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { PAYOUT_STATUS_LABELS, AGENCY_STATUS_LABELS } from "@/lib/utils/constants";
import { Building2, Receipt, Wallet, Clock } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">有効代理店数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今月の売上</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(Number(monthlySales._sum.saleAmountExTax || 0))}</div>
            <p className="text-xs text-muted-foreground">{monthlySales._count}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">未処理支払</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJPY(Number(pendingPayouts._sum.amount || 0))}</div>
            <p className="text-xs text-muted-foreground">{pendingPayouts._count}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今月の報酬合計</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatJPY(topAgencies.reduce((sum, a) => sum + Number(a._sum.agencyAmount || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>未処理の支払申請</CardTitle>
              <Link href="/operator/payouts">
                <Button variant="outline" size="sm">全て見る</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">未処理の支払申請はありません。</p>
            ) : (
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
                      <TableCell>{formatJPY(Number(p.amount))}</TableCell>
                      <TableCell>{formatDate(p.requestedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="warning">{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>代理店別売上ランキング（今月）</CardTitle>
              <Link href="/operator/agencies">
                <Button variant="outline" size="sm">全て見る</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topAgencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">今月の売上データはありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>代理店</TableHead>
                    <TableHead>売上</TableHead>
                    <TableHead>報酬</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgencies.map((a) => {
                    const agency = agencyMap.get(a.agencyId);
                    return (
                      <TableRow key={a.agencyId}>
                        <TableCell className="font-medium">
                          {agency ? `${agency.code} ${agency.name}` : a.agencyId}
                        </TableCell>
                        <TableCell>{formatJPY(Number(a._sum.saleAmount || 0))}</TableCell>
                        <TableCell>{formatJPY(Number(a._sum.agencyAmount || 0))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
