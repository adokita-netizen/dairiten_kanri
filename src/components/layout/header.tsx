"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header({
  userName,
  role,
  agencyName,
}: {
  userName?: string | null;
  role: string;
  agencyName?: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-3">
        {agencyName && (
          <span className="text-sm font-medium text-muted-foreground">{agencyName}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{userName || "ユーザー"}</p>
          <p className="text-xs text-muted-foreground">
            {role === "OPERATOR" ? "運営者" : "代理店"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
