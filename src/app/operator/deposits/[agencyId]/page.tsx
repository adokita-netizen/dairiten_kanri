"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { markDepositPaid, refundDeposit, toggleDepositRefundable, updateDepositAmount } from "@/lib/services/deposit.service";
import { getAgency } from "@/lib/services/agency.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatJPY } from "@/lib/utils/currency";
import { AGENCY_STATUS_LABELS } from "@/lib/utils/constants";
import { ArrowLeft, Banknote, CheckCircle, RotateCcw, ShieldCheck, ShieldOff, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DepositDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agencyId = params.agencyId as string;
  const [agency, setAgency] = useState<Awaited<ReturnType<typeof getAgency>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editAmount, setEditAmount] = useState(false);
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    getAgency(agencyId).then((a) => {
      setAgency(a);
      setNewAmount(String(Number(a.depositAmount)));
    }).catch(() => router.push("/operator/deposits"));
  }, [agencyId, router]);

  if (!agency) return <div className="py-8 text-center text-muted-foreground">読み込み中...</div>;

  const depositAmount = Number(agency.depositAmount);
  const totalEarned = Number(agency.balance?.totalEarned || 0);

  async function handleMarkPaid() {
    if (!agency) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await markDepositPaid(agencyId);
      setMessage("デポジットを入金済みに更新しました");
      const updated = await getAgency(agencyId);
      setAgency(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
    setLoading(false);
  }

  async function handleRefund() {
    if (!agency || !confirm(`${agency.name} のデポジット ${formatJPY(depositAmount)} を返金しますか？`)) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await refundDeposit(agencyId);
      setMessage("デポジットを返金済みに更新しました");
      const updated = await getAgency(agencyId);
      setAgency(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
    setLoading(false);
  }

  async function handleToggleRefundable() {
    if (!agency) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const newVal = !agency.depositRefundable;
      await toggleDepositRefundable(agencyId, newVal);
      setMessage(newVal ? "返金可能に設定しました" : "返金不可に設定しました");
      const updated = await getAgency(agencyId);
      setAgency(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
    setLoading(false);
  }

  async function handleUpdateAmount() {
    if (!agency) return;
    const amount = Number(newAmount);
    if (isNaN(amount) || amount < 0) {
      setError("有効な金額を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await updateDepositAmount(agencyId, amount);
      setMessage("デポジット金額を更新しました");
      setEditAmount(false);
      const updated = await getAgency(agencyId);
      setAgency(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
    setLoading(false);
  }

  const statusLabel = agency.depositRefunded
    ? "返金済"
    : agency.depositPaid
    ? "入金済（預かり中）"
    : "未入金";

  const statusVariant = agency.depositRefunded
    ? "secondary" as const
    : agency.depositPaid
    ? "success" as const
    : "warning" as const;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <Link href="/operator/deposits" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" />
          デポジット一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold">{agency.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">{agency.code}</span>
          <Badge variant={agency.status === "ACTIVE" ? "success" : "secondary"}>
            {AGENCY_STATUS_LABELS[agency.status]}
          </Badge>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Deposit Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>デポジット状況</CardTitle>
              <CardDescription className="mt-1">入金・返金の管理</CardDescription>
            </div>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">デポジット金額</p>
              <p className="text-2xl font-bold">{formatJPY(depositAmount)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">累計報酬</p>
              <p className="text-2xl font-bold">{formatJPY(totalEarned)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">返金可能設定</p>
              <p className={`text-lg font-bold ${agency.depositRefundable ? "text-emerald-600" : "text-muted-foreground"}`}>
                {agency.depositRefundable ? "可能" : "不可"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Amount Edit */}
          {!agency.depositRefunded && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">デポジット金額の変更</Label>
              {editAmount ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="金額（税込）"
                    />
                  </div>
                  <Button size="sm" onClick={handleUpdateAmount} disabled={loading}>保存</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditAmount(false)}>キャンセル</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditAmount(true)}>金額を変更</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mark as paid */}
          {!agency.depositPaid && !agency.depositRefunded && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">入金確認</p>
                  <p className="text-sm text-muted-foreground">デポジット {formatJPY(depositAmount)} の入金を確認</p>
                </div>
              </div>
              <Button onClick={handleMarkPaid} disabled={loading}>
                入金済みにする
              </Button>
            </div>
          )}

          {/* Toggle refundable */}
          {agency.depositPaid && !agency.depositRefunded && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${agency.depositRefundable ? "bg-amber-50" : "bg-emerald-50"}`}>
                  {agency.depositRefundable
                    ? <ShieldOff className="h-5 w-5 text-amber-600" />
                    : <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  }
                </div>
                <div>
                  <p className="font-medium">
                    {agency.depositRefundable ? "返金不可に変更" : "返金可能に設定"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {agency.depositRefundable
                      ? "代理店側で返金可能の表示を非表示にします"
                      : "代理店側にデポジット返金可能と表示します"}
                  </p>
                </div>
              </div>
              <Button
                variant={agency.depositRefundable ? "outline" : "default"}
                onClick={handleToggleRefundable}
                disabled={loading}
              >
                {agency.depositRefundable ? "返金不可にする" : "返金可能にする"}
              </Button>
            </div>
          )}

          {/* Refund */}
          {agency.depositPaid && !agency.depositRefunded && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <RotateCcw className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">デポジット返金</p>
                  <p className="text-sm text-muted-foreground">デポジット {formatJPY(depositAmount)} を返金処理</p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleRefund} disabled={loading}>
                返金する
              </Button>
            </div>
          )}

          {/* Already refunded */}
          {agency.depositRefunded && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-muted-foreground">デポジットは返金済みです</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
