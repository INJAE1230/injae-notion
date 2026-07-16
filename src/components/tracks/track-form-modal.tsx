"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { ENTITIES, TRACK_STATUSES } from "@/lib/constants";
import type { TrackFormData, TrackStatus } from "@/lib/types";

export function TrackFormModal({
  form,
  setForm,
  saving,
  onSave,
  onClose,
  isEdit,
}: {
  form: TrackFormData;
  setForm: React.Dispatch<React.SetStateAction<TrackFormData>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">{isEdit ? "트랙 수정" : "새 트랙 만들기"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">트랙명 *</label>
            <Input
              placeholder="예: 일본 법인 설립"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">법인</label>
              <Select value={form.entity || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, entity: v === "__none__" ? null : v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">없음</SelectItem>
                  {ENTITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">상태</label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TrackStatus }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRACK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">시작일</label>
              <Input type="date" value={form.startDate || ""} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || null }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">목표완료일</label>
              <Input type="date" value={form.targetDate || ""} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value || null }))} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">설명</label>
            <Textarea
              placeholder="트랙에 대한 간략한 설명"
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
          <Button className="flex-1" onClick={onSave} disabled={saving}>
            {saving ? "저장 중..." : isEdit ? "수정" : "만들기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
