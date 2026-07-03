"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import { ENTITIES } from "@/lib/constants";
import { POSITIONS, EMPLOYMENT_STATUSES, WEEKDAYS } from "@/lib/hr-types";
import type { EmployeeFormData } from "@/lib/hr-types";
import type { Entity } from "@/lib/constants";

function calcLegalLeave(joinDate: string): number {
  if (!joinDate) return 15;
  const join = new Date(joinDate + "T00:00:00");
  const now = new Date();
  const years = (now.getTime() - join.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) return 11;
  if (years < 3) return 15;
  return Math.min(15 + Math.floor((years - 1) / 2), 25);
}

function getLeavGuide(joinDate: string): string {
  if (!joinDate) return "";
  const leave = calcLegalLeave(joinDate);
  const join = new Date(joinDate + "T00:00:00");
  const now = new Date();
  const years = Math.floor((now.getTime() - join.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years < 1) return `법정 기준: 1년 미만 → ${leave}일`;
  return `법정 기준: 근속 ${years}년 → ${leave}일`;
}

interface EmployeeFormProps {
  initial?: Partial<EmployeeFormData>;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function EmployeeForm({ initial, onSubmit, onCancel, submitLabel = "등록" }: EmployeeFormProps) {
  const now = new Date();
  const defaultJoinDate = initial?.joinDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [form, setForm] = useState<EmployeeFormData>({
    name: initial?.name || "",
    entity: initial?.entity || null,
    department: initial?.department || "",
    position: initial?.position || null,
    joinDate: defaultJoinDate,
    status: initial?.status || "재직",
    annualLeaveTotal: initial?.annualLeaveTotal ?? calcLegalLeave(defaultJoinDate),
    unusedRestTotal: initial?.unusedRestTotal ?? 0,
    restDays: initial?.restDays || [],
  });
  const [manualLeave, setManualLeave] = useState(!!initial);
  const [loading, setLoading] = useState(false);

  const handleJoinDateChange = useCallback((date: string) => {
    setForm((prev) => ({
      ...prev,
      joinDate: date,
      ...(!manualLeave ? { annualLeaveTotal: calcLegalLeave(date) } : {}),
    }));
  }, [manualLeave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium">이름 *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="직원 이름"
          required
        />
      </div>

      <div>
        <label className="text-xs font-medium">법인</label>
        <select
          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          value={form.entity || ""}
          onChange={(e) => setForm({ ...form, entity: (e.target.value || null) as Entity | null })}
        >
          <option value="">선택 안함</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">부서</label>
          <Input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="부서명"
          />
        </div>
        <div>
          <label className="text-xs font-medium">직급</label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.position || ""}
            onChange={(e) => setForm({ ...form, position: (e.target.value || null) as EmployeeFormData["position"] })}
          >
            <option value="">선택 안함</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">재직상태</label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeFormData["status"] })}
          >
            {EMPLOYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">입사일</label>
          <Input
            type="date"
            value={form.joinDate}
            onChange={(e) => handleJoinDateChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">연차발생일수</label>
          {!manualLeave && form.joinDate && (
            <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
              <Info className="h-3 w-3" />
              자동 계산됨
            </span>
          )}
        </div>
        <Input
          type="number"
          min={0}
          step={0.5}
          value={form.annualLeaveTotal}
          onChange={(e) => {
            setManualLeave(true);
            setForm({ ...form, annualLeaveTotal: parseFloat(e.target.value) || 0 });
          }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-muted-foreground">
            {getLeavGuide(form.joinDate)}
          </span>
          {manualLeave && form.joinDate && (
            <button
              type="button"
              className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
              onClick={() => {
                setManualLeave(false);
                setForm({ ...form, annualLeaveTotal: calcLegalLeave(form.joinDate) });
              }}
            >
              법정 기준 적용
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">미사용휴무발생</label>
        <Input
          type="number"
          min={0}
          step={1}
          value={form.unusedRestTotal}
          onChange={(e) => setForm({ ...form, unusedRestTotal: parseFloat(e.target.value) || 0 })}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          초과근무 등으로 발생한 별도 휴무 개수. 발생할 때마다 이 숫자를 올려주세요.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">정휴무 요일</label>
          {form.restDays.length > 0 && (
            <span className="text-[11px] text-muted-foreground">주 {form.restDays.length}회</span>
          )}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {WEEKDAYS.map((day) => {
            const selected = form.restDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`w-9 h-9 rounded-md text-xs font-medium transition-colors ${
                  selected
                    ? "bg-teal-500 text-white"
                    : "bg-accent hover:bg-accent/80 text-muted-foreground"
                }`}
                onClick={() => {
                  setForm({
                    ...form,
                    restDays: selected
                      ? form.restDays.filter((d) => d !== day)
                      : [...form.restDays, day],
                  });
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">매주 고정 휴무일을 선택하세요</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={loading || !form.name.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </form>
  );
}
