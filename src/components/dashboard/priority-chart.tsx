"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

const PRIORITY_DATA = [
  { key: "긴급+중요" as const, label: "Q1 긴급+중요", color: "#ef4444" },
  { key: "중요" as const, label: "Q2 중요", color: "#f97316" },
  { key: "긴급" as const, label: "Q3 긴급", color: "#eab308" },
  { key: "낮음" as const, label: "Q4 낮음", color: "#9ca3af" },
];

export function PriorityChart({ stats }: { stats: DashboardStats }) {
  const data = PRIORITY_DATA.map((p) => ({
    name: p.label,
    value: stats.byPriority[p.key] || 0,
    color: p.color,
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">우선순위 분포</CardTitle>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">{total}건</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[160px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">우선순위가 설정된 업무가 없습니다</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
