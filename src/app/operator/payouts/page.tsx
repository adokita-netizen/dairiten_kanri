import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { PAYOUT_STATUS_LABELS } from "@/lib/utils/constants";
import Link from "next/link";

function getPayoutVariant(status: string) {
  switch (status) {
    case "PAID": return "success" as const;
    case "REJECTED": return "destructive" as const;
    case "CANCELLED": return "secondary" as const;
    default: return "warning" as const;
  }
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;

  const [payouts, total] = await Promise.all([
    prisma.payoutRequest.findMany({
      where,
      include: { agency: { select: { code: true, name: true } } },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payoutRequest.count({ where }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">支払管理</h1>
        <p className="text-muted-foreground text-sm mt-1">代理店からの支払申請を管理します</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/operator/payouts"><Button variant={!params.status ? "default" : "outline"} size="sm">全て</Button></Link>
        <Link href="/operator/payouts?status=REQUESTED"><Button variant={params.status === "REQUESTED" ? "default" : "outline"} size="sm">申請中</Button></Link>
        <Link href="/operator/payouts?status=APPROVED"><Button variant={params.status === "APPROVED" ? "default" : "outline"} size="sm">承認済</Button></Link>
        <Link href="/operator/payouts?status=PAID"><Button variant={params.status === "PAID" ? "default" : "outline"} size="sm">支払済</Button></Link>
        <Link href="/operator/payouts?status=REJECTED"><Button variant={params.status === "REJECTED" ? "default" : "outline"} size="sm">却下</Button></Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請日</TableHead>
                  <TableHead>代理店</TableHead>
                  <TableHead>申請額</TableHead>
                  <TableHead>振込手数料</TableHead>
                  <TableHead>振込額</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>承認日</TableHead>
                  <TableHead>支払日</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.requestedAt)}</TableCell>
                    <TableCell className="font-medium">{p.agency.code} {p.agency.name}</TableCell>
                    <TableCell>{formatJPY(Number(p.amount))}</TableCell>
                    <TableCell>{formatJPY(Number(p.transferFee))}</TableCell>
                    <TableCell className="font-semibold">{formatJPY(Number(p.netAmount))}</TableCell>
                    <TableCell>
                      <Badge variant={getPayoutVariant(p.status)}>{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                    </TableCell>
                    <TableCell>{p.approvedAt ? formatDate(p.approvedAt) : "-"}</TableCell>
                    <TableCell>{p.paidAt ? formatDate(p.paidAt) : "-"}</TableCell>
                    <TableCell>
                      <Link href={`/operator/payouts/${p.id}`}>
                        <Button variant="ghost" size="sm">詳細</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {payouts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      支払申請がありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-3">
            {payouts.map((p) => (
              <Link key={p.id} href={`/operator/payouts/${p.id}`} className="block">
                <div className="rounded-xl border bg-card p-4 space-y-2 active:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(p.requestedAt)}</span>
                    <Badge variant={getPayoutVariant(p.status)}>{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                  </div>
                  <p className="font-medium">{p.agency.code} {p.agency.name}</p>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-[11px] text-muted-foreground">申請額</p>
                      <p className="font-semibold">{formatJPY(Number(p.amount))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">振込額</p>
                      <p className="font-bold">{formatJPY(Number(p.netAmount))}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {payouts.length === 0 && (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                支払申請がありません。
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
