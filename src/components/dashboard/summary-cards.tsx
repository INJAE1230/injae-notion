"use client";

import { ClipboardList, Zap, Activity, CheckCircle2 } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  const completionRate =
    stats.totalLogs > 0
      ? Math.round((stats.byStatus["완료"] / stats.totalLogs) * 100)
      : 0;

  const cards = [
    {
      title: "총 업무",
      value: stats.totalLogs,
      unit: "건",
      icon: ClipboardList,
      iconColor: "text-blue-500",
      bg: "bg-blue-500/10 dark:bg-blue-500/15",
      border: "border-blue-500/20",
    },
    {
      title: "예정",
      value: stats.byStatus["예정"] || 0,
      unit: "건",
      icon: Zap,
      iconColor: "text-indigo-500",
      bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      border: "border-indigo-500/20",
    },
    {
      title: "진행 중",
      value: stats.byStatus["진행 중"] || 0,
      unit: "건",
      icon: Activity,
      iconColor: "text-violet-500",
      bg: "bg-violet-500/10 dark:bg-violet-500/15",
      border: "border-violet-500/20",
    },
    {
      title: "완료율",
      value: completionRate,
      unit: "%",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`rounded-2xl border p-4 ${card.bg} ${card.border}`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight">{card.value}</span>
            <span className="text-sm text-muted-foreground">{card.unit}</span>
          </div>
          {card.title === "완료율" && (
            <div className="mt-2 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
