"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";

export function Header({
  userName,
  role,
  agencyName,
  onMenuClick,
}: {
  userName?: string | null;
  role: string;
  agencyName?: string | null;
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 lg:h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-4 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Hamburger for mobile */}
        <button
          onClick={onMenuClick}
          aria-label="メニューを開く"
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        {agencyName && (
          <span className="hidden sm:inline font-medium text-sm text-foreground">{agencyName}</span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {(userName || "U").charAt(0)}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{userName || "ユーザー"}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {role === "OPERATOR" ? "運営者" : "代理店"}
            </p>
          </div>
        </div>
        <div className="hidden sm:block h-6 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="ログアウト"
          className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ログアウト</span>
        </Button>
      </div>
    </header>
  );
}
