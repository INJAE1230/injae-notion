"use client";

import { useState } from "react";
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
import { PROJECTS, STATUSES, TAGS, TAG_COLORS } from "@/lib/constants";
import type { WorkLog, WorkLogFormData, Tag } from "@/lib/types";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export function LogForm({ log }: { log?: WorkLog }) {
  const router = useRouter();
  const isEdit = !!log;

  const [form, setForm] = useState<WorkLogFormData>({
    title: log?.title || "",
    date: log?.date || getToday(),
    project: log?.project || "내부",
    status: log?.status || "예정",
    content: log?.content || "",
    tags: log?.tags || [],
    hours: log?.hours ?? null,
    link: log?.link || null,
  });
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: Tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
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
      router.push("/logs");
      router.refresh();
    } catch {
      toast.error(isEdit ? "수정에 실패했습니다" : "추가에 실패했습니다");
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
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="업무 제목을 입력하세요"
        />
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
          <label className="text-sm font-medium">프로젝트</label>
          <Select
            value={form.project}
            onValueChange={(v) =>
              setForm({ ...form, project: v as WorkLogFormData["project"] })
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

      <div className="space-y-2">
        <label className="text-sm font-medium">태그</label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`cursor-pointer select-none ${
                form.tags.includes(tag) ? TAG_COLORS[tag] : ""
              }`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

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
