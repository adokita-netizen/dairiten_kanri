"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Percent,
  Receipt,
  Calculator,
  Wallet,
  ClipboardList,
  Settings,
  TrendingUp,
  User,
  X,
} from "lucide-react";

const operatorNav = [
  { href: "/operator/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/operator/agencies", label: "代理店管理", icon: Building2 },
  { href: "/operator/commission-rules", label: "還元率設定", icon: Percent },
  { href: "/operator/sales", label: "売上管理", icon: Receipt },
  { href: "/operator/calculations", label: "報酬計算", icon: Calculator },
  { href: "/operator/payouts", label: "支払管理", icon: Wallet },
  { href: "/operator/audit-log", label: "監査ログ", icon: ClipboardList },
  { href: "/operator/settings", label: "設定", icon: Settings },
];

const agencyNav = [
  { href: "/agency/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/agency/sales", label: "売上明細", icon: TrendingUp },
  { href: "/agency/payouts", label: "引き出し", icon: Wallet },
  { href: "/agency/profile", label: "プロフィール", icon: User },
];

function SidebarContent({
  role,
  onNavClick,
}: {
  role: "OPERATOR" | "AGENCY";
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const items = role === "OPERATOR" ? operatorNav : agencyNav;

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <Link href="/" className="text-base font-bold text-white tracking-wide">
            代理店管理
          </Link>
          <p className="text-[11px] text-sidebar-foreground/60">
            {role === "OPERATOR" ? "運営管理画面" : "代理店画面"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/10 shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-white shadow-md shadow-sidebar-accent/30"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-white" : "text-sidebar-foreground/50"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3 shrink-0">
        <p className="text-[11px] text-sidebar-foreground/40">
          Revenue Share Management
        </p>
      </div>
    </>
  );
}

export function Sidebar({ role }: { role: "OPERATOR" | "AGENCY" }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden lg:flex h-screen w-64 flex-col bg-sidebar-bg text-sidebar-foreground">
      <SidebarContent role={role} />
    </aside>
  );
}

export function MobileSidebar({
  role,
  open,
  onClose,
}: {
  role: "OPERATOR" | "AGENCY";
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-sidebar-bg text-sidebar-foreground transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent role={role} onNavClick={onClose} />
      </aside>
    </>
  );
}
