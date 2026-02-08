import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { PAYOUT_STATUS_LABELS } from "@/lib/utils/constants";
import Link from "next/link";

export default async function AgencyPayoutsPage() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");
  const agencyId = session.user.agencyId;

  const payouts = await prisma.payoutRequest.findMany({
    where: { agencyId },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">引き出し履歴</h1>
          <p className="text-sm text-muted-foreground mt-1">引き出し申請の履歴と状態</p>
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

      <Card>
        <CardContent className="pt-6">
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
                <TableHead>却下理由</TableHead>
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
                  <TableCell className="text-sm text-destructive">{p.rejectionReason || "-"}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
