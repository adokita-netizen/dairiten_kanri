"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importSalesCSV } from "@/lib/services/sales.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";

export default function ImportSalesPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    success: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);

    const text = await file.text();
    try {
      const res = await importSalesCSV(text, "current-user");
      setResult(res);
    } catch (err) {
      setResult({
        total: 0,
        success: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : "エラーが発生しました" }],
      });
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">売上データCSV取込</h1>
        <p className="mt-1 text-sm text-muted-foreground">CSVファイルから売上データを一括取込します</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSVファイルアップロード</CardTitle>
          <CardDescription>
            CSVファイルのヘッダーは以下の通りです: agencyCode, planCode, transactionDate, saleAmountExTax, taxRate, quantity, customerName, customerRef, contractId, externalId
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 px-6 py-8 transition-colors hover:border-muted-foreground/50">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{file ? file.name : "ファイルを選択"}</p>
                <p className="text-sm text-muted-foreground">CSV形式</p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <Button onClick={handleImport} disabled={!file || loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "取込中..." : "取込開始"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>取込結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">合計行数:</span>
                <span className="font-bold">{result.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-600">{result.success}件成功</span>
              </div>
              {result.errors.length > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-bold text-destructive">{result.errors.length}件エラー</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>行</TableHead>
                    <TableHead>エラー内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errors.map((err, i) => (
                    <TableRow key={i}>
                      <TableCell>{err.row}</TableCell>
                      <TableCell className="text-destructive">{err.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Button variant="outline" onClick={() => router.push("/operator/sales")}>
              売上一覧に戻る
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
