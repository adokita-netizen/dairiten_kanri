"use client";

import { ReactNode } from "react";

interface MobileCardField {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}

export function MobileCard({
  fields,
  action,
}: {
  fields: MobileCardField[];
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {fields.map((field, i) => (
          <div key={i} className={field.fullWidth ? "col-span-2" : ""}>
            <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{field.label}</p>
            <div className="text-sm">{field.value}</div>
          </div>
        ))}
      </div>
      {action && <div className="pt-2 border-t">{action}</div>}
    </div>
  );
}

export function ResponsiveTable({
  desktopTable,
  mobileCards,
  emptyMessage,
}: {
  desktopTable: ReactNode;
  mobileCards: ReactNode;
  emptyMessage?: string;
}) {
  return (
    <>
      {/* Desktop: normal table */}
      <div className="hidden lg:block">{desktopTable}</div>
      {/* Mobile: card list */}
      <div className="lg:hidden space-y-3">{mobileCards}</div>
    </>
  );
}
