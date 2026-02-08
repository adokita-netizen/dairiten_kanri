"use client";

import { useState, useCallback } from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AppShell({
  role,
  userName,
  agencyName,
  children,
}: {
  role: "OPERATOR" | "AGENCY";
  userName?: string | null;
  agencyName?: string | null;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar role={role} />
      {/* Mobile drawer */}
      <MobileSidebar role={role} open={sidebarOpen} onClose={closeSidebar} />
      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        <Header
          userName={userName}
          role={role}
          agencyName={agencyName}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
