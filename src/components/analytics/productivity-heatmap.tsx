"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductivityPattern } from "@/lib/types";

function getIntensity(count: number, max: number) {
  if (max === 0 || count === 0) return "bg-muted";
  const ratio = count / max;
  if (ratio > 0.75) return "bg-violet-500";
  if (ratio > 0.5) return "bg-violet-400";
  if (ratio > 0.25) return "bg-violet-300";
  return "bg-violet-200 dark:bg-violet-800";
}

export function ProductivityHeatmap({ data }: { data: ProductivityPattern[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">요일별 업무량</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {data.map((d) => (
            <div key={d.dayOfWeek} className="text-center space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {d.dayName}
              </span>
              <div
                className={`mx-auto h-12 w-12 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${getIntensity(d.count, maxCount)} ${d.count > 0 ? "text-white" : "text-muted-foreground"}`}
              >
                {d.count}
              </div>
              <span className="text-xs text-muted-foreground block">
                {d.hours}h
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 justify-center text-xs text-muted-foreground">
          <span>적음</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded bg-muted" />
            <div className="h-3 w-3 rounded bg-violet-200 dark:bg-violet-800" />
            <div className="h-3 w-3 rounded bg-violet-300" />
            <div className="h-3 w-3 rounded bg-violet-400" />
            <div className="h-3 w-3 rounded bg-violet-500" />
          </div>
          <span>많음</span>
        </div>
      </CardContent>
    </Card>
  );
}
