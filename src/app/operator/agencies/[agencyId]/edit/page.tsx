"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAgency, updateAgency, updateAgencyStatus, updateBankInfo } from "@/lib/services/agency.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AGENCY_STATUS_LABELS, BANK_ACCOUNT_TYPE_LABELS } from "@/lib/utils/constants";
import type { AgencyStatus } from "@/lib/types";

export default function EditAgencyPage() {
  const router = useRouter();
  const params = useParams();
  const agencyId = params.agencyId as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agency, setAgency] = useState<Awaited<ReturnType<typeof getAgency>> | null>(null);

  useEffect(() => {
    getAgency(agencyId).then(setAgency).catch(() => router.push("/operator/agencies"));
  }, [agencyId, router]);

  if (!agency) return <div className="py-8 text-center text-muted-foreground">読み込み中...</div>;

  async function handleBasicSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await updateAgency(agencyId, {
        name: formData.get("name") as string,
        contactName: formData.get("contactName") as string,
        contactEmail: formData.get("contactEmail") as string,
        contactPhone: (formData.get("contactPhone") as string) || undefined,
        payoutThreshold: Number(formData.get("payoutThreshold")),
        holdPeriodDays: Number(formData.get("holdPeriodDays")),
        notes: (formData.get("notes") as string) || undefined,
      });
      router.push(`/operator/agencies/${agencyId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      await updateAgencyStatus(agencyId, status as AgencyStatus);
      router.refresh();
      const updated = await getAgency(agencyId);
      setAgency(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  async function handleBankSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await updateBankInfo(agencyId, {
        bankName: formData.get("bankName") as string,
        bankBranchName: (formData.get("bankBranchName") as string) || undefined,
        bankAccountType: formData.get("bankAccountType") as "ordinary" | "current",
        bankAccountNumber: formData.get("bankAccountNumber") as string,
        bankAccountHolder: formData.get("bankAccountHolder") as string,
      });
      router.push(`/operator/agencies/${agencyId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{agency.name} - 編集</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ステータス変更</CardTitle>
        </CardHeader>
        <CardContent>
          <Select defaultValue={agency.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AGENCY_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>基本情報</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleBasicSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">代理店名</Label>
              <Input id="name" name="name" defaultValue={agency.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">担当者名</Label>
              <Input id="contactName" name="contactName" defaultValue={agency.contactName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">メールアドレス</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={agency.contactEmail} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">電話番号</Label>
              <Input id="contactPhone" name="contactPhone" defaultValue={agency.contactPhone || ""} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payoutThreshold">最低支払額（円）</Label>
                <Input id="payoutThreshold" name="payoutThreshold" type="number" defaultValue={Number(agency.payoutThreshold)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holdPeriodDays">保留期間（日）</Label>
                <Input id="holdPeriodDays" name="holdPeriodDays" type="number" defaultValue={agency.holdPeriodDays} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={agency.notes || ""}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" disabled={loading}>保存</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>振込先情報</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">銀行名</Label>
              <Input id="bankName" name="bankName" defaultValue={agency.bankName || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankBranchName">支店名</Label>
              <Input id="bankBranchName" name="bankBranchName" defaultValue={agency.bankBranchName || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountType">口座種別</Label>
              <Select name="bankAccountType" defaultValue={agency.bankAccountType || "ordinary"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinary">普通</SelectItem>
                  <SelectItem value="current">当座</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">口座番号</Label>
              <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={agency.bankAccountNumber || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountHolder">口座名義</Label>
              <Input id="bankAccountHolder" name="bankAccountHolder" defaultValue={agency.bankAccountHolder || ""} required />
            </div>
            <Button type="submit" disabled={loading}>振込先を保存</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
