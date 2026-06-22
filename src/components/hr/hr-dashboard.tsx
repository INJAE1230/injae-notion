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
} from "lucide-react";
import { toast } from "sonner";
import { PROJECT_COLORS } from "@/lib/constants";
import {
  EMPLOYMENT_STATUS_COLORS,
  ATTENDANCE_TYPE_COLORS,
  ATTENDANCE_DEDUCT_DAYS,
} from "@/lib/hr-types";
import type { Employee, AttendanceRecord, EmployeeFormData, AttendanceFormData, LeaveBalance } from "@/lib/hr-types";
import { EmployeeForm } from "./employee-form";
import { AttendanceForm } from "./attendance-form";

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
  const [search, setSearch] = useState("");

  const activeEmployees = employees.filter((e) => e.status === "재직");

  const leaveBalances = useMemo<LeaveBalance[]>(() => {
    return employees
      .filter((e) => e.status === "재직")
      .map((emp) => {
        const used = attendance
          .filter((a) => a.employeeName === emp.name)
          .reduce((sum, a) => sum + a.deductDays, 0);
        return {
          employeeName: emp.name,
          totalLeave: emp.annualLeave,
          usedLeave: used,
          remainingLeave: emp.annualLeave - used,
          projects: emp.projects,
          position: emp.position,
        };
      });
  }, [employees, attendance]);

  const summaryCards = [
    { title: "재직 인원", value: activeEmployees.length, icon: UserCheck, color: "text-green-500", suffix: "명" },
    { title: "퇴직/휴직", value: employees.length - activeEmployees.length, icon: UserX, color: "text-gray-400", suffix: "명" },
    { title: "이번 달 근태", value: attendance.filter((a) => a.date.startsWith(new Date().toISOString().slice(0, 7))).length, icon: CalendarDays, color: "text-blue-500", suffix: "건" },
    { title: "평균 잔여 연차", value: leaveBalances.length > 0 ? (leaveBalances.reduce((s, l) => s + l.remainingLeave, 0) / leaveBalances.length).toFixed(1) : "0", icon: Palmtree, color: "text-emerald-500", suffix: "일" },
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
      toast.error("데이터 새로고침 실패");
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
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateAttendance = async (data: AttendanceFormData) => {
    const res = await fetch("/api/hr/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    toast.success(`${data.employeeName} ${data.type} 등록 완료`);
    setShowAttendanceForm(false);
    await refreshData();
  };

  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    setDeletingId(record.id);
    try {
      const res = await fetch(`/api/hr/attendance/${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("근태 기록이 삭제되었습니다");
      await refreshData();
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = employees.filter((e) =>
    !search || e.name.includes(search) || e.projects.some((p) => p.includes(search))
  );

  const filteredAttendance = attendance.filter((a) =>
    !search || a.employeeName.includes(search) || a.type.includes(search)
  );

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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="pl-8 h-9"
          />
        </div>
        {tab === "employees" && (
          <Button size="sm" className="gap-1" onClick={() => setShowEmployeeForm(true)}>
            <Plus className="h-3.5 w-3.5" /> 직원 등록
          </Button>
        )}
        {tab === "attendance" && (
          <Button size="sm" className="gap-1" onClick={() => setShowAttendanceForm(true)}>
            <Plus className="h-3.5 w-3.5" /> 근태 등록
          </Button>
        )}
      </div>

      {/* Tab Content */}
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
                        {emp.position && (
                          <span className="text-xs text-muted-foreground">{emp.position}</span>
                        )}
                        <Badge variant="secondary" className={`text-[10px] ${EMPLOYMENT_STATUS_COLORS[emp.status]}`}>
                          {emp.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {emp.projects.map((p) => (
                          <Badge key={p} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[p]}`}>
                            {p}
                          </Badge>
                        ))}
                        {emp.joinDate && (
                          <span className="text-[11px] text-muted-foreground ml-1">
                            입사 {emp.joinDate}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          · 연차 {emp.annualLeave}일
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setEditingEmployee(emp)}
                      >
                        <Pencil className="h-3 w-3" /> 수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleDeleteEmployee(emp)}
                        disabled={deletingId === emp.id}
                      >
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

      {tab === "attendance" && (
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
                        <span className="text-sm font-medium">{record.employeeName}</span>
                        <Badge variant="secondary" className={`text-[10px] ${ATTENDANCE_TYPE_COLORS[record.type]}`}>
                          {record.type}
                        </Badge>
                        {record.deductDays > 0 && (
                          <span className="text-[11px] text-muted-foreground">-{record.deductDays}일</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                          {record.date} ({["일","월","화","수","목","금","토"][new Date(record.date + "T00:00:00").getDay()]})
                        </span>
                        {record.reason && (
                          <span className="text-[11px] text-muted-foreground">· {record.reason}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => handleDeleteAttendance(record)}
                      disabled={deletingId === record.id}
                    >
                      {deletingId === record.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                    const ratio = lb.totalLeave > 0 ? (lb.usedLeave / lb.totalLeave) * 100 : 0;
                    const isLow = lb.remainingLeave <= 3;
                    return (
                      <div key={lb.employeeName} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{lb.employeeName}</span>
                            {lb.position && (
                              <span className="text-xs text-muted-foreground">{lb.position}</span>
                            )}
                            {lb.projects.map((p) => (
                              <Badge key={p} variant="secondary" className={`text-[10px] ${PROJECT_COLORS[p]}`}>
                                {p}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${isLow ? "text-red-500" : "text-foreground"}`}>
                              {lb.remainingLeave}
                            </span>
                            <span className="text-xs text-muted-foreground"> / {lb.totalLeave}일</span>
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
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Employee Form Dialog */}
      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>직원 등록</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleCreateEmployee}
            onCancel={() => setShowEmployeeForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Employee Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>직원 정보 수정</DialogTitle>
          </DialogHeader>
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

      {/* Attendance Form Dialog */}
      <Dialog open={showAttendanceForm} onOpenChange={setShowAttendanceForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>근태 등록</DialogTitle>
          </DialogHeader>
          <AttendanceForm
            employees={employees}
            onSubmit={handleCreateAttendance}
            onCancel={() => setShowAttendanceForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
