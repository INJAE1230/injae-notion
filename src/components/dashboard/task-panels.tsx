"use client";

import { useState } from "react";
import { TodayTasks } from "./today-tasks";
import { InProgressTasks, selectInProgress } from "./in-progress-tasks";
import { UpcomingDeadlines, selectUpcoming } from "./upcoming-deadlines";
import { cn } from "@/lib/utils";
import type { WorkLog } from "@/lib/types";

/**
 * 오늘의 업무·진행 중·마감 임박 세 목록을 함께 배치한다.
 *
 * 데스크톱은 3열로 나란히 두지만, 모바일에서는 세로로 쌓이면 스크롤이 길어지고
 * 같은 업무가 여러 카드에 중복 노출된다(오늘 날짜이면서 진행 중인 업무 등).
 * 그래서 모바일에서만 세그먼트 전환으로 한 번에 하나만 보여준다.
 *
 * 세 목록을 하나로 합치지는 않는다 — 진행 중 목록은 여러 날에 걸친 업무가
 * 어디에도 안 보이던 문제를 막으려 의도적으로 분리한 것이라, 합치면 그 의도가 사라진다.
 */

type TabKey = "today" | "progress" | "deadline";

export function TaskPanels({
  todayLogs,
  allLogs,
}: {
  todayLogs: WorkLog[];
  allLogs: WorkLog[];
}) {
  const [tab, setTab] = useState<TabKey>("today");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "today", label: "오늘", count: todayLogs.length },
    { key: "progress", label: "진행 중", count: selectInProgress(allLogs).length },
    { key: "deadline", label: "마감 임박", count: selectUpcoming(allLogs).length },
  ];

  return (
    <>
      {/* 모바일: 한 번에 하나만 */}
      <div className="space-y-3 md:hidden">
        <div
          role="tablist"
          aria-label="업무 목록 전환"
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] tabular-nums",
                    tab === t.key ? "bg-primary/10 text-primary" : "bg-background/60"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "today" && <TodayTasks logs={todayLogs} />}
        {tab === "progress" && <InProgressTasks logs={allLogs} />}
        {tab === "deadline" && <UpcomingDeadlines logs={allLogs} />}
      </div>

      {/* 데스크톱: 3열 그대로 */}
      <div className="hidden gap-6 md:grid md:grid-cols-3">
        <TodayTasks logs={todayLogs} />
        <InProgressTasks logs={allLogs} />
        <UpcomingDeadlines logs={allLogs} />
      </div>
    </>
  );
}
