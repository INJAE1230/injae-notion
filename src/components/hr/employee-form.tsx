"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import { ENTITIES } from "@/lib/constants";
import { POSITIONS, EMPLOYMENT_STATUSES } from "@/lib/hr-types";
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
  const defaultJoinDate = initial?.joinDate || new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<EmployeeFormData>({
    name: initial?.name || "",
    entity: initial?.entity || null,
    department: initial?.department || "",
    position: initial?.position || null,
    joinDate: defaultJoinDate,
    status: initial?.status || "재직",
    annualLeaveTotal: initial?.annualLeaveTotal ?? calcLegalLeave(defaultJoinDate),
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
