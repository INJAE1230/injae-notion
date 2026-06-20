"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_COLORS, PROJECT_COLORS } from "@/lib/constants";
import type { WorkLog } from "@/lib/types";

interface CalendarViewProps {
  logs: WorkLog[];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export function CalendarView({ logs }: CalendarViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = now.toISOString().split("T")[0];

  const logsByDate: Record<string, WorkLog[]> = {};
  for (const log of logs) {
    if (!log.date) continue;
    if (!logsByDate[log.date]) logsByDate[log.date] = [];
    logsByDate[log.date].push(log);
  }

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedLogs = selectedDate ? (logsByDate[selectedDate] || []) : [];

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[120px] text-center">
            {year}년 {MONTH_NAMES[month]}
          </h2>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>오늘</Button>
      </div>

      {/* 달력 그리드 */}
      <Card>
        <CardContent className="p-0 sm:p-2">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-medium ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[80px] border-t" />;

              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayLogs = logsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayOfWeek = (firstDay + day - 1) % 7;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[60px] sm:min-h-[80px] border-t p-1 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <div className={`text-xs sm:text-sm mb-0.5 ${
                    isToday
                      ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
                      : dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : ""
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 hidden sm:block">
                    {dayLogs.slice(0, 3).map((log) => (
                      <div
                        key={log.id}
                        className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 ${STATUS_COLORS[log.status]}`}
                      >
                        {log.title}
                      </div>
                    ))}
                    {dayLogs.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayLogs.length - 3}건</div>
                    )}
                  </div>
                  {/* 모바일: 점으로 표시 */}
                  {dayLogs.length > 0 && (
                    <div className="flex gap-0.5 sm:hidden mt-0.5">
                      {dayLogs.slice(0, 3).map((log) => (
                        <div
                          key={log.id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            log.status === "완료" ? "bg-green-500" :
                            log.status === "진행 중" ? "bg-blue-500" :
                            log.status === "다음행동" ? "bg-indigo-500" :
                            log.status === "대기중" ? "bg-orange-500" :
                            log.status === "언젠가" ? "bg-slate-400" : "bg-gray-400"
                          }`}
                        />
                      ))}
                      {dayLogs.length > 3 && <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 날짜의 업무 상세 */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {selectedDate} 업무 ({selectedLogs.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">이 날짜에 등록된 업무가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {selectedLogs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/logs/${log.id}`}
                    className="flex items-center gap-3 rounded-md p-2 -mx-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.title}</p>
                      {log.content && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{log.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className={`text-xs ${PROJECT_COLORS[log.project]}`}>
                        {log.project}
                      </Badge>
                      <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[log.status]}`}>
                        {log.status}
                      </Badge>
                      {log.hours !== null && (
                        <span className="text-xs text-muted-foreground">{log.hours}h</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
