"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

export function CompletionRateChart({ stats }: { stats: DashboardStats }) {
  const data = stats.monthlyCompletion;

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">월별 완료율</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                  }}
                  formatter={(value, _, props) => [
                    `${value ?? 0}% (${(props as { payload?: { total: number; completed: number } }).payload?.completed ?? 0}/${(props as { payload?: { total: number; completed: number } }).payload?.total ?? 0}건)`,
                    "완료율",
                  ]}
                />
                <Bar dataKey="rate" name="완료율" radius={[4, 4, 0, 0]} animationDuration={800}>
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.rate >= 70
                          ? "#10b981"
                          : entry.rate >= 40
                          ? "#6366f1"
                          : "#f59e0b"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
