"use client";

import { useEffect, useState } from "react";
import { Sparkles, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getKSTToday } from "@/lib/date-utils";
import type { WorkLog } from "@/lib/types";
import type { BriefingPayload } from "@/lib/ai-parser";

const CACHE_KEY = "morning-briefing";

function buildPayload(logs: WorkLog[], today: string): BriefingPayload {
  const weekStart = new Date(today + "T00:00:00");
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

  return {
    todayTasks: logs
      .filter((l) => l.date === today)
      .slice(0, 15)
      .map((l) => ({ title: l.title, status: l.status, priority: l.priority, projects: l.projects })),
    overdue: logs
      .filter((l) => l.date && l.date < today && l.status === "예정")
      .slice(0, 10)
      .map((l) => ({ title: l.title, date: l.date, priority: l.priority, projects: l.projects })),
    inProgress: logs
      .filter((l) => l.status === "진행 중")
      .slice(0, 10)
      .map((l) => ({ title: l.title, projects: l.projects })),
    weekCompleted: logs.filter(
      (l) => l.status === "완료" && l.date >= weekStartStr && l.date <= today
    ).length,
  };
}

export function MorningBriefing({ logs }: { logs: WorkLog[] }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load(force: boolean) {
    const today = getKSTToday();

    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached?.date === today && cached.text) {
          setText(cached.text);
          return;
        }
      } catch {
        // 캐시 파싱 실패 시 새로 생성
      }
    }

    const payload = buildPayload(logs, today);

    if (payload.todayTasks.length === 0 && payload.overdue.length === 0 && payload.inProgress.length === 0) {
      const msg = "오늘 예정된 업무가 없습니다. 여유 있는 하루 보내세요.";
      setText(msg);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, text: msg }));
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setText(data.briefing);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, text: data.briefing }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return null;

  return (
    <div className="rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-sky-50 dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-sky-950/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Sparkles className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">오늘 브리핑</p>
            {loading ? (
              <div className="space-y-2 py-0.5">
                <div className="h-3 w-64 max-w-full rounded bg-indigo-200/60 dark:bg-indigo-800/40 animate-pulse" />
                <div className="h-3 w-44 rounded bg-indigo-200/60 dark:bg-indigo-800/40 animate-pulse" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {text}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-indigo-400 hover:text-indigo-600"
          onClick={() => load(true)}
          disabled={loading}
          title="다시 생성"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
