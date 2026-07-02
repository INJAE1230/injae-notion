"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

const STATUS_DATA = [
  { key: "진행 중" as const, color: "#6366f1" },
  { key: "대기중" as const, color: "#fb923c" },
  { key: "예정" as const, color: "#eab308" },
  { key: "언젠가" as const, color: "#94a3b8" },
  { key: "완료" as const, color: "#22c55e" },
];

export function StatusChart({ stats }: { stats: DashboardStats }) {
  const data = STATUS_DATA.map((s) => ({
    name: s.key,
    value: stats.byStatus[s.key] || 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">상태별 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <PieChartIcon className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        ) : (
          <div className="flex h-[220px] items-center">
            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    {data.map((entry, i) => (
                      <linearGradient key={i} id={`statusGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    dataKey="value"
                    strokeWidth={0}
                    paddingAngle={3}
                    cornerRadius={4}
                    animationDuration={800}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={`url(#statusGrad-${i})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold tracking-tight">{total}</p>
                  <p className="text-[11px] text-muted-foreground">전체</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 pr-2">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-xs text-muted-foreground w-12">{d.name}</span>
                  <span className="text-xs font-semibold tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
