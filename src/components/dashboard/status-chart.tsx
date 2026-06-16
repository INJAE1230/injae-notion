"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

const STATUS_DATA = [
  { key: "예정" as const, color: "#eab308" },
  { key: "진행 중" as const, color: "#6366f1" },
  { key: "완료" as const, color: "#22c55e" },
];

export function StatusChart({ stats }: { stats: DashboardStats }) {
  const data = STATUS_DATA.map((s) => ({
    name: s.key,
    value: stats.byStatus[s.key] || 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">상태별 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="text-3xl">📊</div>
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        ) : (
          <div className="flex h-[220px] items-center">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="var(--background)"
                    animationDuration={800}
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 pr-2">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
