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
import { PAYOUT_STATUS_LABELS, BANK_ACCOUNT_TYPE_LABELS } from "@/lib/utils/constants";
import { formatJPY } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/date";

export default function PayoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const payoutId = params.payoutId as string;
  const [payout, setPayout] = useState<Record<string, unknown> | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/data/payouts/${payoutId}`)
      .then((r) => r.json())
      .then(setPayout)
      .catch(() => router.push("/operator/payouts"));
  }, [payoutId, router]);

  if (!payout) return <div className="py-8 text-center text-muted-foreground">読み込み中...</div>;

  async function handleApprove() {
    setLoading(true);
    try {
      await approvePayout(payoutId);
      router.push("/operator/payouts");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      alert("却下理由を入力してください");
      return;
    }
    setLoading(true);
    try {
      await rejectPayout(payoutId, rejectReason);
      router.push("/operator/payouts");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    setLoading(true);
    try {
      await markPayoutAsPaid(payoutId);
      router.push("/operator/payouts");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
      setLoading(false);
    }
  }

  const status = payout.status as string;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">支払申請詳細</h1>
        <p className="mt-1 text-sm text-muted-foreground">支払申請の詳細と承認操作</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>申請情報</CardTitle>
            <Badge>{PAYOUT_STATUS_LABELS[status] || status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">銀行名</p>
              <p className="font-medium">{payout.bankName as string}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座番号</p>
              <p className="font-medium">{payout.bankAccountNumber as string}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">口座名義</p>
              <p className="font-medium">{payout.bankAccountHolder as string}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {status === "REQUESTED" && (
        <Card>
          <CardHeader><CardTitle>操作</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleApprove} disabled={loading} className="w-full">承認する</Button>
            <Separator />
            <div className="space-y-2">
              <Label>却下理由</Label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="却下理由を入力" />
            </div>
            <Button variant="destructive" onClick={handleReject} disabled={loading} className="w-full">却下する</Button>
          </CardContent>
        </Card>
      )}

      {status === "APPROVED" && (
        <Card>
          <CardHeader><CardTitle>支払処理</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleMarkPaid} disabled={loading} className="w-full">支払済にする</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
