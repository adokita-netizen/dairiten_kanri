import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEFAULT_PAYOUT_THRESHOLD, DEFAULT_HOLD_PERIOD_DAYS, DEFAULT_TAX_RATE } from "@/lib/utils/constants";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>システム設定</CardTitle>
          <CardDescription>全体のデフォルト値を確認できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">デフォルト最低支払額</p>
              <p className="text-lg font-bold">{DEFAULT_PAYOUT_THRESHOLD.toLocaleString()}円</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">デフォルト保留期間</p>
              <p className="text-lg font-bold">{DEFAULT_HOLD_PERIOD_DAYS}日</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">消費税率</p>
              <p className="text-lg font-bold">{DEFAULT_TAX_RATE}%</p>
            </div>
          </div>
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
