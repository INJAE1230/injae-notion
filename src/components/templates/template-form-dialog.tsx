"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  PROJECTS,
  STATUSES,
  TAGS,
  TAG_COLORS,
  FREQUENCIES,
  DAY_OF_WEEK_LABELS,
} from "@/lib/constants";
import type {
  RecurringTemplate,
  RecurringTemplateFormData,
  Tag,
  Frequency,
} from "@/lib/types";

export function TemplateFormDialog({
  template,
  initialData,
  open,
  onClose,
}: {
  template?: RecurringTemplate;
  initialData?: Partial<RecurringTemplateFormData>;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!template;

  const [form, setForm] = useState<RecurringTemplateFormData>({
    name: template?.name || initialData?.name || "",
    frequency: template?.frequency || initialData?.frequency || "매주",
    dayValue: template?.dayValue ?? initialData?.dayValue ?? 1,
    defaultProject: template?.defaultProject || initialData?.defaultProject || "업무",
    defaultStatus: template?.defaultStatus || initialData?.defaultStatus || "예정",
    defaultTags: template?.defaultTags || initialData?.defaultTags || [],
    defaultHours: template?.defaultHours ?? initialData?.defaultHours ?? null,
    content: template?.content || initialData?.content || "",
    active: template?.active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: Tag) => {
    setForm((prev) => ({
      ...prev,
      defaultTags: prev.defaultTags.includes(tag)
        ? prev.defaultTags.filter((t) => t !== tag)
        : [...prev.defaultTags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("템플릿 이름을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/templates/${template.id}` : "/api/templates";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();

      toast.success(isEdit ? "템플릿이 수정되었습니다" : "템플릿이 추가되었습니다");
      onClose();
      router.refresh();
    } catch {
      toast.error(isEdit ? "수정에 실패했습니다" : "추가에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "템플릿 수정" : initialData ? "갤러리에서 추가" : "템플릿 추가"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">템플릿 이름 *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 주간업무보고"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">반복주기</label>
              <Select
                value={form.frequency}
                onValueChange={(v) => {
                  const freq = v as Frequency;
                  setForm({
                    ...form,
                    frequency: freq,
                    dayValue: freq === "매주" ? 1 : 1,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {form.frequency === "매주" ? "요일" : "날짜"}
              </label>
              <Select
                value={String(form.dayValue)}
                onValueChange={(v) =>
                  setForm({ ...form, dayValue: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {form.frequency === "매주"
                    ? Object.entries(DAY_OF_WEEK_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))
                    : Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}일
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">프로젝트</label>
              <Select
                value={form.defaultProject}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    defaultProject: v as RecurringTemplateFormData["defaultProject"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">기본 상태</label>
              <Select
                value={form.defaultStatus}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    defaultStatus: v as RecurringTemplateFormData["defaultStatus"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">태그</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`cursor-pointer select-none ${
                    form.defaultTags.includes(tag) ? TAG_COLORS[tag] : ""
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">기본 소요시간 (시간)</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.defaultHours ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultHours: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="예: 2.5"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">업무내용</label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="기본 업무 내용을 입력하세요"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading
                ? isEdit
                  ? "수정 중..."
                  : "추가 중..."
                : isEdit
                  ? "수정"
                  : "추가"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
