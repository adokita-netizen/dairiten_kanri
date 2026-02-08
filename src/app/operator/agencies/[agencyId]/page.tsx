import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import {
  AGENCY_STATUS_LABELS,
  COMMISSION_TYPE_LABELS,
  COMMISSION_EVENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  BANK_ACCOUNT_TYPE_LABELS,
} from "@/lib/utils/constants";
import Link from "next/link";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  const { agencyId } = await params;

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: {
      balance: true,
      users: { select: { id: true, email: true, name: true, isActive: true } },
      commissionRules: {
        orderBy: { effectiveFrom: "desc" },
        include: { plan: { select: { code: true, name: true } } },
      },
      payoutRequests: {
        orderBy: { requestedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!agency) notFound();

  const recentSales = await prisma.salesRecord.findMany({
    where: { agencyId },
    include: {
      plan: { select: { code: true, name: true } },
      commissionEvent: true,
    },
    orderBy: { transactionDate: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{agency.name}</h1>
          <p className="text-sm text-muted-foreground">{agency.code}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={agency.status === "ACTIVE" ? "success" : agency.status === "SUSPENDED" ? "destructive" : "warning"}>
            {AGENCY_STATUS_LABELS[agency.status]}
          </Badge>
          <Link href={`/operator/agencies/${agencyId}/edit`}>
            <Button variant="outline" size="sm">編集</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">確定残高</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatJPY(Number(agency.balance?.confirmedBalance || 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">保留中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatJPY(Number(agency.balance?.holdBalance || 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">累計報酬</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatJPY(Number(agency.balance?.totalEarned || 0))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">支払済</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatJPY(Number(agency.balance?.totalPaidOut || 0))}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="rules">還元率ルール</TabsTrigger>
          <TabsTrigger value="sales">売上明細</TabsTrigger>
          <TabsTrigger value="payouts">支払履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">担当者名</p>
                <p className="font-medium">{agency.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">メールアドレス</p>
                <p className="font-medium">{agency.contactEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">電話番号</p>
                <p className="font-medium">{agency.contactPhone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">最低支払額</p>
                <p className="font-medium">{formatJPY(Number(agency.payoutThreshold))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">保留期間</p>
                <p className="font-medium">{agency.holdPeriodDays}日</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">登録日</p>
                <p className="font-medium">{formatDate(agency.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">振込先情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">銀行名</p>
                <p className="font-medium">{agency.bankName || "未登録"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">支店名</p>
                <p className="font-medium">{agency.bankBranchName || "未登録"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">口座種別</p>
                <p className="font-medium">{agency.bankAccountType ? BANK_ACCOUNT_TYPE_LABELS[agency.bankAccountType] : "未登録"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">口座番号</p>
                <p className="font-medium">{agency.bankAccountNumber || "未登録"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">口座名義</p>
                <p className="font-medium">{agency.bankAccountHolder || "未登録"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">ユーザー一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>状態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agency.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name || "-"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "success" : "secondary"}>
                            {user.isActive ? "有効" : "無効"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {agency.users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">ユーザーが登録されていません</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card list */}
              <div className="sm:hidden space-y-3">
                {agency.users.map((user) => (
                  <div key={user.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{user.name || "-"}</p>
                      <Badge variant={user.isActive ? "success" : "secondary"}>
                        {user.isActive ? "有効" : "無効"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                ))}
                {agency.users.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">ユーザーが登録されていません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {/* Desktop table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>プラン</TableHead>
                      <TableHead>種別</TableHead>
                      <TableHead>還元率/金額</TableHead>
                      <TableHead>適用開始日</TableHead>
                      <TableHead>適用終了日</TableHead>
                      <TableHead>説明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agency.commissionRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.plan ? rule.plan.name : "全プラン（デフォルト）"}</TableCell>
                        <TableCell>{COMMISSION_TYPE_LABELS[rule.commissionType]}</TableCell>
                        <TableCell className="font-medium">
                          {rule.commissionType === "PERCENTAGE"
                            ? `${Number(rule.rate)}%`
                            : formatJPY(Number(rule.rate))}
                        </TableCell>
                        <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                        <TableCell>{rule.effectiveTo ? formatDate(rule.effectiveTo) : "現在有効"}</TableCell>
                        <TableCell>{rule.description || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {agency.commissionRules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">還元率ルールが設定されていません</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card list */}
              <div className="lg:hidden space-y-3">
                {agency.commissionRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{rule.plan ? rule.plan.name : "全プラン（デフォルト）"}</p>
                      <span className="text-sm font-medium">
                        {rule.commissionType === "PERCENTAGE"
                          ? `${Number(rule.rate)}%`
                          : formatJPY(Number(rule.rate))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{COMMISSION_TYPE_LABELS[rule.commissionType]}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>{formatDate(rule.effectiveFrom)}</span>
                      <span> ~ </span>
                      <span>{rule.effectiveTo ? formatDate(rule.effectiveTo) : "現在有効"}</span>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    )}
                  </div>
                ))}
                {agency.commissionRules.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">還元率ルールが設定されていません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {/* Desktop table */}
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
                      <TableHead>運営者取り分</TableHead>
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
                          {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.operatorAmount)) : "-"}
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
                        <TableCell colSpan={8} className="text-center text-muted-foreground">売上データがありません</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card list */}
              <div className="lg:hidden space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{formatDate(sale.transactionDate)}</p>
                      <Badge variant={sale.commissionEvent?.status === "CONFIRMED" ? "success" : "secondary"}>
                        {sale.commissionEvent ? COMMISSION_EVENT_STATUS_LABELS[sale.commissionEvent.status] : "未計算"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{sale.customerName || sale.customerRef || "-"}</p>
                      <p className="text-sm">{sale.plan?.name || "-"}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">売上（税抜）</p>
                        <p className="font-medium">{formatJPY(Number(sale.saleAmountExTax))}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">報酬額</p>
                        <p className="font-medium text-green-700">
                          {sale.commissionEvent ? formatJPY(Number(sale.commissionEvent.agencyAmount)) : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {recentSales.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">売上データがありません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              {/* Desktop table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請日</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>承認日</TableHead>
                      <TableHead>支払日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agency.payoutRequests.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.requestedAt)}</TableCell>
                        <TableCell>{formatJPY(Number(p.amount))}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "PAID" ? "success" : p.status === "REJECTED" ? "destructive" : "warning"}>
                            {PAYOUT_STATUS_LABELS[p.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.approvedAt ? formatDate(p.approvedAt) : "-"}</TableCell>
                        <TableCell>{p.paidAt ? formatDate(p.paidAt) : "-"}</TableCell>
                      </TableRow>
                    ))}
                    {agency.payoutRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">支払履歴がありません</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile card list */}
              <div className="lg:hidden space-y-3">
                {agency.payoutRequests.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{formatDate(p.requestedAt)}</p>
                      <Badge variant={p.status === "PAID" ? "success" : p.status === "REJECTED" ? "destructive" : "warning"}>
                        {PAYOUT_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{formatJPY(Number(p.amount))}</p>
                    {(p.approvedAt || p.paidAt) && (
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {p.approvedAt && <span>承認: {formatDate(p.approvedAt)}</span>}
                        {p.paidAt && <span>支払: {formatDate(p.paidAt)}</span>}
                      </div>
                    )}
                  </div>
                ))}
                {agency.payoutRequests.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">支払履歴がありません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
