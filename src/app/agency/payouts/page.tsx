import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { PAYOUT_STATUS_LABELS } from "@/lib/utils/constants";
import { Wallet, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

export default async function AgencyPayoutsPage() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");
  const agencyId = session.user.agencyId;

  const [payouts, balance, pendingPayouts] = await Promise.all([
    prisma.payoutRequest.findMany({
      where: { agencyId },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.balance.findUnique({ where: { agencyId } }),
    prisma.payoutRequest.aggregate({
      where: { agencyId, status: { in: ["REQUESTED", "APPROVED"] } },
      _sum: { amount: true },
    }),
  ]);

  const confirmedBalance = Number(balance?.confirmedBalance || 0);
  const totalPaidOut = Number(balance?.totalPaidOut || 0);
  const pendingAmount = Number(pendingPayouts._sum.amount || 0);
  const availableBalance = confirmedBalance - pendingAmount;

  const stats = [
    {
      label: "引き出し可能額",
      value: formatJPY(availableBalance),
      icon: Wallet,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "申請中",
      value: formatJPY(pendingAmount),
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "累計支払済",
      value: formatJPY(totalPaidOut),
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">引き出し履歴</h1>
          <p className="text-sm text-muted-foreground mt-1">引き出し申請の履歴と状態を確認できます</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/export/payouts?format=csv`} download>CSV出力</a>
          </Button>
          <Link href="/agency/payouts/new">
            <Button size="sm">新規申請</Button>
          </Link>
        </div>
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
                  <TableHead>申請日</TableHead>
                  <TableHead>申請額</TableHead>
                  <TableHead>振込手数料</TableHead>
                  <TableHead>振込額</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>承認日</TableHead>
                  <TableHead>支払日</TableHead>
                  <TableHead>備考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.requestedAt)}</TableCell>
                    <TableCell>{formatJPY(Number(p.amount))}</TableCell>
                    <TableCell>{formatJPY(Number(p.transferFee))}</TableCell>
                    <TableCell className="font-bold">{formatJPY(Number(p.netAmount))}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "PAID" ? "success" : p.status === "REJECTED" ? "destructive" : "warning"}>
                        {PAYOUT_STATUS_LABELS[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.approvedAt ? formatDate(p.approvedAt) : "-"}</TableCell>
                    <TableCell>{p.paidAt ? formatDate(p.paidAt) : "-"}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                      {p.rejectionReason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {payouts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      引き出し履歴がありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(p.requestedAt)}</span>
                  <Badge variant={p.status === "PAID" ? "success" : p.status === "REJECTED" ? "destructive" : "warning"}>
                    {PAYOUT_STATUS_LABELS[p.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">申請額</p>
                    <p className="font-semibold text-lg">{formatJPY(Number(p.amount))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">振込額</p>
                    <p className="font-bold text-lg">{formatJPY(Number(p.netAmount))}</p>
                  </div>
                </div>
                {(p.paidAt || p.rejectionReason) && (
                  <div className="pt-2 border-t text-sm">
                    {p.paidAt && (
                      <p className="text-muted-foreground">支払日: {formatDate(p.paidAt)}</p>
                    )}
                    {p.rejectionReason && (
                      <p className="text-destructive mt-1">{p.rejectionReason}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {payouts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">引き出し履歴がありません。</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
