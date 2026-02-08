"use client";

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

export function Sidebar({ role }: { role: "OPERATOR" | "AGENCY" }) {
  const pathname = usePathname();
  const items = role === "OPERATOR" ? operatorNav : agencyNav;

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Building2 className="h-5 w-5" />
          <span>代理店管理</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
