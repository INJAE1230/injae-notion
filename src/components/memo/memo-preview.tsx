"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { STATUS_COLORS, PROJECT_COLORS, TAG_COLORS } from "@/lib/constants";
import { Paperclip } from "lucide-react";
import type { WorkLogFormData } from "@/lib/types";

interface MemoPreviewProps {
  entries: WorkLogFormData[];
  originalText: string;
  onReset: () => void;
  onUpdate: (entries: WorkLogFormData[]) => void;
}

export function MemoPreview({
  entries,
  originalText,
  onReset,
  onUpdate,
}: MemoPreviewProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function removeEntry(index: number) {
    onUpdate(entries.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, field: string, value: string) {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  }

  async function handleSave() {
    if (entries.length === 0) {
      toast.error("저장할 업무가 없습니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/memo/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries, originalText, source: "빠른메모" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.count}건의 업무가 저장되었습니다.`);
      onReset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">파싱된 업무가 없습니다.</p>
          <Button variant="outline" className="mt-4" onClick={onReset}>
            다시 입력
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            AI 파싱 결과 ({entries.length}건)
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              <X className="h-3.5 w-3.5 mr-1" />
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              전체 저장
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          원본: &ldquo;{originalText}&rdquo;
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className="rounded-lg border p-3 space-y-2 hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              {editingIdx === idx ? (
                <Input
                  value={entry.title}
                  onChange={(e) => updateEntry(idx, "title", e.target.value)}
                  onBlur={() => setEditingIdx(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingIdx(null)}
                  autoFocus
                  className="text-sm font-medium"
                />
              ) : (
                <span
                  className="text-sm font-medium cursor-pointer hover:text-indigo-600"
                  onClick={() => setEditingIdx(idx)}
                >
                  {entry.title}
                  <Pencil className="inline h-3 w-3 ml-1 text-muted-foreground" />
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                onClick={() => removeEntry(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="text-muted-foreground">{entry.date}</span>
              <Badge variant="secondary" className={PROJECT_COLORS[entry.project]}>
                {entry.project}
              </Badge>
              <Badge variant="secondary" className={STATUS_COLORS[entry.status]}>
                {entry.status}
              </Badge>
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className={TAG_COLORS[tag]}>
                  {tag}
                </Badge>
              ))}
              {entry.hours && (
                <span className="text-muted-foreground">{entry.hours}시간</span>
              )}
            </div>
            {entry.content && (
              <p className="text-xs text-muted-foreground">{entry.content}</p>
            )}
            {entry.attachments && entry.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>{entry.attachments.length}개 파일 첨부</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
