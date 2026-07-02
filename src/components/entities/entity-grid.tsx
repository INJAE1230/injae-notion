"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ArrowLeft,
  Clock,
  TrendingUp,
  CalendarDays,
  BarChart3,
  ArrowUpDown,
  Filter,
  Activity,
  CheckCircle2,
  Loader2,
  Pause,
  Timer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { PROJECT_COLORS, STATUS_COLORS } from "@/lib/constants";
import type { EntityStats } from "@/lib/stats";
import type { WorkLog, Status } from "@/lib/types";

interface EntityGridProps {
  entityStats: EntityStats[];
  allLogs: WorkLog[];
}

const ENTITY_COLORS: Record<string, string> = {
  "청초수": "#3b82f6",
  "청초수씨푸드": "#06b6d4",
  "646미터퍼세크": "#f59e0b",
  "아일랜드프로젝트646미터퍼세크": "#22c55e",
  "JS코퍼레이션": "#8b5cf6",
  "JKK인터내셔널": "#6366f1",
  "에그롤린대전": "#f97316",
  "바비캐럿": "#ec4899",
  "이니셜뮤직코리아": "#14b8a6",
};

const ENTITY_SHORT: Record<string, string> = {
  "청초수": "청초수",
  "청초수씨푸드": "씨푸드",
  "646미터퍼세크": "646",
  "아일랜드프로젝트646미터퍼세크": "아일랜드",
  "JS코퍼레이션": "JS",
  "JKK인터내셔널": "JKK",
  "에그롤린대전": "에그롤린",
  "바비캐럿": "바비캐럿",
  "이니셜뮤직코리아": "이니셜",
};

const STATUS_CHART_COLORS: Record<Status, string> = {
  "진행 중": "#6366f1",
  "대기중": "#fb923c",
  "예정": "#eab308",
  "언젠가": "#94a3b8",
  "완료": "#22c55e",
};

type SortKey = "name" | "totalLogs" | "completionRate" | "thisMonthLogs" | "totalHours";
type SortDir = "asc" | "desc";
type PeriodFilter = "all" | "thisMonth" | "last3Months" | "last6Months";
type CompareView = "bar" | "radar";

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  fontSize: "12px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
};

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function getMonthLabel(key: string) {
  const [, m] = key.split("-");
  return `${parseInt(m)}월`;
}

function filterLogsByPeriod(logs: WorkLog[], period: PeriodFilter): WorkLog[] {
  if (period === "all") return logs;
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - (
    period === "thisMonth" ? 0 : period === "last3Months" ? 2 : 5
  ), 1);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return logs.filter((l) => l.date >= cutoffStr);
}

export function EntityGrid({ entityStats: rawStats, allLogs }: EntityGridProps) {
  const [selected, setSelected] = useState<EntityStats | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("thisMonthLogs");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [compareView, setCompareView] = useState<CompareView>("bar");
  const [showAllDrilldown, setShowAllDrilldown] = useState(false);
  const [drilldownStatus, setDrilldownStatus] = useState<Status | "all">("all");

  const filteredLogs = useMemo(() => filterLogsByPeriod(allLogs, period), [allLogs, period]);

  const entityStats = useMemo(() => {
    if (period === "all") return rawStats;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return rawStats.map((es) => {
      const logs = filteredLogs.filter((l) => l.projects.some((p) => es.projects.includes(p)));
      const completed = logs.filter((l) => l.status === "완료").length;
      const inProgress = logs.filter((l) => l.status === "진행 중").length;
      const thisMonthLogs = logs.filter((l) => l.date.startsWith(thisMonth)).length;
      const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0);
      return {
        ...es,
        totalLogs: logs.length,
        completedLogs: completed,
        inProgressLogs: inProgress,
        completionRate: logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0,
        totalHours: Math.round(totalHours * 10) / 10,
        thisMonthLogs,
      };
    });
  }, [rawStats, filteredLogs, period]);

  const sortedStats = useMemo(() => {
    const arr = [...entityStats];
    arr.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === "name") { va = a.entity; vb = b.entity; }
      else { va = a[sortKey]; vb = b[sortKey]; }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [entityStats, sortKey, sortDir]);

  const totalSummary = useMemo(() => {
    const total = entityStats.reduce((s, e) => s + e.totalLogs, 0);
    const completed = entityStats.reduce((s, e) => s + e.completedLogs, 0);
    const hours = entityStats.reduce((s, e) => s + e.totalHours, 0);
    const thisMonth = entityStats.reduce((s, e) => s + e.thisMonthLogs, 0);
    const active = entityStats.filter((e) => e.totalLogs > 0).length;
    return { total, completed, hours: Math.round(hours * 10) / 10, thisMonth, active, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [entityStats]);

  const compareData = useMemo(() => {
    return entityStats
      .filter((e) => e.totalLogs > 0)
      .map((e) => ({
        name: ENTITY_SHORT[e.entity] || e.entity,
        entity: e.entity,
        업무량: e.totalLogs,
        완료율: e.completionRate,
        진행중: e.inProgressLogs,
        시간: e.totalHours,
        이번달: e.thisMonthLogs,
      }));
  }, [entityStats]);

  const radarData = useMemo(() => {
    const maxLogs = Math.max(...entityStats.map((e) => e.totalLogs), 1);
    const maxHours = Math.max(...entityStats.map((e) => e.totalHours), 1);
    const maxMonth = Math.max(...entityStats.map((e) => e.thisMonthLogs), 1);
    return entityStats.filter((e) => e.totalLogs > 0).map((e) => ({
      name: ENTITY_SHORT[e.entity] || e.entity,
      업무량: Math.round((e.totalLogs / maxLogs) * 100),
      완료율: e.completionRate,
      시간투자: Math.round((e.totalHours / maxHours) * 100),
      이번달활동: Math.round((e.thisMonthLogs / maxMonth) * 100),
    }));
  }, [entityStats]);

  const monthlyTrend = useMemo(() => {
    const monthMap = new Map<string, Map<string, number>>();
    const entities = entityStats.filter((e) => e.totalLogs > 0);
    for (const es of entities) {
      const logs = filteredLogs.filter((l) => l.projects.some((p) => es.projects.includes(p)));
      for (const log of logs) {
        const mk = getMonthKey(log.date);
        if (!monthMap.has(mk)) monthMap.set(mk, new Map());
        const em = monthMap.get(mk)!;
        em.set(es.entity, (em.get(es.entity) || 0) + 1);
      }
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, em]) => {
        const row: Record<string, string | number> = { month: getMonthLabel(month) };
        for (const es of entities) {
          row[ENTITY_SHORT[es.entity] || es.entity] = em.get(es.entity) || 0;
        }
        return row;
      });
  }, [entityStats, filteredLogs]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ──── Drill-down view ────
  if (selected) {
    const entityLogs = filteredLogs.filter((log) =>
      log.projects.some((p) => selected.projects.includes(p))
    );
    const displayLogs = drilldownStatus === "all" ? entityLogs : entityLogs.filter((l) => l.status === drilldownStatus);
    const visibleLogs = showAllDrilldown ? displayLogs : displayLogs.slice(0, 30);

    const statusData = (["완료", "진행 중", "대기중", "예정", "언젠가"] as Status[])
      .map((s) => ({ name: s, value: entityLogs.filter((l) => l.status === s).length, color: STATUS_CHART_COLORS[s] }))
      .filter((d) => d.value > 0);
    const statusTotal = statusData.reduce((s, d) => s + d.value, 0);

    const weeklyData = (() => {
      const wm = new Map<string, { count: number; hours: number }>();
      for (const log of entityLogs) {
        const d = new Date(log.date + "T00:00:00");
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const wk = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
        const e = wm.get(wk) || { count: 0, hours: 0 };
        e.count++;
        e.hours += log.hours || 0;
        wm.set(wk, e);
      }
      return Array.from(wm.entries())
        .sort(([a], [b]) => {
          const [am, ad] = a.split("/").map(Number);
          const [bm, bd] = b.split("/").map(Number);
          return am !== bm ? am - bm : ad - bd;
        })
        .slice(-8)
        .map(([week, d]) => ({ week: `${week}주`, 업무량: d.count, 시간: Math.round(d.hours * 10) / 10 }));
    })();

    const projectBreakdown = (() => {
      const pm = new Map<string, number>();
      for (const log of entityLogs) {
        for (const p of log.projects) {
          if (selected.projects.includes(p)) pm.set(p, (pm.get(p) || 0) + 1);
        }
      }
      return Array.from(pm.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    })();

    const color = ENTITY_COLORS[selected.entity] || "#94a3b8";

    const recalcSelected = entityStats.find((e) => e.entity === selected.entity) || selected;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-violet-500" />
              법인 통합 뷰
            </h1>
            <p className="text-sm text-muted-foreground">법인별 업무 현황을 한눈에 확인하세요</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => { setSelected(null); setDrilldownStatus("all"); setShowAllDrilldown(false); }}>
            <ArrowLeft className="h-4 w-4" /> 전체 법인
          </Button>
        </div>

        {/* Entity name + badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-8 w-1 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-xl font-bold">{selected.entity}</h2>
          <div className="flex gap-1 flex-wrap">
            {selected.projects.map((p) => (
              <Badge key={p} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[p]}`}>
                {p}
              </Badge>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "전체 업무", value: recalcSelected.totalLogs, unit: "건", icon: Activity, iconColor: "text-blue-500" },
            { label: "완료율", value: recalcSelected.completionRate, unit: "%", icon: CheckCircle2, iconColor: "text-green-500" },
            { label: "진행 중", value: recalcSelected.inProgressLogs, unit: "건", icon: Loader2, iconColor: "text-indigo-500" },
            { label: "총 시간", value: recalcSelected.totalHours, unit: "h", icon: Timer, iconColor: "text-amber-500" },
          ].map((item) => (
            <Card key={item.label} className="border-0 bg-gradient-to-br from-accent/60 to-accent/20">
              <CardContent className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <span className="text-2xl font-bold">{item.value}</span>
                <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Status pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">상태별 분포</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">데이터 없음</div>
              ) : (
                <div className="flex h-[200px] items-center">
                  <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <defs>
                          {statusData.map((entry, i) => (
                            <linearGradient key={i} id={`drillStatus-${i}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                              <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0} paddingAngle={3} cornerRadius={4} animationDuration={600}>
                          {statusData.map((_, i) => (
                            <Cell key={i} fill={`url(#drillStatus-${i})`} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [`${val}건 (${Math.round((Number(val) / statusTotal) * 100)}%)`, String(name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{statusTotal}</p>
                        <p className="text-[10px] text-muted-foreground">전체</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pr-2">
                    {statusData.map((d) => (
                      <button key={d.name} onClick={() => setDrilldownStatus(drilldownStatus === d.name ? "all" : d.name as Status)} className={`flex items-center gap-2 px-2 py-0.5 rounded transition-colors ${drilldownStatus === d.name ? "bg-accent" : "hover:bg-accent/50"}`}>
                        <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-muted-foreground w-12">{d.name}</span>
                        <span className="text-xs font-semibold tabular-nums">{d.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">주간 업무 추이</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">데이터 없음</div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="drillWeekGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val, name) => [String(name) === "시간" ? `${val}h` : `${val}건`, String(name)]} />
                      <Area type="monotone" dataKey="업무량" stroke={color} strokeWidth={2.5} fill="url(#drillWeekGrad)" animationDuration={600} dot={{ r: 3, fill: color }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project breakdown */}
        {projectBreakdown.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">사업장별 업무 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={70} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val}건`, "업무"]} />
                    <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} animationDuration={600} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task list */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                업무 목록
                {drilldownStatus !== "all" && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">{drilldownStatus} 필터</Badge>
                )}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{displayLogs.length}건</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">업무가 없습니다</p>
            ) : (
              <div className="divide-y">
                {visibleLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{log.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {log.date} ({["일","월","화","수","목","금","토"][new Date(log.date + "T00:00:00").getDay()]})
                        </span>
                        {log.hours && <span className="text-[11px] text-muted-foreground">{log.hours}h</span>}
                        {log.projects.map((p) => (
                          <Badge key={p} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[p]}`}>
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] shrink-0 ${STATUS_COLORS[log.status]}`}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
                {!showAllDrilldown && displayLogs.length > 30 && (
                  <button onClick={() => setShowAllDrilldown(true)} className="w-full text-xs text-muted-foreground py-3 hover:bg-accent/30 transition-colors flex items-center justify-center gap-1">
                    <ChevronDown className="h-3 w-3" />
                    나머지 {displayLogs.length - 30}건 더 보기
                  </button>
                )}
                {showAllDrilldown && displayLogs.length > 30 && (
                  <button onClick={() => setShowAllDrilldown(false)} className="w-full text-xs text-muted-foreground py-3 hover:bg-accent/30 transition-colors flex items-center justify-center gap-1">
                    <ChevronUp className="h-3 w-3" />
                    접기
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──── Main overview ────
  const activeEntities = entityStats.filter((e) => e.totalLogs > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-violet-500" />
            법인 통합 뷰
          </h1>
          <p className="text-sm text-muted-foreground">법인별 업무 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-accent/50 rounded-lg p-0.5">
            {([
              ["all", "전체"],
              ["thisMonth", "이번달"],
              ["last3Months", "3개월"],
              ["last6Months", "6개월"],
            ] as [PeriodFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                  period === key
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "활성 법인", value: totalSummary.active, unit: `/ ${entityStats.length}`, icon: Building2, iconColor: "text-violet-500", gradient: "from-violet-500/10 to-violet-500/0" },
          { label: "전체 업무", value: totalSummary.total, unit: "건", icon: Activity, iconColor: "text-blue-500", gradient: "from-blue-500/10 to-blue-500/0" },
          { label: "평균 완료율", value: totalSummary.rate, unit: "%", icon: TrendingUp, iconColor: "text-green-500", gradient: "from-green-500/10 to-green-500/0" },
          { label: "총 투입시간", value: totalSummary.hours, unit: "h", icon: Clock, iconColor: "text-amber-500", gradient: "from-amber-500/10 to-amber-500/0" },
          { label: "이번달 업무", value: totalSummary.thisMonth, unit: "건", icon: CalendarDays, iconColor: "text-cyan-500", gradient: "from-cyan-500/10 to-cyan-500/0" },
        ].map((item) => (
          <Card key={item.label} className={`border-0 bg-gradient-to-br ${item.gradient}`}>
            <CardContent className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <item.icon className={`h-4 w-4 ${item.iconColor}`} />
              </div>
              <div>
                <span className="text-2xl font-bold">{item.value}</span>
                <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">정렬:</span>
        {([
          ["thisMonthLogs", "이번달"],
          ["totalLogs", "업무량"],
          ["completionRate", "완료율"],
          ["totalHours", "시간"],
          ["name", "이름"],
        ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 ${
              sortKey === key ? "bg-accent border-border font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {label}
            {sortKey === key && (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </button>
        ))}
      </div>

      {/* Entity cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedStats.map((es) => {
          const color = ENTITY_COLORS[es.entity] || "#94a3b8";
          const hasData = es.totalLogs > 0;
          return (
            <Card
              key={es.entity}
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border-l-4 group"
              style={{ borderLeftColor: color }}
              onClick={() => { setSelected(es); setDrilldownStatus("all"); setShowAllDrilldown(false); }}
            >
              <CardContent className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{es.entity}</h3>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {es.projects.map((p) => (
                      <Badge key={p} variant="secondary" className={`text-[9px] ${PROJECT_COLORS[p]}`}>
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                {hasData ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                          <CalendarDays className="h-3 w-3" />
                          <span className="text-[10px]">이번 달</span>
                        </div>
                        <p className="text-lg font-bold">{es.thisMonthLogs}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-[10px]">완료율</span>
                        </div>
                        <p className={`text-lg font-bold ${es.completionRate >= 70 ? "text-green-600 dark:text-green-400" : es.completionRate >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                          {es.completionRate}%
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px]">진행 중</span>
                        </div>
                        <p className="text-lg font-bold">{es.inProgressLogs}</p>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${es.completionRate}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        전체 {es.totalLogs}건 · {es.totalHours}h
                      </p>
                      <span className="text-[10px] text-violet-500 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        상세 보기 →
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Pause className="h-4 w-4 mr-1.5" />
                    <p className="text-xs">업무 데이터 없음</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison charts */}
      {compareData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                법인 간 비교
              </CardTitle>
              <div className="flex items-center gap-1 bg-accent/50 rounded-lg p-0.5">
                <button
                  onClick={() => setCompareView("bar")}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${compareView === "bar" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  막대
                </button>
                <button
                  onClick={() => setCompareView("radar")}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${compareView === "radar" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  레이더
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {compareView === "bar" ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={35} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="업무량" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={600} maxBarSize={32} />
                    <Bar dataKey="완료율" fill="#22c55e" radius={[4, 4, 0, 0]} animationDuration={600} maxBarSize={32} />
                    <Bar dataKey="이번달" fill="#06b6d4" radius={[4, 4, 0, 0]} animationDuration={600} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid className="stroke-border/30" />
                    <PolarAngleAxis dataKey="name" fontSize={11} />
                    <PolarRadiusAxis fontSize={10} angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="업무량" dataKey="업무량" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} animationDuration={600} />
                    <Radar name="완료율" dataKey="완료율" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} animationDuration={600} />
                    <Radar name="시간투자" dataKey="시간투자" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} animationDuration={600} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly trend */}
      {monthlyTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              월별 업무량 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val}건`]} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {activeEntities.map((es) => (
                    <Line
                      key={es.entity}
                      type="monotone"
                      dataKey={ENTITY_SHORT[es.entity] || es.entity}
                      stroke={ENTITY_COLORS[es.entity] || "#94a3b8"}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      animationDuration={600}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
