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
  PROJECT_COLORS,
  FREQUENCIES,
  DAY_OF_WEEK_LABELS,
} from "@/lib/constants";
import type {
  RecurringTemplate,
  RecurringTemplateFormData,
  Tag,
  Frequency,
  Project,
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
    dayValues: template?.dayValues || initialData?.dayValues || [1],
    defaultProjects: template?.defaultProjects || initialData?.defaultProjects || ["청초수"],
    defaultStatus: template?.defaultStatus || initialData?.defaultStatus || "예정",
    defaultTags: template?.defaultTags || initialData?.defaultTags || [],
    defaultHours: template?.defaultHours ?? initialData?.defaultHours ?? null,
    content: template?.content || initialData?.content || "",
    active: template?.active ?? true,
    autoGenerate: template?.autoGenerate ?? false,
  });
  const [loading, setLoading] = useState(false);

  const toggleProject = (proj: Project) => {
    setForm((prev) => ({
      ...prev,
      defaultProjects: prev.defaultProjects.includes(proj)
        ? prev.defaultProjects.filter((p) => p !== proj)
        : [...prev.defaultProjects, proj],
    }));
  };

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
    if (form.dayValues.length === 0) {
      toast.error("요일을 하나 이상 선택해주세요");
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
                    dayValues: [1],
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
                {form.frequency === "매주" ? "요일 (복수 선택 가능)" : "날짜"}
              </label>
              {form.frequency === "매분기" && (
                <p className="text-xs text-muted-foreground">
                  분기 시작월(1·4·7·10월)에 해당 날짜로 생성됩니다
                </p>
              )}
              {form.frequency === "매주" ? (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(DAY_OF_WEEK_LABELS).map(([val, label]) => {
                    const day = Number(val);
                    const isWeekend = day === 0 || day === 6;
                    const selected = form.dayValues.includes(day);
                    return (
                      <Badge
                        key={val}
                        variant={selected ? "default" : "outline"}
                        className={`cursor-pointer select-none px-3 py-1.5 text-xs ${
                          isWeekend
                            ? "opacity-40 line-through"
                            : selected ? "" : "text-muted-foreground"
                        }`}
                        onClick={() => {
                          if (isWeekend) {
                            toast.info("토/일은 휴무일입니다. 주말 출근 시 수동으로 추가하세요.");
                            return;
                          }
                          const next = selected
                            ? form.dayValues.filter((d) => d !== day)
                            : [...form.dayValues, day].sort((a, b) => a - b);
                          if (next.length > 0) setForm({ ...form, dayValues: next });
                        }}
                      >
                        {(label as string).replace("요일", "")}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <Select
                  value={String(form.dayValues[0])}
                  onValueChange={(v) =>
                    setForm({ ...form, dayValues: [Number(v)] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}일
                      </SelectItem>
                    ))}
                    <SelectItem value="0">말일 (매월 마지막 날)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">사업장 (복수 선택 가능)</label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECTS.map((proj) => (
                <Badge
                  key={proj}
                  variant="outline"
                  className={`cursor-pointer select-none ${
                    form.defaultProjects.includes(proj) ? PROJECT_COLORS[proj] : ""
                  }`}
                  onClick={() => toggleProject(proj)}
                >
                  {proj}
                </Badge>
              ))}
            </div>
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">자동 생성</p>
              <p className="text-xs text-muted-foreground">
                {form.frequency === "매주"
                  ? "매주 월요일에 해당 주 업무를 자동 생성합니다"
                  : form.frequency === "매분기"
                    ? "분기 시작월(1·4·7·10월) 1일에 자동 생성합니다"
                    : "매월 1일에 해당 월 업무를 자동 생성합니다"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.autoGenerate}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.autoGenerate ? "bg-primary" : "bg-muted"
              }`}
              onClick={() => setForm({ ...form, autoGenerate: !form.autoGenerate })}
            >
              <span
                className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                  form.autoGenerate ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
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
