"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  CalendarDays,
  Palmtree,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  UserCheck,
  UserX,
  Search,
  AlertTriangle,
  List,
  Calendar,
  Upload,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  EMPLOYMENT_STATUS_COLORS,
  ATTENDANCE_CATEGORY_COLORS,
} from "@/lib/hr-types";
import { calculateUsedLeave, calculateUsedUnusedRest } from "@/lib/leave-utils";
import type { Employee, AttendanceRecord, EmployeeFormData, AttendanceFormData, LeaveBalance } from "@/lib/hr-types";
import { EmployeeForm } from "./employee-form";
import { AttendanceForm } from "./attendance-form";
import { AttendanceCalendar } from "./attendance-calendar";

type Tab = "employees" | "attendance" | "leave";

interface HrDashboardProps {
  initialEmployees: Employee[];
  initialAttendance: AttendanceRecord[];
}

export function HrDashboard({ initialEmployees, initialAttendance }: HrDashboardProps) {
  const [tab, setTab] = useState<Tab>("employees");
  const [employees, setEmployees] = useState(initialEmployees);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [attendanceDeleteTarget, setAttendanceDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [search, setSearch] = useState("");
  const [attendanceView, setAttendanceView] = useState<"list" | "calendar">("calendar");
  const [calendarFormDate, setCalendarFormDate] = useState<string | null>(null);
  const [calendarFormEmployeeId, setCalendarFormEmployeeId] = useState<string | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importYear, setImportYear] = useState(new Date().getFullYear().toString());
  const [importFile, setImportFile] = useState<File | null>(null);

  const activeEmployees = employees.filter((e) => e.status === "재직");

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const getEmployeeName = (id: string | null) => {
    if (!id) return "—";
    return employeeMap.get(id)?.name || "알 수 없음";
  };

  const leaveBalances = useMemo<LeaveBalance[]>(() => {
    return activeEmployees.map((emp) => {
      const empRecords = attendance.filter((a) => a.employeeId === emp.id);
      const used = calculateUsedLeave(empRecords);
      const usedRest = calculateUsedUnusedRest(empRecords);
      return {
        employee: emp,
        usedLeave: used,
        remainingLeave: emp.annualLeaveTotal - used,
        usedUnusedRest: usedRest,
        remainingUnusedRest: emp.unusedRestTotal - usedRest,
      };
    });
  }, [activeEmployees, attendance]);

  const summaryCards = [
    { title: "재직 인원", value: activeEmployees.length, icon: UserCheck, color: "text-green-500", suffix: "명" },
    { title: "퇴사", value: employees.length - activeEmployees.length, icon: UserX, color: "text-gray-400", suffix: "명" },
    { title: "이번 달 휴무/예외", value: attendance.filter((a) => a.date.startsWith(new Date().toISOString().slice(0, 7)) && a.category !== "정상근무").length, icon: CalendarDays, color: "text-blue-500", suffix: "건" },
    { title: "평균 잔여연차", value: leaveBalances.length > 0 ? (leaveBalances.reduce((s, l) => s + l.remainingLeave, 0) / leaveBalances.length).toFixed(1) : "0", icon: Palmtree, color: "text-emerald-500", suffix: "일" },
  ];

  async function refreshData() {
    try {
      const [empRes, attRes] = await Promise.all([
        fetch("/api/hr/employees"),
        fetch("/api/hr/attendance"),
      ]);
      if (empRes.ok) setEmployees(await empRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
    } catch {
      toastError("데이터 새로고침 실패", refreshData);
    }
  }

  const handleCreateEmployee = async (data: EmployeeFormData) => {
    const res = await fetch("/api/hr/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    toast.success(`${data.name} 직원이 등록되었습니다`);
    setShowEmployeeForm(false);
    await refreshData();
  };

  const handleUpdateEmployee = async (data: EmployeeFormData) => {
    if (!editingEmployee) return;
    const res = await fetch(`/api/hr/employees/${editingEmployee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    toast.success(`${data.name} 직원 정보가 수정되었습니다`);
    setEditingEmployee(null);
    await refreshData();
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    setDeletingId(emp.id);
    try {
      const res = await fetch(`/api/hr/employees/${emp.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`${emp.name} 직원이 삭제되었습니다`);
      await refreshData();
    } catch {
      toastError("삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateAttendance = async (data: AttendanceFormData, employeeName: string) => {
    const res = await fetch("/api/hr/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formData: data, employeeName }),
    });
    if (!res.ok) throw new Error();
    toast.success(`${employeeName} ${data.category} 등록 완료`);
    setShowAttendanceForm(false);
    await refreshData();
  };

  const bulkPreview = useMemo(() => {
    if (!showBulkDialog) return [];
    const [y, m] = bulkMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const existingSet = new Set(
      attendance.map((a) => `${a.employeeId}_${a.date}`)
    );
    const dayIndexToLabel: Record<number, string> = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };
    const records: { employeeId: string; employeeName: string; date: string; category: string }[] = [];

    for (const emp of activeEmployees) {
      if (emp.restDays.length === 0) continue;
      const restSet = new Set(emp.restDays);
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m - 1, d);
        const dow = dt.getDay();
        if (dow === 0 || dow === 6) continue;
        const dayLabel = dayIndexToLabel[dow];
        if (!restSet.has(dayLabel)) continue;
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        if (existingSet.has(`${emp.id}_${dateStr}`)) continue;
        records.push({ employeeId: emp.id, employeeName: emp.name, date: dateStr, category: "정휴무" });
      }
    }
    return records;
  }, [showBulkDialog, bulkMonth, activeEmployees, attendance]);

  const handleBulkCreate = async () => {
    if (bulkPreview.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/hr/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: bulkPreview }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`정휴무 ${data.created}건 일괄 등록 완료`);
      setShowBulkDialog(false);
      await refreshData();
    } catch {
      toastError("일괄 등록에 실패했습니다");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleImportExcel = async (file: File, year: string) => {
    setImportLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("year", year);
      const res = await fetch("/api/hr/attendance/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let msg = `${data.created}건 등록 완료`;
      if (data.skippedDuplicate > 0) msg += ` (중복 ${data.skippedDuplicate}건 스킵)`;
      if (data.unmatchedNames?.length > 0) msg += `\n매칭 실패: ${data.unmatchedNames.join(", ")}`;
      if (data.ambiguousNames?.length > 0) msg += `\n동명이인으로 스킵(직접 등록 필요): ${data.ambiguousNames.join(", ")}`;
      toast.success(msg);
      setShowImportDialog(false);
      setImportFile(null);
      await refreshData();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "엑셀 가져오기 실패");
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance/export?month=${exportMonth}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const [y, m] = exportMonth.split("-");
      a.download = `${y}년 ${parseInt(m)}월 근태현황.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
      toast.success("엑셀 다운로드 완료");
    } catch {
      toastError("엑셀 내보내기 실패");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    setDeletingId(record.id);
    try {
      const res = await fetch(`/api/hr/attendance/${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("근태 기록이 삭제되었습니다");
      await refreshData();
    } catch {
      toastError("삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = employees.filter((e) =>
    !search || e.name.includes(search) || (e.entity && e.entity.includes(search)) || e.department.includes(search)
  );

  const filteredAttendance = attendance.filter((a) => {
    if (!search) return true;
    const empName = getEmployeeName(a.employeeId);
    return empName.includes(search) || a.category.includes(search);
  });

  const tabs = [
    { key: "employees" as Tab, label: "직원 관리", icon: Users },
    { key: "attendance" as Tab, label: "근태 기록", icon: CalendarDays },
    { key: "leave" as Tab, label: "연차 현황", icon: Palmtree },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-teal-500" />
          인사/연차 관리
        </h1>
        <p className="text-sm text-muted-foreground">직원 정보와 근태를 관리하세요</p>
      </div>

      {/* Summary */}
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
                <span className="text-xs text-muted-foreground">{card.suffix}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => { setTab(t.key); setSearch(""); }}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Button>
        ))}
      </div>

      {/* Search + Action */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색..." className="pl-8 h-9" />
        </div>
        {tab === "employees" && (
          <Button size="sm" className="gap-1" onClick={() => setShowEmployeeForm(true)}>
            <Plus className="h-3.5 w-3.5" /> 직원 등록
          </Button>
        )}
        {tab === "attendance" && (
          <>
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={attendanceView === "calendar" ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-none gap-1"
                onClick={() => setAttendanceView("calendar")}
              >
                <Calendar className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={attendanceView === "list" ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-none gap-1"
                onClick={() => setAttendanceView("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowBulkDialog(true)}>
              <CalendarDays className="h-3.5 w-3.5" /> 월간 정휴무
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-3.5 w-3.5" /> 가져오기
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowExportDialog(true)}>
              <Download className="h-3.5 w-3.5" /> 내보내기
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setShowAttendanceForm(true)}>
              <Plus className="h-3.5 w-3.5" /> 근태 등록
            </Button>
          </>
        )}
      </div>

      {/* === Employees Tab === */}
      {tab === "employees" && (
        <Card>
          <CardContent className="p-0">
            {filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">등록된 직원이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{emp.name}</span>
                        {emp.position && <span className="text-xs text-muted-foreground">{emp.position}</span>}
                        <Badge variant="secondary" className={`text-[10px] ${EMPLOYMENT_STATUS_COLORS[emp.status]}`}>
                          {emp.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        {emp.entity && <span>{emp.entity}</span>}
                        {emp.department && <span>· {emp.department}</span>}
                        {emp.joinDate && <span>· 입사 {emp.joinDate}</span>}
                        <span>· 연차 {emp.remainingLeave}/{emp.annualLeaveTotal}일</span>
                        {emp.restDays.length > 0 && <span>· 휴무 {emp.restDays.join("·")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingEmployee(emp)}>
                        <Pencil className="h-3 w-3" /> 수정
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDeleteEmployee(emp)} disabled={deletingId === emp.id}>
                        {deletingId === emp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Attendance Tab === */}
      {tab === "attendance" && attendanceView === "calendar" && (
        <Card>
          <CardContent className="p-4">
            <AttendanceCalendar
              employees={employees}
              attendance={attendance}
              onAddClick={(date, employeeId) => {
                setCalendarFormDate(date);
                setCalendarFormEmployeeId(employeeId);
              }}
              onDeleteClick={(record) => setAttendanceDeleteTarget(record)}
            />
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && attendanceView === "list" && (
        <Card>
          <CardContent className="p-0">
            {filteredAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">근태 기록이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAttendance.map((record) => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{getEmployeeName(record.employeeId)}</span>
                        <Badge variant="secondary" className={`text-[10px] ${ATTENDANCE_CATEGORY_COLORS[record.category]}`}>
                          {record.category}
                        </Badge>
                        {record.category === "조퇴" && record.deductionMethod && (
                          <Badge variant="outline" className="text-[10px]">
                            {record.deductionMethod}차감
                          </Badge>
                        )}
                        {record.category === "조퇴" && (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 dark:text-amber-400">
                            급여차감대상
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                        <span>
                          {record.date} ({["일","월","화","수","목","금","토"][new Date(record.date + "T00:00:00").getDay()]})
                        </span>
                        {record.note && <span>· {record.note.replace(/^\[(연차|정휴무)차감\]\s*/, "")}</span>}
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" className="h-7 text-xs shrink-0" onClick={() => setAttendanceDeleteTarget(record)} disabled={deletingId === record.id}>
                      {deletingId === record.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Leave Tab === */}
      {tab === "leave" && (
        <div className="space-y-4">
          {leaveBalances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Palmtree className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">재직 중인 직원이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">연차 잔여 현황</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {leaveBalances.map((lb) => {
                    const ratio = lb.employee.annualLeaveTotal > 0 ? (lb.usedLeave / lb.employee.annualLeaveTotal) * 100 : 0;
                    const isLow = lb.remainingLeave <= 3;
                    return (
                      <div key={lb.employee.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{lb.employee.name}</span>
                            {lb.employee.position && <span className="text-xs text-muted-foreground">{lb.employee.position}</span>}
                            {lb.employee.entity && (
                              <span className="text-xs text-muted-foreground">· {lb.employee.entity}</span>
                            )}
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${isLow ? "text-red-500" : "text-foreground"}`}>
                              {lb.remainingLeave}
                            </span>
                            <span className="text-xs text-muted-foreground"> / {lb.employee.annualLeaveTotal}일</span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-accent overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isLow ? "bg-red-500" : "bg-teal-500"}`}
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[11px] text-muted-foreground">사용 {lb.usedLeave}일</span>
                          <span className="text-[11px] text-muted-foreground">잔여 {lb.remainingLeave}일</span>
                        </div>
                        {lb.employee.unusedRestTotal > 0 && (
                          <div className="flex justify-between mt-2 pt-2 border-t text-[11px]">
                            <span className="text-muted-foreground">미사용휴무 사용 {lb.usedUnusedRest}개</span>
                            <span className="font-medium">잔여 {lb.remainingUnusedRest}개 / {lb.employee.unusedRestTotal}개</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>직원 등록</DialogTitle></DialogHeader>
          <EmployeeForm onSubmit={handleCreateEmployee} onCancel={() => setShowEmployeeForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>직원 정보 수정</DialogTitle></DialogHeader>
          {editingEmployee && (
            <EmployeeForm
              initial={editingEmployee}
              onSubmit={handleUpdateEmployee}
              onCancel={() => setEditingEmployee(null)}
              submitLabel="저장"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAttendanceForm} onOpenChange={setShowAttendanceForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>근태 등록</DialogTitle></DialogHeader>
          <AttendanceForm employees={employees} onSubmit={handleCreateAttendance} onCancel={() => setShowAttendanceForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!calendarFormDate} onOpenChange={(open) => { if (!open) { setCalendarFormDate(null); setCalendarFormEmployeeId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>근태 등록 — {calendarFormDate}</DialogTitle></DialogHeader>
          {calendarFormDate && calendarFormEmployeeId && (
            <AttendanceForm
              employees={employees}
              initialEmployeeId={calendarFormEmployeeId}
              initialDate={calendarFormDate}
              onSubmit={async (data, empName) => {
                await handleCreateAttendance(data, empName);
                setCalendarFormDate(null);
                setCalendarFormEmployeeId(null);
              }}
              onCancel={() => { setCalendarFormDate(null); setCalendarFormEmployeeId(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>월간 정휴무 일괄 등록</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">대상 월</label>
              <Input
                type="month"
                value={bulkMonth}
                onChange={(e) => setBulkMonth(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="text-sm">
              {bulkPreview.length === 0 ? (
                <p className="text-muted-foreground">
                  {activeEmployees.some((e) => e.restDays.length > 0)
                    ? "이미 모든 정휴무가 등록되어 있거나 해당 월에 등록할 내용이 없습니다."
                    : "정휴무 요일이 설정된 직원이 없습니다. 직원 정보에서 정휴무 요일을 먼저 설정해주세요."}
                </p>
              ) : (
                <>
                  <p className="font-medium mb-2">
                    {bulkPreview.length}건 생성 예정
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-xs text-muted-foreground">
                    {[...new Set(bulkPreview.map((r) => r.employeeName))].map((name) => {
                      const count = bulkPreview.filter((r) => r.employeeName === name).length;
                      return (
                        <div key={name} className="flex justify-between">
                          <span>{name}</span>
                          <span>{count}건</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(false)}>
                취소
              </Button>
              <Button
                size="sm"
                disabled={bulkPreview.length === 0 || bulkLoading}
                onClick={handleBulkCreate}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${bulkPreview.length}건 등록`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>근태 현황 엑셀 내보내기</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">대상 월</label>
              <Input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} className="h-9" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(false)}>취소</Button>
              <Button size="sm" className="gap-1" onClick={handleExportExcel} disabled={exportLoading}>
                {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-3.5 w-3.5" /> 다운로드</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={(o) => { setShowImportDialog(o); if (!o) setImportFile(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>근태 현황 엑셀 가져오기</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">데이터 연도</label>
              <Input
                type="number"
                value={importYear}
                onChange={(e) => setImportYear(e.target.value)}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                파일 안 날짜(예: 6/1)에 이 연도를 붙여서 등록합니다. 작년 이전 자료를 올릴 땐 꼭 확인하세요.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">파일</label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="h-9 pt-1.5"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(false)}>취소</Button>
              <Button
                size="sm"
                className="gap-1"
                disabled={!importFile || !importYear || importLoading}
                onClick={() => importFile && handleImportExcel(importFile, importYear)}
              >
                {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5" /> 가져오기</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!attendanceDeleteTarget}
        onOpenChange={(o) => { if (!o) setAttendanceDeleteTarget(null); }}
        title="근태 기록을 삭제할까요?"
        description={
          attendanceDeleteTarget
            ? `${getEmployeeName(attendanceDeleteTarget.employeeId)} · ${attendanceDeleteTarget.date} · ${attendanceDeleteTarget.category} 기록이 삭제됩니다.`
            : undefined
        }
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          if (attendanceDeleteTarget) handleDeleteAttendance(attendanceDeleteTarget);
          setAttendanceDeleteTarget(null);
        }}
      />
    </div>
  );
}
