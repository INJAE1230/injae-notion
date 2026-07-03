"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { ATTENDANCE_CATEGORIES } from "@/lib/hr-types";
import { parseDeductionMethod, stripDeductionPrefix } from "@/lib/leave-utils";
import type { AttendanceFormData, AttendanceCategory, DeductionMethod, Employee } from "@/lib/hr-types";

interface AttendanceFormProps {
  employees: Employee[];
  onSubmit: (data: AttendanceFormData, employeeName: string) => Promise<void>;
  onCancel: () => void;
  initial?: Partial<AttendanceFormData>;
  submitLabel?: string;
  onDelete?: () => Promise<void>;
  deleting?: boolean;
}

function today(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function AttendanceForm({ employees, onSubmit, onCancel, initial, submitLabel = "등록", onDelete, deleting }: AttendanceFormProps) {
  const activeEmployees = employees.filter((e) => e.status === "재직");
  const initialCategory = initial?.category || "연차";
  const initialNote = initial?.note || "";

  const [form, setForm] = useState<AttendanceFormData>({
    employeeId: initial?.employeeId || activeEmployees[0]?.id || "",
    date: initial?.date || today(),
    category: initialCategory,
    note: initialCategory === "조퇴" ? stripDeductionPrefix(initialNote) : initialNote,
    deductionMethod: initial?.deductionMethod ?? (initialCategory === "조퇴" ? parseDeductionMethod(initialNote) || "연차" : undefined),
  });
  const [loading, setLoading] = useState(false);

  const selectedEmployee = activeEmployees.find((e) => e.id === form.employeeId);

  const handleCategoryChange = (category: AttendanceCategory) => {
    setForm((prev) => ({
      ...prev,
      category,
      deductionMethod: category === "조퇴" ? (prev.deductionMethod || "연차") : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return;
    const empName = selectedEmployee?.name || "";
    setLoading(true);
    try {
      await onSubmit(form, empName);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium">직원 *</label>
        <select
          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          required
        >
          <option value="">선택</option>
          {activeEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} {e.position ? `(${e.position})` : ""} — {e.entity || "미배정"}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">날짜 *</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium">구분 *</label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.category}
            onChange={(e) => handleCategoryChange(e.target.value as AttendanceCategory)}
          >
            {ATTENDANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {form.category === "조퇴" && (
        <div>
          <label className="text-xs font-medium">차감방식 *</label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.deductionMethod || "연차"}
            onChange={(e) => setForm({ ...form, deductionMethod: e.target.value as DeductionMethod })}
          >
            <option value="연차">연차 차감 (8시간 단위)</option>
            <option value="정휴무">정휴무 차감 (11시간 단위)</option>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            {form.deductionMethod === "정휴무"
              ? "정휴무에서 차감 — 연차는 차감되지 않음"
              : "연차에서 0.5일 차감 (반차 전환) + 급여차감대상"}
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium">비고</label>
        <Textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="비고 입력"
          className="min-h-[70px] resize-none"
        />
      </div>

      {selectedEmployee && (
        <div className="text-xs text-muted-foreground bg-accent/50 rounded-md px-3 py-2">
          잔여연차: <span className="font-semibold">{selectedEmployee.remainingLeave}일</span> / {selectedEmployee.annualLeaveTotal}일
          {selectedEmployee.unusedRestTotal > 0 && (
            <>
              {" · "}미사용휴무: <span className="font-semibold">{selectedEmployee.remainingUnusedRest}개</span> / {selectedEmployee.unusedRestTotal}개
            </>
          )}
        </div>
      )}

      <div className="flex justify-between gap-2 pt-2">
        {onDelete ? (
          <Button type="button" variant="destructive" size="sm" className="gap-1" onClick={onDelete} disabled={deleting || loading}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-3.5 w-3.5" /> 삭제</>}
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" size="sm" disabled={loading || deleting || !form.employeeId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
