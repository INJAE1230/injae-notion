"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Clock, Loader, CheckCircle } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  const completionRate =
    stats.totalLogs > 0
      ? Math.round((stats.byStatus["완료"] / stats.totalLogs) * 100)
      : 0;

  const cards = [
    {
      title: "총 업무",
      value: `${stats.totalLogs}`,
      unit: "건",
      icon: ClipboardList,
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "총 소요시간",
      value: `${stats.totalHours}`,
      unit: "시간",
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "진행 중",
      value: `${stats.byStatus["진행 중"] || 0}`,
      unit: "건",
      icon: Loader,
      gradient: "from-indigo-500 to-purple-600",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "완료율",
      value: `${completionRate}`,
      unit: "%",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-green-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card
          key={card.title}
          className="overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-sm`}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {card.title}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight">
                  {card.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {card.unit}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
