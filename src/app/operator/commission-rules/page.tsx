import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { COMMISSION_TYPE_LABELS } from "@/lib/utils/constants";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CommissionRulesPage() {
  const rules = await prisma.commissionRule.findMany({
    include: {
      agency: { select: { code: true, name: true } },
      plan: { select: { code: true, name: true } },
    },
    orderBy: { effectiveFrom: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">還元率設定</h1>
          <p className="text-muted-foreground text-sm mt-1">代理店ごとの還元率ルールを管理します</p>
        </div>
        <Link href="/operator/commission-rules/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規ルール
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代理店</TableHead>
                  <TableHead>プラン</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>還元率/金額</TableHead>
                  <TableHead>適用開始</TableHead>
                  <TableHead>適用終了</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>説明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const isActive = !rule.effectiveTo || new Date(rule.effectiveTo) > new Date();
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.agency.code} {rule.agency.name}</TableCell>
                      <TableCell>{rule.plan ? rule.plan.name : "全プラン"}</TableCell>
                      <TableCell>{COMMISSION_TYPE_LABELS[rule.commissionType]}</TableCell>
                      <TableCell className="font-semibold">
                        {rule.commissionType === "PERCENTAGE"
                          ? `${Number(rule.rate)}%`
                          : formatJPY(Number(rule.rate))}
                      </TableCell>
                      <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                      <TableCell>{rule.effectiveTo ? formatDate(rule.effectiveTo) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "success" : "secondary"}>
                          {isActive ? "有効" : "終了"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.description || "-"}</TableCell>
                    </TableRow>
                  );
                })}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      還元率ルールが設定されていません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden space-y-3">
            {rules.map((rule) => {
              const isActive = !rule.effectiveTo || new Date(rule.effectiveTo) > new Date();
              return (
                <div key={rule.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{rule.agency.code} {rule.agency.name}</span>
                    <Badge variant={isActive ? "success" : "secondary"}>
                      {isActive ? "有効" : "終了"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">プラン</p>
                      <p>{rule.plan ? rule.plan.name : "全プラン"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">還元率/金額</p>
                      <p className="font-bold">
                        {rule.commissionType === "PERCENTAGE" ? `${Number(rule.rate)}%` : formatJPY(Number(rule.rate))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">適用開始</p>
                      <p>{formatDate(rule.effectiveFrom)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">適用終了</p>
                      <p>{rule.effectiveTo ? formatDate(rule.effectiveTo) : "-"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {rules.length === 0 && (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                還元率ルールが設定されていません。
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
