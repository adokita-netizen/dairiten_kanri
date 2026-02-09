"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateRevenueShares, confirmHeldCommissions } from "@/lib/services/calculation.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatJPY } from "@/lib/utils/currency";
import { Calculator, CheckCircle } from "lucide-react";

export default function CalculationsPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<
    { agencyId: string; processed: number; totalAmount: number; errors: string[] }[] | null
  >(null);
  const [confirmResult, setConfirmResult] = useState<{ confirmed: number } | null>(null);

  async function handleCalculate() {
    if (year < 2000 || year > 2099 || month < 1 || month > 12) {
      setError("有効な年月を入力してください");
      return;
    }
    setLoading(true);
    setResults(null);
    setError("");
    try {
      const res = await calculateRevenueShares({ periodYear: year, periodMonth: month });
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
    setLoading(false);
  }

  async function handleConfirm() {
    setConfirming(true);
    setError("");
    try {
      const res = await confirmHeldCommissions();
      setConfirmResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
    setConfirming(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">報酬計算</h1>
        <p className="mt-1 text-sm text-muted-foreground">売上データに基づく報酬計算と確定処理</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>レベニューシェア計算</CardTitle>
            <CardDescription>
              指定月の未計算売上に対して、還元率ルールに基づく報酬計算を実行します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label>年</Label>
                <Input type="number" min={2000} max={2099} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
              </div>
              <div className="space-y-2">
                <Label>月</Label>
                <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20" />
              </div>
            </div>
            <Button onClick={handleCalculate} disabled={loading}>
              <Calculator className="mr-2 h-4 w-4" />
              {loading ? "計算中..." : "計算実行"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>保留中報酬の確定</CardTitle>
            <CardDescription>
              保留期間を過ぎた報酬イベントを「確定」に遷移させ、代理店の確定残高に反映します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleConfirm} disabled={confirming}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {confirming ? "確定中..." : "保留中を確定"}
            </Button>
            {confirmResult && (
              <p className="text-sm text-green-600">
                {confirmResult.confirmed}件の報酬を確定しました。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>計算結果</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-muted-foreground">計算対象の売上データがありませんでした。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>代理店ID</TableHead>
                    <TableHead>処理件数</TableHead>
                    <TableHead>報酬合計</TableHead>
                    <TableHead>エラー</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.agencyId}>
                      <TableCell className="font-mono text-sm">{r.agencyId}</TableCell>
                      <TableCell>{r.processed}件</TableCell>
                      <TableCell className="font-bold">{formatJPY(r.totalAmount)}</TableCell>
                      <TableCell>
                        {r.errors.length > 0 ? (
                          <Badge variant="destructive">{r.errors.length}件</Badge>
                        ) : (
                          <Badge variant="success">なし</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
