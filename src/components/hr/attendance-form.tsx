"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { ATTENDANCE_TYPES, ATTENDANCE_DEDUCT_DAYS } from "@/lib/hr-types";
import type { AttendanceFormData, AttendanceType } from "@/lib/hr-types";
import type { Employee } from "@/lib/hr-types";

interface AttendanceFormProps {
  employees: Employee[];
  onSubmit: (data: AttendanceFormData) => Promise<void>;
  onCancel: () => void;
}

export function AttendanceForm({ employees, onSubmit, onCancel }: AttendanceFormProps) {
  const activeEmployees = employees.filter((e) => e.status === "재직");

  const [form, setForm] = useState<AttendanceFormData>({
    employeeName: activeEmployees[0]?.name || "",
    date: new Date().toISOString().slice(0, 10),
    type: "연차",
    reason: "",
    deductDays: ATTENDANCE_DEDUCT_DAYS["연차"],
    projects: activeEmployees[0]?.projects || [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emp = activeEmployees.find((e) => e.name === form.employeeName);
    if (emp) {
      setForm((prev) => ({ ...prev, projects: emp.projects }));
    }
  }, [form.employeeName]);

  const handleTypeChange = (type: AttendanceType) => {
    setForm((prev) => ({
      ...prev,
      type,
      deductDays: ATTENDANCE_DEDUCT_DAYS[type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeName) return;
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
        <label className="text-xs font-medium">직원 *</label>
        <select
          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          value={form.employeeName}
          onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
          required
        >
          <option value="">선택</option>
          {activeEmployees.map((e) => (
            <option key={e.id} value={e.name}>
              {e.name} {e.position ? `(${e.position})` : ""} — {e.projects.join(", ") || "미배정"}
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
          <label className="text-xs font-medium">근태유형 *</label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value as AttendanceType)}
          >
            {ATTENDANCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">차감일수</label>
        <Input
          type="number"
          min={0}
          step={0.5}
          value={form.deductDays}
          onChange={(e) => setForm({ ...form, deductDays: parseFloat(e.target.value) || 0 })}
        />
      </div>

      <div>
        <label className="text-xs font-medium">사유</label>
        <Input
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder="사유 입력"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={loading || !form.employeeName}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "등록"}
        </Button>
      </div>
    </form>
  );
}
