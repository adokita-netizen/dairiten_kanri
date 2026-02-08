"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCommissionRule } from "@/lib/services/commission.service";
import { parseLocalDate } from "@/lib/utils/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewCommissionRulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agencies, setAgencies] = useState<{ id: string; code: string; name: string }[]>([]);
  const [plans, setPlans] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedAgency, setSelectedAgency] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [commissionType, setCommissionType] = useState("PERCENTAGE");

  useEffect(() => {
    fetch("/api/data/agencies").then((r) => r.json()).then(setAgencies).catch(() => {});
    fetch("/api/data/plans").then((r) => r.json()).then(setPlans).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);

    try {
      await createCommissionRule({
        agencyId: selectedAgency,
        planId: selectedPlan || null,
        commissionType: commissionType as "PERCENTAGE" | "FIXED_AMOUNT",
        rate: Number(formData.get("rate")),
        effectiveFrom: parseLocalDate(formData.get("effectiveFrom") as string),
        effectiveTo: formData.get("effectiveTo")
          ? parseLocalDate(formData.get("effectiveTo") as string)
          : null,
        description: (formData.get("description") as string) || undefined,
      });
      router.push("/operator/commission-rules");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">還元率ルール新規作成</h1>
        <p className="mt-1 text-sm text-muted-foreground">新しい還元率ルールを作成します</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label>代理店 *</Label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency} required>
                <SelectTrigger>
                  <SelectValue placeholder="代理店を選択" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>対象プラン（空欄＝全プラン）</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="全プラン（デフォルト）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全プラン</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>種別</Label>
              <Select value={commissionType} onValueChange={setCommissionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">パーセンテージ（%）</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">固定金額（円）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">
                {commissionType === "PERCENTAGE" ? "還元率（%）" : "固定金額（円）"} *
              </Label>
              <Input id="rate" name="rate" type="number" step="0.01" required />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">適用開始日 *</Label>
                <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">適用終了日（任意）</Label>
                <Input id="effectiveTo" name="effectiveTo" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Input id="description" name="description" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading || !selectedAgency}>
                {loading ? "作成中..." : "ルールを作成"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>キャンセル</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
