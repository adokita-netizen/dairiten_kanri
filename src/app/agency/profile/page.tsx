import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { AGENCY_STATUS_LABELS, BANK_ACCOUNT_TYPE_LABELS } from "@/lib/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

export default async function AgencyProfilePage() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: session.user.agencyId },
    include: {
      commissionRules: {
        where: { effectiveTo: null },
        include: { plan: { select: { name: true } } },
        orderBy: { effectiveFrom: "desc" },
      },
    },
  });

  const hasBankInfo = agency.bankName && agency.bankAccountNumber && agency.bankAccountHolder;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">プロフィール</h1>
        <p className="text-sm text-muted-foreground mt-1">登録情報と現在の還元率を確認できます</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>代理店情報</CardTitle>
            <Badge variant={agency.status === "ACTIVE" ? "success" : "secondary"}>
              {AGENCY_STATUS_LABELS[agency.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">代理店コード</p>
            <p className="font-medium font-mono">{agency.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">代理店名</p>
            <p className="font-medium">{agency.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">担当者名</p>
            <p className="font-medium">{agency.contactName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">メールアドレス</p>
            <p className="font-medium">{agency.contactEmail}</p>
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
        <CardHeader><CardTitle>振込先情報</CardTitle></CardHeader>
        <CardContent>
          {!hasBankInfo && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              振込先情報が未登録です。引き出し申請前に運営者にご連絡ください。
            </div>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">銀行名</p>
              <p className="font-medium">{agency.bankName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">支店名</p>
              <p className="font-medium">{agency.bankBranchName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座種別</p>
              <p className="font-medium">{agency.bankAccountType ? BANK_ACCOUNT_TYPE_LABELS[agency.bankAccountType] : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座番号</p>
              <p className="font-medium">{agency.bankAccountNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座名義</p>
              <p className="font-medium">{agency.bankAccountHolder || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>デポジット</CardTitle>
            {agency.depositRefunded ? (
              <Badge variant="secondary">返金済</Badge>
            ) : agency.depositPaid ? (
              agency.depositRefundable ? (
                <Badge variant="success">返金可能</Badge>
              ) : (
                <Badge variant="warning">預かり中</Badge>
              )
            ) : (
              <Badge variant="warning">未入金</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">デポジット金額</p>
            <p className="text-lg font-bold">{formatJPY(Number(agency.depositAmount))}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">状態</p>
            <p className="font-medium">
              {agency.depositRefunded
                ? "返金済み"
                : agency.depositPaid
                ? agency.depositRefundable
                  ? "入金済み・返金可能"
                  : "入金済み・預かり中"
                : "未入金"}
            </p>
          </div>
          {agency.depositRefundable && agency.depositPaid && !agency.depositRefunded && (
            <div className="col-span-full">
              <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
                デポジットの返金が可能です。返金をご希望の場合は運営者にお問い合わせください。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>現在の還元率</CardTitle></CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>対象プラン</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>還元率</TableHead>
                  <TableHead>適用開始日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agency.commissionRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.plan?.name || "全プラン"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {rule.commissionType === "PERCENTAGE" ? "パーセンテージ" : "固定金額"}
                    </TableCell>
                    <TableCell className="font-bold">
                      {rule.commissionType === "PERCENTAGE" ? `${Number(rule.rate)}%` : formatJPY(Number(rule.rate))}
                    </TableCell>
                    <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                  </TableRow>
                ))}
                {agency.commissionRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      還元率が設定されていません。運営者にお問い合わせください。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {agency.commissionRules.map((rule) => (
              <div key={rule.id} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{rule.plan?.name || "全プラン"}</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {rule.commissionType === "PERCENTAGE" ? `${Number(rule.rate)}%` : formatJPY(Number(rule.rate))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{rule.commissionType === "PERCENTAGE" ? "パーセンテージ" : "固定金額"}</span>
                  <span>{formatDate(rule.effectiveFrom)}から</span>
                </div>
              </div>
            ))}
            {agency.commissionRules.length === 0 && (
              <p className="text-center text-muted-foreground py-6">
                還元率が設定されていません。運営者にお問い合わせください。
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
