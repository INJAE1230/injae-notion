import { getAllWorkLogs, queryWorkLogs } from "@/lib/notion-service";
import {
  computeTimeAllocation,
  computeCompletionTrend,
  computeProductivityPatterns,
  computeTagDistribution,
  computePeriodComparison,
} from "@/lib/analytics";
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeAllocationChart } from "@/components/analytics/time-allocation-chart";
import { CompletionTrendChart } from "@/components/analytics/completion-trend-chart";
import { ProductivityHeatmap } from "@/components/analytics/productivity-heatmap";
import { TagDistributionChart } from "@/components/analytics/tag-distribution-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const allLogs = await getAllWorkLogs();

  const now = new Date();
  const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekEnd = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const thisWeekLogs = allLogs.filter((l) => l.date >= thisWeekStart && l.date <= thisWeekEnd);
  const lastWeekLogs = allLogs.filter((l) => l.date >= lastWeekStart && l.date <= lastWeekEnd);

  const timeAllocation = computeTimeAllocation(allLogs);
  const completionTrend = computeCompletionTrend(allLogs);
  const patterns = computeProductivityPatterns(allLogs);
  const tagDist = computeTagDistribution(allLogs);
  const comparison = computePeriodComparison(thisWeekLogs, lastWeekLogs);

  function DeltaIcon({ delta }: { delta: number }) {
    if (delta > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (delta < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  function deltaText(delta: number, unit: string) {
    if (delta === 0) return "동일";
    return `${delta > 0 ? "+" : ""}${delta}${unit}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-violet-500" />
          통계 분석
        </h1>
        <p className="text-sm text-muted-foreground">
          전체 {allLogs.length}건의 업무 데이터 분석
        </p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <TimeAllocationChart data={timeAllocation} />
        <TagDistributionChart data={tagDist} />
      </div>

      <CompletionTrendChart data={completionTrend} />
      <ProductivityHeatmap data={patterns} />
    </div>
  );
}
