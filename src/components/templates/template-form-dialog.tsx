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
import { toastError } from "@/lib/toast-utils";
import {
  PROJECTS,
  STATUSES,
  PROJECT_COLORS,
  FREQUENCIES,
  DAY_OF_WEEK_LABELS,
} from "@/lib/constants";
import type {
  RecurringTemplate,
  RecurringTemplateFormData,
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
      toastError(isEdit ? "수정에 실패했습니다" : "추가에 실패했습니다");
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
                  const defaultDayValues: Record<Frequency, number[]> = {
                    매일: [0], 매주: [1], 격주: [1], 매월: [1],
                    "매월N번째요일": [1, 1], 매분기: [1], 반기: [1], 매년: [1, 1],
                  };
                  setForm({ ...form, frequency: freq, dayValues: defaultDayValues[freq] });
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

            {form.frequency === "매일" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">날짜 설정</label>
                <p className="text-sm text-muted-foreground pt-1">매일 자동으로 생성됩니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {form.frequency === "매주" || form.frequency === "격주"
                    ? "요일 (복수 선택 가능)"
                    : form.frequency === "매년"
                      ? "월 / 일"
                      : form.frequency === "매월N번째요일"
                        ? "N번째 요일"
                        : "날짜"}
                </label>
                {form.frequency === "매분기" && (
                  <p className="text-xs text-muted-foreground">
                    분기 시작월(1·4·7·10월)에 해당 날짜로 생성됩니다
                  </p>
                )}
                {form.frequency === "반기" && (
                  <p className="text-xs text-muted-foreground">
                    반기 시작월(1·7월)에 해당 날짜로 생성됩니다
                  </p>
                )}
                {form.frequency === "격주" && (
                  <p className="text-xs text-muted-foreground">
                    홀수 주차(1·3·5·...)에 자동 생성됩니다
                  </p>
                )}
                {(form.frequency === "매주" || form.frequency === "격주") ? (
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
                ) : form.frequency === "매년" ? (
                  <div className="flex gap-2">
                    <Select
                      value={String(form.dayValues[0] ?? 1)}
                      onValueChange={(v) =>
                        setForm({ ...form, dayValues: [Number(v), form.dayValues[1] ?? 1] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={String(m)}>{m}월</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(form.dayValues[1] ?? 1)}
                      onValueChange={(v) =>
                        setForm({ ...form, dayValues: [form.dayValues[0] ?? 1, Number(v)] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                        ))}
                        <SelectItem value="0">말일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : form.frequency === "매월N번째요일" ? (
                  <div className="flex gap-2">
                    <Select
                      value={String(form.dayValues[0] ?? 1)}
                      onValueChange={(v) =>
                        setForm({ ...form, dayValues: [Number(v), form.dayValues[1] ?? 1] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">첫째 주</SelectItem>
                        <SelectItem value="2">둘째 주</SelectItem>
                        <SelectItem value="3">셋째 주</SelectItem>
                        <SelectItem value="4">넷째 주</SelectItem>
                        <SelectItem value="5">마지막 주</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(form.dayValues[1] ?? 1)}
                      onValueChange={(v) =>
                        setForm({ ...form, dayValues: [form.dayValues[0] ?? 1, Number(v)] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">월요일</SelectItem>
                        <SelectItem value="2">화요일</SelectItem>
                        <SelectItem value="3">수요일</SelectItem>
                        <SelectItem value="4">목요일</SelectItem>
                        <SelectItem value="5">금요일</SelectItem>
                      </SelectContent>
                    </Select>
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
            )}
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
                {{
                  매일: "매일 업무를 자동 생성합니다",
                  매주: "매주 월요일에 해당 주 업무를 자동 생성합니다",
                  격주: "홀수 주차 월요일에 업무를 자동 생성합니다",
                  매월: "매월 1일에 해당 월 업무를 자동 생성합니다",
                  "매월N번째요일": "매월 1일에 해당 N번째 요일 업무를 자동 생성합니다",
                  매분기: "분기 시작월(1·4·7·10월) 1일에 자동 생성합니다",
                  반기: "반기 시작월(1·7월) 1일에 자동 생성합니다",
                  매년: "해당 날짜에 연 1회 자동 생성합니다",
                }[form.frequency]}
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
