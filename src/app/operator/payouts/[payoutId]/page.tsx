"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { approvePayout, rejectPayout, markPayoutAsPaid } from "@/lib/services/payout.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PAYOUT_STATUS_LABELS } from "@/lib/utils/constants";
import { formatJPY } from "@/lib/utils/currency";
import { AlertCircle } from "lucide-react";

interface PayoutDetail {
  id: string;
  status: string;
  amount: string | number;
  netAmount: string | number;
  transferFee: string | number;
  bankName: string;
  bankBranchName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string;
  bankAccountHolder: string;
  rejectionReason: string | null;
  agency?: { code: string; name: string };
}

export default function PayoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const payoutId = params.payoutId as string;
  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`/api/data/payouts/${payoutId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setPayout)
      .catch(() => setFetchError(true));
  }, [payoutId]);

  if (fetchError) return (
    <div className="py-8 text-center space-y-4">
      <div className="flex items-center justify-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p>支払申請の取得に失敗しました。</p>
      </div>
      <Button variant="outline" onClick={() => router.push("/operator/payouts")}>一覧に戻る</Button>
    </div>
  );

  if (!payout) return <div className="py-8 text-center text-muted-foreground">読み込み中...</div>;

  async function handleApprove() {
    setLoading(true);
    setError("");
    try {
      await approvePayout(payoutId);
      router.push("/operator/payouts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setError("却下理由を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await rejectPayout(payoutId, rejectReason);
      router.push("/operator/payouts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    setLoading(true);
    setError("");
    try {
      await markPayoutAsPaid(payoutId);
      router.push("/operator/payouts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  const status = payout.status;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">支払申請詳細</h1>
        <p className="mt-1 text-sm text-muted-foreground">支払申請の詳細と承認操作</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>申請情報</CardTitle>
            <Badge>{PAYOUT_STATUS_LABELS[status] || status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {payout.agency && (
            <div>
              <p className="text-sm text-muted-foreground">代理店</p>
              <p className="font-medium">{payout.agency.code} {payout.agency.name}</p>
            </div>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">申請額</p>
              <p className="text-xl font-bold">{formatJPY(Number(payout.amount))}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">振込額</p>
              <p className="text-xl font-bold">{formatJPY(Number(payout.netAmount))}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">銀行名</p>
              <p className="font-medium">{payout.bankName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座番号</p>
              <p className="font-medium">{payout.bankAccountNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座名義</p>
              <p className="font-medium">{payout.bankAccountHolder || "-"}</p>
            </div>
          </div>
          {payout.rejectionReason && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">却下理由</p>
                <p className="font-medium text-destructive">{payout.rejectionReason}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {status === "REQUESTED" && (
        <Card>
          <CardHeader><CardTitle>操作</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading} className="w-full">承認する</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>支払申請の承認</AlertDialogTitle>
                  <AlertDialogDescription>
                    {payout.agency?.name} からの支払申請 {formatJPY(Number(payout.amount))} を承認しますか？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApprove}>承認する</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Separator />
            <div className="space-y-2">
              <Label>却下理由</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="却下理由を入力" />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading || !rejectReason.trim()} className="w-full">却下する</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>支払申請の却下</AlertDialogTitle>
                  <AlertDialogDescription>
                    {payout.agency?.name} からの支払申請を却下しますか？この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">却下する</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {status === "APPROVED" && (
        <Card>
          <CardHeader><CardTitle>支払処理</CardTitle></CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading} className="w-full">支払済にする</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>支払完了の確認</AlertDialogTitle>
                  <AlertDialogDescription>
                    {payout.agency?.name} への振込 {formatJPY(Number(payout.netAmount))} を支払済みにしますか？この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkPaid}>支払済にする</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
