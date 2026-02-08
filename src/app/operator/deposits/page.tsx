import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { AGENCY_STATUS_LABELS } from "@/lib/utils/constants";
import Link from "next/link";
import { Banknote, CheckCircle, Clock, RotateCcw, ShieldCheck } from "lucide-react";

export default async function DepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 20;
  const filter = params.filter || "all";

  const where: Record<string, unknown> = {};
  if (filter === "unpaid") {
    where.depositPaid = false;
    where.depositRefunded = false;
  } else if (filter === "paid") {
    where.depositPaid = true;
    where.depositRefunded = false;
  } else if (filter === "refunded") {
    where.depositRefunded = true;
  }

  const [agencies, total, paidCount, unpaidCount, refundedCount] = await Promise.all([
    prisma.agency.findMany({
      where,
      include: {
        balance: { select: { confirmedBalance: true, totalEarned: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agency.count({ where }),
    prisma.agency.count({ where: { depositPaid: true, depositRefunded: false } }),
    prisma.agency.count({ where: { depositPaid: false, depositRefunded: false } }),
    prisma.agency.count({ where: { depositRefunded: true } }),
  ]);

  const paidAgencies = await prisma.agency.findMany({
    where: { depositPaid: true, depositRefunded: false },
    select: { depositAmount: true },
  });
  const totalHeld = paidAgencies.reduce((sum, a) => sum + Number(a.depositAmount), 0);

  const stats = [
    { label: "預かり中", value: formatJPY(totalHeld), count: `${paidCount}社`, icon: Banknote, color: "text-blue-600 bg-blue-50" },
    { label: "未入金", value: `${unpaidCount}社`, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "返金済", value: `${refundedCount}社`, icon: RotateCcw, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">デポジット管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">代理店のデポジット入金・返金状況を管理します</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  {stat.count && <p className="text-xs text-muted-foreground">{stat.count}</p>}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Link href="/operator/deposits"><Button variant={filter === "all" ? "default" : "outline"} size="sm">全て</Button></Link>
        <Link href="/operator/deposits?filter=unpaid"><Button variant={filter === "unpaid" ? "default" : "outline"} size="sm">未入金</Button></Link>
        <Link href="/operator/deposits?filter=paid"><Button variant={filter === "paid" ? "default" : "outline"} size="sm">預かり中</Button></Link>
        <Link href="/operator/deposits?filter=refunded"><Button variant={filter === "refunded" ? "default" : "outline"} size="sm">返金済</Button></Link>
      </div>

      {/* Desktop Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>代理店名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>デポジット額</TableHead>
                  <TableHead>入金状況</TableHead>
                  <TableHead>返金可能</TableHead>
                  <TableHead>累計報酬</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-mono text-sm">{agency.code}</TableCell>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>
                      <Badge variant={agency.status === "ACTIVE" ? "success" : "secondary"}>
                        {AGENCY_STATUS_LABELS[agency.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatJPY(Number(agency.depositAmount))}</TableCell>
                    <TableCell>
                      {agency.depositRefunded ? (
                        <Badge variant="secondary">返金済</Badge>
                      ) : agency.depositPaid ? (
                        <Badge variant="success">入金済</Badge>
                      ) : (
                        <Badge variant="warning">未入金</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {agency.depositRefundable ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                          <ShieldCheck className="h-4 w-4" /> 可能
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatJPY(Number(agency.balance?.totalEarned || 0))}</TableCell>
                    <TableCell>
                      <Link href={`/operator/deposits/${agency.id}`}>
                        <Button variant="ghost" size="sm">管理</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {agencies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      該当する代理店がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {agencies.map((agency) => (
              <Link key={agency.id} href={`/operator/deposits/${agency.id}`}>
                <div className="rounded-xl border bg-card p-4 space-y-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{agency.name}</p>
                      <p className="text-xs text-muted-foreground">{agency.code}</p>
                    </div>
                    {agency.depositRefunded ? (
                      <Badge variant="secondary">返金済</Badge>
                    ) : agency.depositPaid ? (
                      <Badge variant="success">入金済</Badge>
                    ) : (
                      <Badge variant="warning">未入金</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">デポジット額</p>
                      <p className="font-semibold">{formatJPY(Number(agency.depositAmount))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">返金可能</p>
                      <p className={agency.depositRefundable ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                        {agency.depositRefundable ? "可能" : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {agencies.length === 0 && (
              <p className="text-center text-muted-foreground py-8">該当する代理店がありません</p>
            )}
          </div>

          {total > pageSize && (
            <div className="mt-4 flex justify-center gap-2">
              {page > 1 && (
                <Link href={`/operator/deposits?filter=${filter}&page=${page - 1}`}>
                  <Button variant="outline" size="sm">前へ</Button>
                </Link>
              )}
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {Math.ceil(total / pageSize)}
              </span>
              {page < Math.ceil(total / pageSize) && (
                <Link href={`/operator/deposits?filter=${filter}&page=${page + 1}`}>
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
