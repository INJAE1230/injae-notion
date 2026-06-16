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
import type { TimeAllocation } from "@/lib/types";

const COLORS: Record<string, string> = {
  "내부": "#8b5cf6",
  "클라이언트": "#f97316",
  "개인": "#06b6d4",
};

export function TimeAllocationChart({ data }: { data: TimeAllocation[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">프로젝트별 시간 배분</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} unit="h" />
              <YAxis type="category" dataKey="project" fontSize={12} tickLine={false} axisLine={false} width={70} />
              <Tooltip
                formatter={(val) => [`${val}시간`, "소요시간"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                }}
              />
              <Bar dataKey="hours" radius={[0, 6, 6, 0]} animationDuration={800}>
                {data.map((entry) => (
                  <Cell key={entry.project} fill={COLORS[entry.project] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-3 mt-2 justify-center">
          {data.map((d) => (
            <span key={d.project} className="text-xs text-muted-foreground">
              {d.project}: {d.percentage}%
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
