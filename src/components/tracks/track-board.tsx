"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  Timer,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Sparkles,
  MessageSquare,
  Loader2,
  FileText,
  Copy,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ENTITIES, TRACK_STATUSES, TRACK_STATUS_COLORS, PROJECT_COLORS, STATUS_COLORS } from "@/lib/constants";
import type { Track, TrackFormData, WorkLog, TrackStatus, WorkLogFormData } from "@/lib/types";
import { LogForm } from "@/components/logs/log-form";
import { MemoPreview } from "@/components/memo/memo-preview";

interface TrackBoardProps {
  tracks: Track[];
  allLogs: WorkLog[];
  initialTrackId?: string;
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

const STATUS_CHART_COLORS: Record<string, string> = {
  "다음행동": "#818cf8",
  "진행 중": "#6366f1",
  "대기중": "#fb923c",
  "예정": "#eab308",
  "언젠가": "#94a3b8",
  "완료": "#22c55e",
};

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--background)",
  fontSize: "12px",
};

function getDday(targetDate: string | null): { label: string; urgent: boolean } {
  if (!targetDate) return { label: "기한 없음", urgent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + "T00:00:00");
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, urgent: true };
  if (diff === 0) return { label: "D-day", urgent: true };
  return { label: `D-${diff}`, urgent: diff <= 7 };
}

function emptyForm(): TrackFormData {
  return { title: "", entity: null, startDate: null, targetDate: null, status: "계획", description: null };
}

export function TrackBoard({ tracks: initialTracks, allLogs, initialTrackId }: TrackBoardProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selected, setSelected] = useState<Track | null>(() =>
    initialTrackId ? (initialTracks.find((t) => t.id === initialTrackId) ?? null) : null
  );
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [form, setForm] = useState<TrackFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showLogForm, setShowLogForm] = useState(false);

  // AI 요약 (트랙 상세)
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 전체 AI 요약 (리스트)
  const [allSummary, setAllSummary] = useState<string | null>(null);
  const [allSummaryLoading, setAllSummaryLoading] = useState(false);

  // 진행 보고
  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // 카톡 붙여넣기
  const [showKakao, setShowKakao] = useState(false);
  const [kakaoText, setKakaoText] = useState("");
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoEntries, setKakaoEntries] = useState<WorkLogFormData[] | null>(null);
  const [kakaoOriginalText, setKakaoOriginalText] = useState("");

  // 업무 삭제
  const [deletedLogIds, setDeletedLogIds] = useState<Set<string>>(new Set());
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const trackLogs = (track: Track) =>
    allLogs.filter((l) => l.trackId === track.id && !deletedLogIds.has(l.id));

  const trackStats = (track: Track) => {
    const logs = trackLogs(track);
    const completed = logs.filter((l) => l.status === "완료").length;
    const inProgress = logs.filter((l) => l.status === "진행 중" || l.status === "다음행동").length;
    const hours = logs.reduce((s, l) => s + (l.hours || 0), 0);
    return {
      total: logs.length,
      completed,
      inProgress,
      hours: Math.round(hours * 10) / 10,
      rate: logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0,
    };
  };

  async function handleSave() {
    if (!form.title.trim()) { toast.error("트랙명을 입력하세요"); return; }
    setSaving(true);
    try {
      if (editingTrack) {
        await fetch(`/api/tracks/${editingTrack.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        setTracks((prev) => prev.map((t) => t.id === editingTrack.id ? { ...t, ...form } : t));
        if (selected?.id === editingTrack.id) setSelected({ ...editingTrack, ...form });
        toast.success("트랙이 수정되었습니다");
      } else {
        const res = await fetch("/api/tracks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const { id } = await res.json();
        const newTrack: Track = { id, ...form };
        setTracks((prev) => [newTrack, ...prev]);
        toast.success("트랙이 생성되었습니다");
      }
      setShowForm(false);
      setEditingTrack(null);
      setForm(emptyForm());
    } catch {
      toastError("저장에 실패했습니다", handleSave);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(track: Track) {
    if (!confirm(`"${track.title}" 트랙을 삭제할까요?`)) return;
    try {
      await fetch(`/api/tracks/${track.id}`, { method: "DELETE" });
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      if (selected?.id === track.id) setSelected(null);
      toast.success("트랙이 삭제되었습니다");
    } catch {
      toastError("삭제에 실패했습니다", () => handleDelete(track));
    }
  }

  async function handleSummary(track: Track, logs: ReturnType<typeof trackLogs>) {
    setSummary(null);
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/tracks/${track.id}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, logs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary);
    } catch {
      toast.error("요약 생성에 실패했습니다");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleAllSummary() {
    setAllSummary(null);
    setAllSummaryLoading(true);
    try {
      const statsMap: Record<string, ReturnType<typeof trackStats>> = {};
      for (const t of tracks) statsMap[t.id] = trackStats(t);
      const res = await fetch("/api/tracks/all-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks, statsMap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllSummary(data.summary);
    } catch {
      toast.error("전체 요약 생성에 실패했습니다");
    } finally {
      setAllSummaryLoading(false);
    }
  }

  async function handleReport(track: Track, logs: ReturnType<typeof trackLogs>) {
    setReport(null);
    setReportLoading(true);
    try {
      const res = await fetch(`/api/tracks/${track.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, logs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch {
      toast.error("보고서 생성에 실패했습니다");
    } finally {
      setReportLoading(false);
    }
  }

  async function handleKakaoParse() {
    if (!kakaoText.trim()) { toast.error("텍스트를 붙여넣어주세요"); return; }
    setKakaoLoading(true);
    try {
      const res = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: kakaoText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const withTrack = (data.entries as WorkLogFormData[]).map((e) => ({
        ...e,
        trackId: selected?.id ?? null,
      }));
      setKakaoEntries(withTrack);
      setKakaoOriginalText(data.originalText ?? kakaoText);
    } catch {
      toast.error("파싱에 실패했습니다");
    } finally {
      setKakaoLoading(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    setDeletingLogId(logId);
    try {
      const res = await fetch(`/api/logs/${logId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeletedLogIds((prev) => new Set([...prev, logId]));
      toast.success("업무가 삭제되었습니다");
    } catch {
      toastError("삭제에 실패했습니다", () => handleDeleteLog(logId));
    } finally {
      setDeletingLogId(null);
      setConfirmDeleteLogId(null);
    }
  }

  function openEdit(track: Track) {
    setEditingTrack(track);
    setForm({ title: track.title, entity: track.entity, startDate: track.startDate, targetDate: track.targetDate, status: track.status, description: track.description });
    setShowForm(true);
  }

  // ── Drill-down ──
  if (selected) {
    const logs = trackLogs(selected);
    const stats = trackStats(selected);
    const color = ENTITY_COLORS[selected.entity || ""] || "#8b5cf6";
    const dday = getDday(selected.targetDate);

    const filtered = statusFilter === "all" ? logs : logs.filter((l) => l.status === statusFilter);
    const visible = showAllLogs ? filtered : filtered.slice(0, 30);

    const statusData = (["완료", "진행 중", "다음행동", "대기중", "예정", "언젠가"] as const)
      .map((s) => ({ name: s, value: logs.filter((l) => l.status === s).length, color: STATUS_CHART_COLORS[s] }))
      .filter((d) => d.value > 0);

    const weeklyData = (() => {
      const wm = new Map<string, number>();
      for (const log of logs) {
        const d = new Date(log.date + "T00:00:00");
        const ws = new Date(d);
        ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const wk = `${ws.getMonth() + 1}/${ws.getDate()}`;
        wm.set(wk, (wm.get(wk) || 0) + 1);
      }
      return Array.from(wm.entries())
        .sort(([a], [b]) => {
          const [am, ad] = a.split("/").map(Number);
          const [bm, bd] = b.split("/").map(Number);
          return am !== bm ? am - bm : ad - bd;
        })
        .slice(-8)
        .map(([week, count]) => ({ week: `${week}주`, 업무량: count }));
    })();

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-violet-500" />
              트랙
            </h1>
            <p className="text-sm text-muted-foreground">장기 업무 흐름을 관리하세요</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => { setSelected(null); setStatusFilter("all"); setShowAllLogs(false); setSummary(null); setReport(null); router.replace("/tracks", { scroll: false }); }}>
            <ArrowLeft className="h-4 w-4" /> 전체 트랙
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-8 w-1 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{selected.title}</h2>
              <Badge variant="secondary" className={`text-[11px] ${TRACK_STATUS_COLORS[selected.status]}`}>
                {selected.status}
              </Badge>
              {dday.label !== "기한 없음" && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dday.urgent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-accent text-muted-foreground"}`}>
                  {dday.label}
                </span>
              )}
            </div>
            {selected.entity && (
              <span className="text-sm text-muted-foreground">{selected.entity}</span>
            )}
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5" onClick={() => setShowLogForm(true)}>
              <Plus className="h-3.5 w-3.5" /> 업무 추가
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setShowKakao(true); setKakaoText(""); setKakaoEntries(null); }}>
              <MessageSquare className="h-3.5 w-3.5" /> 카톡 붙여넣기
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleSummary(selected, logs)}
              disabled={summaryLoading}
            >
              {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI 요약
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleReport(selected, logs)}
              disabled={reportLoading}
            >
              {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
              진행 보고
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => openEdit(selected)}>
              <Pencil className="h-3.5 w-3.5" /> 수정
            </Button>
          </div>
        </div>

        {selected.description && (
          <p className="text-sm text-muted-foreground bg-accent/30 rounded-lg px-4 py-3">{selected.description}</p>
        )}

        {summary && (
          <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI 진행 요약
              </div>
              <button onClick={() => setSummary(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{summary}</p>
          </div>
        )}

        {report && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <ClipboardList className="h-3.5 w-3.5" />
                진행 보고서
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { navigator.clipboard.writeText(report); toast.success("클립보드에 복사됐습니다"); }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors"
                  title="복사"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setReport(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{report}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "전체 업무", value: stats.total, unit: "건", icon: Activity, iconColor: "text-blue-500" },
            { label: "완료율", value: stats.rate, unit: "%", icon: CheckCircle2, iconColor: "text-green-500" },
            { label: "진행 중", value: stats.inProgress, unit: "건", icon: Layers, iconColor: "text-indigo-500" },
            { label: "총 시간", value: stats.hours, unit: "h", icon: Timer, iconColor: "text-amber-500" },
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

        {logs.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">상태별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-[200px] items-center">
                  <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0} paddingAngle={3} cornerRadius={4} animationDuration={600}>
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val}건`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-[10px] text-muted-foreground">전체</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pr-2">
                    {statusData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-muted-foreground w-14">{d.name}</span>
                        <span className="text-xs font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">주간 업무 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="trackWeekGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val}건`]} />
                      <Area type="monotone" dataKey="업무량" stroke={color} strokeWidth={2.5} fill="url(#trackWeekGrad)" animationDuration={600} dot={{ r: 3, fill: color }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium">업무 목록</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {["다음행동", "진행 중", "대기중", "예정", "언젠가", "완료"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">{filtered.length}건</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">업무가 없습니다</p>
            ) : (
              <div className="divide-y">
                {visible.map((log) => (
                  <div key={log.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                    {confirmDeleteLogId === log.id ? (
                      // 삭제 확인 UI
                      <div className="flex flex-1 items-center gap-2 flex-wrap">
                        <p className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                          <span className="font-medium text-foreground">{log.title}</span>을(를) 삭제할까요?
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setConfirmDeleteLogId(null)}
                            className="text-xs px-2.5 py-1 rounded-md border hover:bg-accent transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            disabled={deletingLogId === log.id}
                            className="text-xs px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {deletingLogId === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            삭제
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 일반 row
                      <>
                        <Link href={`/logs/${log.id}?from=${encodeURIComponent(`/tracks?track=${selected.id}`)}`} className="flex-1 min-w-0 group/link">
                          <p className="text-sm truncate group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400 transition-colors">
                            {log.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">
                              {log.date} ({["일","월","화","수","목","금","토"][new Date(log.date + "T00:00:00").getDay()]})
                            </span>
                            {log.hours && <span className="text-[11px] text-muted-foreground">{log.hours}h</span>}
                            {log.projects.map((p) => (
                              <Badge key={p} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[p]}`}>{p}</Badge>
                            ))}
                          </div>
                        </Link>
                        <Badge variant="secondary" className={`text-[10px] shrink-0 ${STATUS_COLORS[log.status]}`}>
                          {log.status}
                        </Badge>
                        <button
                          onClick={() => setConfirmDeleteLogId(log.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {!showAllLogs && filtered.length > 30 && (
                  <button onClick={() => setShowAllLogs(true)} className="w-full text-xs text-muted-foreground py-3 hover:bg-accent/30 transition-colors flex items-center justify-center gap-1">
                    <ChevronDown className="h-3 w-3" /> 나머지 {filtered.length - 30}건 더 보기
                  </button>
                )}
                {showAllLogs && filtered.length > 30 && (
                  <button onClick={() => setShowAllLogs(false)} className="w-full text-xs text-muted-foreground py-3 hover:bg-accent/30 transition-colors flex items-center justify-center gap-1">
                    <ChevronUp className="h-3 w-3" /> 접기
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && <TrackFormModal form={form} setForm={setForm} saving={saving} onSave={handleSave} onClose={() => { setShowForm(false); setEditingTrack(null); setForm(emptyForm()); }} isEdit={!!editingTrack} />}

        {showLogForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl border my-8">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="text-sm font-semibold">업무 추가 — {selected.title}</h2>
                <button onClick={() => setShowLogForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5">
                <LogForm
                  initialTrackId={selected.id}
                  key={selected.id}
                  onSuccess={() => {
                    setShowLogForm(false);
                    router.refresh();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {showKakao && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl border my-8">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-yellow-500" />
                    카톡 보고 붙여넣기 — {selected.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">카카오톡 내용을 그대로 붙여넣으면 AI가 업무를 파악해 이 트랙에 자동 연결합니다</p>
                </div>
                <button onClick={() => setShowKakao(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {!kakaoEntries ? (
                  <>
                    <div className="relative">
                      <textarea
                        className="w-full min-h-[180px] rounded-lg border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder={"카카오톡 대화 내용을 여기에 붙여넣거나 txt 파일을 업로드하세요.\n\n예:\n청초수 오늘 발주 완료했습니다 3시간 걸렸어요\n다음주 목요일 바이어 미팅 예정\nJS코퍼 세금계산서 처리 완료"}
                        value={kakaoText}
                        onChange={(e) => setKakaoText(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground border rounded-md px-3 py-2 transition-colors hover:bg-accent">
                        <FileText className="h-3.5 w-3.5" />
                        txt 파일 불러오기
                        <input
                          type="file"
                          accept=".txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setKakaoText((ev.target?.result as string) || "");
                            };
                            reader.readAsText(file, "utf-8");
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <span className="text-xs text-muted-foreground">카카오톡 대화 내보내기(.txt) 지원</span>
                    </div>
                    {kakaoText.length > 6000 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        텍스트가 길어 {Math.ceil(kakaoText.length / 6000)}개 구간으로 나눠 분석합니다
                      </p>
                    )}
                    <Button
                      className="w-full gap-2"
                      onClick={handleKakaoParse}
                      disabled={kakaoLoading || !kakaoText.trim()}
                    >
                      {kakaoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {kakaoLoading ? "AI 분석 중..." : "AI로 업무 파악하기"}
                    </Button>
                  </>
                ) : (
                  <MemoPreview
                    entries={kakaoEntries}
                    originalText={kakaoOriginalText}
                    onUpdate={setKakaoEntries}
                    onReset={() => {
                      setKakaoEntries(null);
                      setKakaoText("");
                      setShowKakao(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main list ──
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-violet-500" />
            트랙
          </h1>
          <p className="text-sm text-muted-foreground">장기 업무 흐름을 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleAllSummary}
            disabled={allSummaryLoading || tracks.length === 0}
          >
            {allSummaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            전체 AI 요약
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setShowForm(true); setEditingTrack(null); setForm(emptyForm()); }}>
            <Plus className="h-4 w-4" /> 트랙 추가
          </Button>
        </div>
      </div>

      {allSummary && (
        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              전체 트랙 AI 요약
            </div>
            <button onClick={() => setAllSummary(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{allSummary}</p>
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Layers className="h-12 w-12 text-muted-foreground/20" />
          <p className="text-sm">아직 트랙이 없습니다</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>첫 트랙 만들기</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => {
            const stats = trackStats(track);
            const color = ENTITY_COLORS[track.entity || ""] || "#8b5cf6";
            const dday = getDday(track.targetDate);

            return (
              <Card
                key={track.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] border-l-4 group relative"
                style={{ borderLeftColor: color }}
                onClick={() => { setSelected(track); setStatusFilter("all"); setShowAllLogs(false); router.replace(`/tracks?track=${track.id}`, { scroll: false }); }}
              >
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">{track.title}</h3>
                      {track.entity && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {track.entity}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="secondary" className={`text-[10px] ${TRACK_STATUS_COLORS[track.status]}`}>
                        {track.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground flex-wrap">
                    {track.startDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {track.startDate}
                      </span>
                    )}
                    {track.targetDate && (
                      <span className={`flex items-center gap-1 font-medium ${dday.urgent ? "text-red-500" : ""}`}>
                        → {track.targetDate} ({dday.label})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div>
                      <p className="text-lg font-bold">{stats.total}</p>
                      <p className="text-[10px] text-muted-foreground">전체</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${stats.rate >= 70 ? "text-green-600 dark:text-green-400" : stats.rate >= 40 ? "text-amber-600 dark:text-amber-400" : stats.total > 0 ? "text-red-500" : ""}`}>
                        {stats.rate}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">완료율</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stats.inProgress}</p>
                      <p className="text-[10px] text-muted-foreground">진행 중</p>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.rate}%`, backgroundColor: color }} />
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-muted-foreground">{stats.hours}h 투입</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded hover:bg-accent transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEdit(track); }}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDelete(track); }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && <TrackFormModal form={form} setForm={setForm} saving={saving} onSave={handleSave} onClose={() => { setShowForm(false); setEditingTrack(null); setForm(emptyForm()); }} isEdit={!!editingTrack} />}
    </div>
  );
}

function TrackFormModal({
  form,
  setForm,
  saving,
  onSave,
  onClose,
  isEdit,
}: {
  form: TrackFormData;
  setForm: React.Dispatch<React.SetStateAction<TrackFormData>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">{isEdit ? "트랙 수정" : "새 트랙 만들기"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">트랙명 *</label>
            <Input
              placeholder="예: 일본 법인 설립"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">법인</label>
              <Select value={form.entity || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, entity: v === "__none__" ? null : v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">없음</SelectItem>
                  {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">상태</label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TrackStatus }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">시작일</label>
              <Input type="date" value={form.startDate || ""} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || null }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">목표완료일</label>
              <Input type="date" value={form.targetDate || ""} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value || null }))} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">설명</label>
            <Textarea
              placeholder="트랙에 대한 간략한 설명"
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
          <Button className="flex-1" onClick={onSave} disabled={saving}>
            {saving ? "저장 중..." : isEdit ? "수정" : "만들기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
