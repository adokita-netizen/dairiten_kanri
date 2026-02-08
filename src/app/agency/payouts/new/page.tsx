"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestPayout } from "@/lib/services/payout.service";
import { getBalanceSummary } from "@/lib/services/balance.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatJPY } from "@/lib/utils/currency";
import type { BalanceSummary } from "@/lib/types";
import { useSession } from "next-auth/react";

export default function NewPayoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<BalanceSummary | null>(null);

  useEffect(() => {
    if (session?.user?.agencyId) {
      getBalanceSummary(session.user.agencyId).then(setBalance).catch(() => {});
    }
  }, [session]);

  async function handleSubmit() {
    if (!session?.user?.agencyId) return;
    setLoading(true);
    setError("");

    try {
      await requestPayout(session.user.agencyId);
      router.push("/agency/payouts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  if (!balance) return <div className="py-8 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold">引き出し申請</h1>
        <p className="text-sm text-muted-foreground mt-1">確定残高から引き出し申請を行います</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>残高情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">確定残高</span>
            <span className="font-bold">{formatJPY(balance.confirmedBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">申請中</span>
            <span>{formatJPY(balance.pendingPayouts)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">引き出し可能額</span>
            <span className="text-xl font-bold">{formatJPY(balance.availableBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">最低支払額</span>
            <span>{formatJPY(balance.threshold)}</span>
          </div>
        </CardContent>
      </Card>

      {balance.canRequestPayout ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              確定残高の全額（{formatJPY(balance.availableBalance)}）を引き出し申請します。
              運営者の承認後、振込が行われます。
            </p>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "申請中..." : `${formatJPY(balance.availableBalance)} を申請する`}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              確定残高が最低支払額（{formatJPY(balance.threshold)}）に達していないため、引き出し申請はできません。
              あと{formatJPY(balance.amountUntilThreshold)}で申請可能になります。
              未達分は自動で翌月以降に繰り越されます。
            </p>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">戻る</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
