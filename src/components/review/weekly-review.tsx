"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Hourglass,
  Bookmark,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { STATUS_COLORS, PROJECT_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import { getWeekRange, categorizeForReview } from "@/lib/review-utils";
import type { WorkLog, Status } from "@/lib/types";

interface WeeklyReviewProps {
  allLogs: WorkLog[];
}

async function updateStatus(id: string, status: Status) {
  const res = await fetch(`/api/logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("상태 변경 실패");
}

function TaskItem({ log }: { log: WorkLog }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{log.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground">{log.date}</span>
          <Badge variant="secondary" className={`text-[10px] ${PROJECT_COLORS[log.project]}`}>
            {log.project}
          </Badge>
          {log.priority && (
            <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[log.priority]}`}>
              {log.priority}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  variant = "outline",
  loading,
}: {
  label: string;
  onClick: () => void;
  variant?: "outline" | "default" | "destructive";
  loading?: boolean;
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      className="h-7 text-xs"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
    </Button>
  );
}

export function WeeklyReview({ allLogs: initialLogs }: WeeklyReviewProps) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const review = useMemo(() => categorizeForReview(logs, start, end), [logs, start, end]);

  async function refreshData() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setProcessedIds(new Set());
      }
    } finally {
      setRefreshing(false);
    }
  }

  const handleAction = async (id: string, status: Status, message: string) => {
    setLoadingId(id);
    try {
      await updateStatus(id, status);
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      setProcessedIds((prev) => new Set(prev).add(id));
      toast.success(message);
    } catch {
      toast.error("상태 변경에 실패했습니다");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/logs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setProcessedIds((prev) => new Set(prev).add(id));
      toast.success("업무가 삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setLoadingId(null);
    }
  };

  const isProcessed = (id: string) => processedIds.has(id);
  const isLoading = (id: string) => loadingId === id;

  const summaryCards = [
    { title: "이번 주 완료", value: review.completed.length, icon: CheckCircle2, color: "text-emerald-500" },
    { title: "미완료", value: review.incomplete.length, icon: AlertTriangle, color: "text-red-500" },
    { title: "대기중", value: review.waiting.length, icon: Hourglass, color: "text-orange-500" },
    { title: "언젠가", value: review.someday.length, icon: Bookmark, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setWeekOffset((o) => o - 1); setProcessedIds(new Set()); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {start} ~ {end}
          </h2>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setWeekOffset((o) => o + 1); setProcessedIds(new Set()); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {weekOffset !== 0 && (
          <Button variant="outline" size="sm" onClick={() => { setWeekOffset(0); setProcessedIds(new Set()); }}>
            이번 주
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-0 bg-accent/40">
            <CardContent className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-semibold tracking-tight">{card.value}</span>
                <span className="text-xs text-muted-foreground">건</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 1: Completed Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            이번 주 완료 업무
          </CardTitle>
        </CardHeader>
        <CardContent>
          {review.completed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">완료된 업무가 없습니다</p>
          ) : (
            <div className="divide-y">
              {review.completed.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through text-muted-foreground truncate">{log.title}</p>
                    <span className="text-[11px] text-muted-foreground">{log.date}</span>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${PROJECT_COLORS[log.project]}`}>
                    {log.project}
                  </Badge>
                  {log.hours !== null && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{log.hours}h</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Incomplete Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            미완료 업무 점검
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            완료되지 않은 업무를 검토하고 다음 행동을 결정하세요
          </p>
        </CardHeader>
        <CardContent>
          {review.incomplete.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">미완료 업무가 없습니다</p>
          ) : (
            <div className="divide-y">
              {review.incomplete.filter((l) => !isProcessed(l.id)).map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <TaskItem log={log} />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <ActionButton label="다음 주로" onClick={() => handleAction(log.id, "다음행동", `"${log.title}" → 다음행동`)} loading={isLoading(log.id)} />
                    <ActionButton label="언젠가로" onClick={() => handleAction(log.id, "언젠가", `"${log.title}" → 언젠가`)} loading={isLoading(log.id)} />
                    <ActionButton label="삭제" variant="destructive" onClick={() => handleDelete(log.id)} loading={isLoading(log.id)} />
                  </div>
                </div>
              ))}
              {review.incomplete.length > 0 && review.incomplete.every((l) => isProcessed(l.id)) && (
                <p className="text-sm text-muted-foreground py-4 text-center">모든 미완료 업무를 처리했습니다</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Waiting For */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-orange-500" />
            대기중 점검
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            기다리고 있는 업무들의 상태를 확인하세요
          </p>
        </CardHeader>
        <CardContent>
          {review.waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">대기중인 업무가 없습니다</p>
          ) : (
            <div className="divide-y">
              {review.waiting.filter((l) => !isProcessed(l.id)).map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <TaskItem log={log} />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <ActionButton label="완료" variant="default" onClick={() => handleAction(log.id, "완료", `"${log.title}" → 완료`)} loading={isLoading(log.id)} />
                    <ActionButton label="다음행동으로" onClick={() => handleAction(log.id, "다음행동", `"${log.title}" → 다음행동`)} loading={isLoading(log.id)} />
                    <ActionButton label="계속 대기" onClick={() => { setProcessedIds((prev) => new Set(prev).add(log.id)); toast.info(`"${log.title}" 계속 대기`); }} loading={isLoading(log.id)} />
                  </div>
                </div>
              ))}
              {review.waiting.length > 0 && review.waiting.every((l) => isProcessed(l.id)) && (
                <p className="text-sm text-muted-foreground py-4 text-center">모든 대기 업무를 점검했습니다</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Someday */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-slate-400" />
            언젠가 목록 점검
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            언젠가 할 업무 중 지금 시작할 것이 있는지 검토하세요
          </p>
        </CardHeader>
        <CardContent>
          {review.someday.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">언젠가 목록이 비어있습니다</p>
          ) : (
            <div className="divide-y">
              {review.someday.filter((l) => !isProcessed(l.id)).map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <TaskItem log={log} />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <ActionButton label="다음행동으로" onClick={() => handleAction(log.id, "다음행동", `"${log.title}" → 다음행동`)} loading={isLoading(log.id)} />
                    <ActionButton label="유지" onClick={() => { setProcessedIds((prev) => new Set(prev).add(log.id)); toast.info(`"${log.title}" 유지`); }} loading={isLoading(log.id)} />
                  </div>
                </div>
              ))}
              {review.someday.length > 0 && review.someday.every((l) => isProcessed(l.id)) && (
                <p className="text-sm text-muted-foreground py-4 text-center">모든 언젠가 업무를 점검했습니다</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Next Week Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-indigo-500" />
            다음 주 계획 (현재 다음행동 목록)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {review.nextActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">다음행동 목록이 비어있습니다</p>
          ) : (
            <div className="divide-y">
              {review.nextActions.map((log) => (
                <div key={log.id} className="flex items-center gap-3 py-2">
                  <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{log.date}</span>
                      {log.priority && (
                        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[log.priority]}`}>
                          {log.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${PROJECT_COLORS[log.project]}`}>
                    {log.project}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          리뷰 새로고침
        </Button>
      </div>
    </div>
  );
}
