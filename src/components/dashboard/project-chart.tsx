"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

const PROJECT_COLORS: Record<string, string> = {
  "내부": "#8b5cf6",
  "클라이언트": "#f97316",
  "개인": "#06b6d4",
};

export function ProjectChart({ stats }: { stats: DashboardStats }) {
  const data = [
    { name: "내부", count: stats.byProject["내부"] || 0, fill: PROJECT_COLORS["내부"] },
    { name: "클라이언트", count: stats.byProject["클라이언트"] || 0, fill: PROJECT_COLORS["클라이언트"] },
    { name: "개인", count: stats.byProject["개인"] || 0, fill: PROJECT_COLORS["개인"] },
  ];

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">프로젝트별 분포</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%">
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                }}
              />
              <Bar
                dataKey="count"
                name="업무 수"
                radius={[6, 6, 0, 0]}
                animationDuration={800}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
