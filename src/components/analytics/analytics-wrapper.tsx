"use client";

import { useState, useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TimeAllocationChart } from "./time-allocation-chart";
import { CompletionTrendChart } from "./completion-trend-chart";
import { ProductivityHeatmap } from "./productivity-heatmap";
import {
  computeTimeAllocation,
  computeCompletionTrend,
  computeProductivityPatterns,
  computePeriodComparison,
} from "@/lib/analytics";
import type { WorkLog } from "@/lib/types";

const PRESETS = [
  { label: "전체", getRange: () => ({ from: "", to: "" }) },
  { label: "이번 주", getRange: () => ({
    from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  })},
  { label: "이번 달", getRange: () => ({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  })},
  { label: "최근 30일", getRange: () => ({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  })},
];

function DeltaIcon({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (delta < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function deltaText(delta: number, unit: string) {
  if (delta === 0) return "동일";
  return `${delta > 0 ? "+" : ""}${delta}${unit}`;
}

export function AnalyticsWrapper({ allLogs }: { allLogs: WorkLog[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredLogs = useMemo(() => {
    let result = allLogs;
    if (dateFrom) result = result.filter((l) => l.date >= dateFrom);
    if (dateTo) result = result.filter((l) => l.date <= dateTo);
    return result;
  }, [allLogs, dateFrom, dateTo]);

  const now = new Date();
  const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subDays(now, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekEnd = format(endOfWeek(subDays(now, 7), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const thisWeekLogs = filteredLogs.filter((l) => l.date >= thisWeekStart && l.date <= thisWeekEnd);
  const lastWeekLogs = filteredLogs.filter((l) => l.date >= lastWeekStart && l.date <= lastWeekEnd);

  const timeAllocation = computeTimeAllocation(filteredLogs);
  const completionTrend = computeCompletionTrend(filteredLogs);
  const patterns = computeProductivityPatterns(filteredLogs);
  const comparison = computePeriodComparison(thisWeekLogs, lastWeekLogs);

  const applyPreset = (idx: number) => {
    const range = PRESETS[idx].getRange();
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset, i) => (
          <Button key={preset.label} variant="outline" size="sm" onClick={() => applyPreset(i)}>
            {preset.label}
          </Button>
        ))}
        <Input
          type="date"
          className="w-[140px] h-9"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span className="text-sm text-muted-foreground hidden sm:inline">~</span>
        <Input
          type="date"
          className="w-[140px] h-9"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {filteredLogs.length}건
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">이번 주 업무</p>
                <p className="text-2xl font-bold">{comparison.current.count}건</p>
              </div>
              <div className="text-right flex items-center gap-1">
                <DeltaIcon delta={comparison.countDelta} />
                <span className="text-xs text-muted-foreground">
                  {deltaText(comparison.countDelta, "건")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">이번 주 시간</p>
                <p className="text-2xl font-bold">{comparison.current.hours}h</p>
              </div>
              <div className="text-right flex items-center gap-1">
                <DeltaIcon delta={comparison.hoursDelta} />
                <span className="text-xs text-muted-foreground">
                  {deltaText(comparison.hoursDelta, "h")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">이번 주 완료</p>
                <p className="text-2xl font-bold">{comparison.current.completed}건</p>
              </div>
              <div className="text-right flex items-center gap-1">
                <DeltaIcon delta={comparison.completedDelta} />
                <span className="text-xs text-muted-foreground">
                  {deltaText(comparison.completedDelta, "건")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TimeAllocationChart data={timeAllocation} />

      <CompletionTrendChart data={completionTrend} />
      <ProductivityHeatmap data={patterns} />
    </>
  );
}
