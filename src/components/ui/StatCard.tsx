"use client";

import { cn, formatCurrency } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  format?: "currency" | "number";
  trend?: string;
  className?: string;
}

function formatValue(value: string | number, format: "currency" | "number") {
  if (typeof value === "string") return value;
  return format === "currency" ? formatCurrency(value) : value.toLocaleString("en-IN");
}

export function StatCard({ title, value, icon, format = "number", trend, className }: StatCardProps) {
  return (
    <div className={cn("card flex items-start gap-4", className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">
          {formatValue(value, format)}
        </p>
        {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
      </div>
    </div>
  );
}
