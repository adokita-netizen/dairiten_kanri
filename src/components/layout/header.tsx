"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronRight } from "lucide-react";

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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {agencyName && (
          <>
            <span className="font-medium text-foreground">{agencyName}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {(userName || "U").charAt(0)}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight">{userName || "ユーザー"}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {role === "OPERATOR" ? "運営者" : "代理店"}
            </p>
          </div>
        </div>
        <div className="h-6 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
