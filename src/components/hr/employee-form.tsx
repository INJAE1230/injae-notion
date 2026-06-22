"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { PROJECTS } from "@/lib/constants";
import { POSITIONS, EMPLOYMENT_STATUSES } from "@/lib/hr-types";
import type { EmployeeFormData } from "@/lib/hr-types";
import type { Project } from "@/lib/types";

interface EmployeeFormProps {
  initial?: Partial<EmployeeFormData>;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function EmployeeForm({ initial, onSubmit, onCancel, submitLabel = "등록" }: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>({
    name: initial?.name || "",
    projects: initial?.projects || [],
    position: initial?.position || null,
    joinDate: initial?.joinDate || new Date().toISOString().slice(0, 10),
    phone: initial?.phone || "",
    annualLeave: initial?.annualLeave ?? 15,
    status: initial?.status || "재직",
    memo: initial?.memo || "",
  });
  const [loading, setLoading] = useState(false);

  const toggleProject = (p: Project) => {
    setForm((prev) => ({
      ...prev,
      projects: prev.projects.includes(p)
        ? prev.projects.filter((x) => x !== p)
        : [...prev.projects, p],
    }));
  };

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
        <label className="text-xs font-medium">사업장</label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {PROJECTS.filter((p) => p !== "개인일정").map((p) => (
            <Badge
              key={p}
              variant={form.projects.includes(p) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleProject(p)}
            >
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">입사일</label>
          <Input
            type="date"
            value={form.joinDate}
            onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium">연차일수</label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={form.annualLeave}
            onChange={(e) => setForm({ ...form, annualLeave: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">연락처</label>
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="010-0000-0000"
        />
      </div>

      <div>
        <label className="text-xs font-medium">메모</label>
        <Input
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="비고"
        />
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
