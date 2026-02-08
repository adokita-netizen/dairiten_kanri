import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEFAULT_PAYOUT_THRESHOLD, DEFAULT_HOLD_PERIOD_DAYS, DEFAULT_TAX_RATE, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT_INC_TAX } from "@/lib/utils/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground text-sm mt-1">システム全体のデフォルト設定</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>システム設定</CardTitle>
          <CardDescription>全体のデフォルト値を確認できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">デフォルト最低支払額</p>
              <p className="text-lg font-semibold">{DEFAULT_PAYOUT_THRESHOLD.toLocaleString()}円</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">デフォルト保留期間</p>
              <p className="text-lg font-semibold">{DEFAULT_HOLD_PERIOD_DAYS}日</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">消費税率</p>
              <p className="text-lg font-semibold">{DEFAULT_TAX_RATE}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>デポジット設定</CardTitle>
            <Link href="/operator/deposits">
              <Button variant="outline" size="sm">デポジット管理</Button>
            </Link>
          </div>
          <CardDescription>新規代理店登録時のデフォルト値</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">デポジット金額（税抜）</p>
              <p className="text-lg font-semibold">{DEPOSIT_AMOUNT.toLocaleString()}円</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">デポジット金額（税込）</p>
              <p className="text-lg font-semibold">{DEPOSIT_AMOUNT_INC_TAX.toLocaleString()}円</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            デポジットは代理店ごとに個別設定が可能です。返金可能フラグは運営者がデポジット管理画面から設定します。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>精算ルール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>- 精算サイクル: 当月末締め、翌々月末振込</p>
          <p>- 振込手数料: 代理店負担</p>
          <p>- 報酬計算基準: 税抜売上金額</p>
          <p>- 成果定義: 有料プランの決済完了</p>
          <p>- 閾値未達時: 翌月以降に自動繰越</p>
        </CardContent>
      </Card>
    </div>
  );
}
