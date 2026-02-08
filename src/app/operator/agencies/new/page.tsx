"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAgency } from "@/lib/services/agency.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export default function NewAgencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      await createAgency({
        name: formData.get("name") as string,
        contactName: formData.get("contactName") as string,
        contactEmail: formData.get("contactEmail") as string,
        contactPhone: (formData.get("contactPhone") as string) || undefined,
        payoutThreshold: Number(formData.get("payoutThreshold")) || 10000,
        holdPeriodDays: Number(formData.get("holdPeriodDays")) || 14,
        notes: (formData.get("notes") as string) || undefined,
      });
      router.push("/operator/agencies");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">代理店新規登録</h1>
        <p className="mt-1 text-sm text-muted-foreground">新しい代理店を登録します</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">代理店名 *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">担当者名 *</Label>
              <Input id="contactName" name="contactName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">メールアドレス *</Label>
              <Input id="contactEmail" name="contactEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">電話番号</Label>
              <Input id="contactPhone" name="contactPhone" />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payoutThreshold">最低支払額（円）</Label>
                <Input id="payoutThreshold" name="payoutThreshold" type="number" defaultValue={10000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holdPeriodDays">保留期間（日）</Label>
                <Input id="holdPeriodDays" name="holdPeriodDays" type="number" defaultValue={14} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <textarea
                id="notes"
                name="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "登録中..." : "登録する"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
