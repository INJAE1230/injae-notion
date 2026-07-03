"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ATTENDANCE_CATEGORY_COLORS } from "@/lib/hr-types";
import type { Employee, AttendanceRecord, AttendanceCategory } from "@/lib/hr-types";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_INDEX_TO_LABEL: Record<number, string> = {
  0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토",
};

interface AttendanceCalendarProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  onAddClick: (date: string, employeeId: string) => void;
  onDeleteClick: (record: AttendanceRecord) => void;
}

function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: string; day: number; dayOfWeek: number; isCurrentMonth: boolean }[] = [];

  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: toLocalDateStr(d),
      day: d.getDate(),
      dayOfWeek: d.getDay(),
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month, d);
    days.push({
      date: toLocalDateStr(dt),
      day: d,
      dayOfWeek: dt.getDay(),
      isCurrentMonth: true,
    });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: toLocalDateStr(d),
        day: d.getDate(),
        dayOfWeek: d.getDay(),
        isCurrentMonth: false,
      });
    }
  }

  return days;
}

export function AttendanceCalendar({
  employees,
  attendance,
  onAddClick,
  onDeleteClick,
}: AttendanceCalendarProps) {
  const activeEmployees = employees.filter((e) => e.status === "재직");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    activeEmployees[0]?.id || ""
  );
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId);
  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance
      .filter((a) => a.employeeId === selectedEmployeeId)
      .forEach((a) => map.set(a.date, a));
    return map;
  }, [attendance, selectedEmployeeId]);

  const restDaySet = useMemo(() => {
    return new Set(selectedEmployee?.restDays || []);
  }, [selectedEmployee]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const todayStr = toLocalDateStr(today);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm flex-1 max-w-xs"
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
        >
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} {emp.position ? `(${emp.position})` : ""}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">
            {year}년 {month + 1}월
          </span>
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground border-b pb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className={d === "일" ? "text-red-400" : d === "토" ? "text-blue-400" : ""}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const record = attendanceMap.get(day.date);
          const dayLabel = WEEKDAY_INDEX_TO_LABEL[day.dayOfWeek];
          const isRestDay = restDaySet.has(dayLabel);
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
          const isToday = day.date === todayStr;
          const isPast = day.date <= todayStr;

          let cellContent: React.ReactNode = null;
          let cellBg = "";

          if (record) {
            const colors = ATTENDANCE_CATEGORY_COLORS[record.category as AttendanceCategory] || "";
            cellContent = (
              <button
                className="w-full group"
                onClick={() => onDeleteClick(record)}
                title="클릭하여 삭제"
              >
                <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${colors} group-hover:opacity-70`}>
                  {record.category}
                </Badge>
              </button>
            );
          } else if (isWeekend) {
            cellContent = <span className="text-[10px] text-muted-foreground/40">휴일</span>;
            cellBg = "bg-accent/30";
          } else if (isRestDay) {
            cellContent = <span className="text-[10px] text-teal-500/60">정휴무</span>;
            cellBg = "bg-teal-50 dark:bg-teal-950/20";
          } else if (isPast && day.isCurrentMonth) {
            cellContent = <span className="text-[10px] text-muted-foreground/40">근무</span>;
          }

          return (
            <div
              key={day.date}
              className={`
                relative min-h-[52px] border-b border-r p-1 text-center transition-colors
                ${!day.isCurrentMonth ? "opacity-30" : ""}
                ${cellBg}
                ${isToday ? "ring-1 ring-inset ring-teal-500" : ""}
                ${day.isCurrentMonth && !record ? "cursor-pointer hover:bg-accent/50" : ""}
              `}
              onClick={() => {
                if (day.isCurrentMonth && !record) {
                  onAddClick(day.date, selectedEmployeeId);
                }
              }}
            >
              <div className={`text-[11px] font-medium ${
                day.dayOfWeek === 0 ? "text-red-400" : day.dayOfWeek === 6 ? "text-blue-400" : ""
              }`}>
                {day.day}
              </div>
              <div className="mt-0.5">{cellContent}</div>
              {day.isCurrentMonth && !record && (
                <Plus className="h-3 w-3 text-muted-foreground/0 hover:text-muted-foreground/50 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-50 dark:bg-teal-950/40 border" /> 정휴무</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent/30 border" /> 주말</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-1 ring-teal-500" /> 오늘</span>
        <span>빈 칸 클릭 = 근태 등록</span>
      </div>
    </div>
  );
}
