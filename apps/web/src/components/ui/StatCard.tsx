import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
}

export function StatCard({ title, value, trend, icon: Icon }: StatCardProps) {
  const isPositive = trend?.startsWith("+");

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {trend ? (
            <p
              className={`mt-1 text-xs font-medium ${
                isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend}
            </p>
          ) : null}
        </div>
        <span className="rounded-md bg-slate-100 p-2 text-slate-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}