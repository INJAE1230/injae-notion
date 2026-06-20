"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_COLORS } from "@/lib/constants";
import type { WorkLog } from "@/lib/types";

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function DeadlineAlert({ logs }: { logs: WorkLog[] }) {
  const [dismissed, setDismissed] = useState(false);

  const overdue = logs.filter((log) => {
    if (log.status === "완료" || log.status === "언젠가" || !log.date) return false;
    return getDaysUntil(log.date) < 0;
  });

  const todayDue = logs.filter((log) => {
    if (log.status === "완료" || log.status === "언젠가" || !log.date) return false;
    return getDaysUntil(log.date) === 0;
  });

  useEffect(() => {
    if ((overdue.length > 0 || todayDue.length > 0) && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (overdue.length > 0 && "Notification" in window && Notification.permission === "granted") {
      new Notification("업무일지 - 기한 지남", {
        body: `${overdue.length}건의 업무가 기한을 넘겼습니다`,
        icon: "/icon",
      });
    }
  }, [overdue.length, todayDue.length]);

  if (dismissed || (overdue.length === 0 && todayDue.length === 0)) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {overdue.length > 0 && `기한 지난 업무 ${overdue.length}건`}
              {overdue.length > 0 && todayDue.length > 0 && " · "}
              {todayDue.length > 0 && `오늘 마감 ${todayDue.length}건`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...overdue, ...todayDue].slice(0, 5).map((log) => (
                <Link key={log.id} href={`/logs/${log.id}`}>
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:opacity-80 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  >
                    {log.title}
                  </Badge>
                </Link>
              ))}
              {overdue.length + todayDue.length > 5 && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  +{overdue.length + todayDue.length - 5}건
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-red-400 hover:text-red-600"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
