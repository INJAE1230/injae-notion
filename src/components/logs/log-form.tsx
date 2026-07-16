"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ChevronDown } from "lucide-react";
import { PROJECTS, STATUSES, PRIORITIES, PRIORITY_COLORS, PROJECT_COLORS, ACHIEVEMENT_RATINGS } from "@/lib/constants";
import { FileUpload } from "@/components/file-upload";
import { getKSTToday } from "@/lib/date-utils";
import type { OcrResult } from "@/components/file-upload";
import type { WorkLog, WorkLogFormData, Priority, AchievementRating, Project, Track } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LogForm({ log, initialDate, initialTrackId, onSuccess }: { log?: WorkLog; initialDate?: string; initialTrackId?: string; onSuccess?: () => void }) {
  const router = useRouter();
  const isEdit = !!log;

  const [form, setForm] = useState<WorkLogFormData>({
    title: log?.title || "",
    date: log?.date || initialDate || getKSTToday(),
    projects: log?.projects || ["청초수"],
    status: log?.status || "예정",
    priority: log?.priority || null,
    content: log?.content || "",
    tags: log?.tags || [],
    hours: log?.hours ?? null,
    link: log?.link || null,
    outcome: log?.outcome || null,
    rating: log?.rating || null,
    attachments: log?.attachments || [],
    trackId: log?.trackId || initialTrackId || null,
  });
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(
    isEdit && !!(form.hours || form.link || form.outcome || form.rating || form.trackId || (form.attachments && form.attachments.length > 0))
  );

  useEffect(() => {
    fetch("/api/tracks").then((r) => r.json()).then(setTracks).catch(() => {});
  }, []);

  function handleOcrResult(result: OcrResult) {
    const updates: Partial<WorkLogFormData> = {};
    if (result.summary && !form.title) {
      updates.title = result.summary;
    }
    if (result.date && !form.date) {
      updates.date = result.date;
    }
    const details = [
      result.documentType !== "기타" ? `[${result.documentType}]` : "",
      result.storeName ? `상호: ${result.storeName}` : "",
      result.totalAmount ? `금액: ${result.totalAmount.toLocaleString()}원` : "",
      ...result.items.map(
        (item) =>
          `- ${item.name}${item.quantity ? ` x${item.quantity}` : ""}${item.amount ? ` ${item.amount.toLocaleString()}원` : ""}`
      ),
    ]
      .filter(Boolean)
      .join("\n");
    if (details) {
      updates.content = form.content ? `${form.content}\n\n${details}` : details;
    }
    setForm((prev) => ({ ...prev, ...updates }));
  }

  const toggleProject = (proj: Project) => {
    setForm((prev) => ({
      ...prev,
      projects: prev.projects.includes(proj)
        ? prev.projects.filter((p) => p !== proj)
        : [...prev.projects, proj],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("업무 제목을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/logs/${log.id}` : "/api/logs";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success(isEdit ? "업무가 수정되었습니다" : "업무가 추가되었습니다");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/logs");
        router.refresh();
      }
    } catch {
      toastError(
        isEdit ? "수정에 실패했습니다" : "추가에 실패했습니다",
        () => handleSubmit(e)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">업무 제목 *</label>
        <Input
          value={form.title}
          onChange={(e) => { setForm({ ...form, title: e.target.value }); setTouched(true); }}
          onBlur={() => setTouched(true)}
          placeholder="업무 제목을 입력하세요"
          className={touched && !form.title.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {touched && !form.title.trim() && (
          <p className="text-xs text-red-500">업무 제목은 필수입니다</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">사업장 (복수 선택 가능)</label>
        <div className="flex flex-wrap gap-2">
          {PROJECTS.map((proj) => (
            <Badge
              key={proj}
              variant="outline"
              className={`cursor-pointer select-none ${
                form.projects.includes(proj) ? PROJECT_COLORS[proj] : ""
              }`}
              onClick={() => toggleProject(proj)}
            >
              {proj}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">날짜</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">진행상태</label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm({ ...form, status: v as WorkLogFormData["status"] })
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
          <label className="text-sm font-medium">우선순위</label>
          <Select
            value={form.priority || "none"}
            onValueChange={(v) =>
              setForm({ ...form, priority: v === "none" ? null : (v as Priority) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="미설정" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">미설정</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">업무내용</label>
        <Textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="업무 내용을 입력하세요"
          rows={4}
        />
      </div>

      {/* 상세 옵션 토글 */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", !showAdvanced && "-rotate-90")} />
        상세 옵션
        {!showAdvanced && (form.hours || form.link || form.trackId || (form.attachments && form.attachments.length > 0)) && (
          <span className="text-xs text-blue-500">• 입력된 항목 있음</span>
        )}
      </button>

      {showAdvanced && (
        <div className="space-y-5 rounded-lg border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">소요시간 (시간)</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form.hours ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hours: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="예: 2.5"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">관련 링크</label>
              <Input
                type="url"
                value={form.link || ""}
                onChange={(e) =>
                  setForm({ ...form, link: e.target.value || null })
                }
                placeholder="https://..."
              />
            </div>
          </div>

          {tracks.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">트랙 연결</label>
              <Select
                value={form.trackId || "none"}
                onValueChange={(v) => setForm({ ...form, trackId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="트랙 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                      {t.entity ? ` (${t.entity})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <FileUpload
            attachments={form.attachments || []}
            onChange={(attachments) => setForm({ ...form, attachments })}
            onOcrResult={handleOcrResult}
          />

          {form.status === "완료" && (
            <div className="space-y-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                성과 기록 (완료된 업무)
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">성과/결과</label>
                <Textarea
                  value={form.outcome || ""}
                  onChange={(e) =>
                    setForm({ ...form, outcome: e.target.value || null })
                  }
                  placeholder="이 업무의 결과물이나 성과를 기록하세요"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">성과등급</label>
                <Select
                  value={form.rating || ""}
                  onValueChange={(v) =>
                    setForm({ ...form, rating: (v || null) as AchievementRating | null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACHIEVEMENT_RATINGS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

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
          onClick={() => router.back()}
          disabled={loading}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
