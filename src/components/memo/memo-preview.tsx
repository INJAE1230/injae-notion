"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Pencil, Trash2, Plus, Combine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-utils";
import { STATUS_COLORS, PROJECT_COLORS, TAG_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import { Paperclip } from "lucide-react";
import { mergeEntries } from "@/lib/entry-merge";
import type { WorkLogFormData } from "@/lib/types";

interface MemoPreviewProps {
  entries: WorkLogFormData[];
  originalText: string;
  isGrouped?: boolean;
  onReset: () => void;
  onUpdate: (entries: WorkLogFormData[]) => void;
}

export function MemoPreview({
  entries,
  originalText,
  isGrouped = false,
  onReset,
  onUpdate,
}: MemoPreviewProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function removeEntry(index: number) {
    onUpdate(entries.filter((_, i) => i !== index));
    setSelected(new Set());
  }

  function updateEntry(index: number, field: string, value: string) {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function mergeSelected() {
    const idxArr = Array.from(selected).sort((a, b) => a - b);
    if (idxArr.length < 2) return;
    const picked = idxArr.map((i) => entries[i]);

    const merged = mergeEntries(picked);

    const result: WorkLogFormData[] = [];
    let inserted = false;
    entries.forEach((e, i) => {
      if (idxArr.includes(i)) {
        if (!inserted) {
          result.push(merged);
          inserted = true;
        }
        return;
      }
      result.push(e);
    });
    onUpdate(result);
    setSelected(new Set());
    toast.success(`${idxArr.length}건을 1건으로 합쳤습니다`);
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
      if (data.appended && data.appended.length > 0) {
        const appendMsg = data.appended.map((a: { title: string }) => `"${a.title}"`).join(", ");
        const newCount = data.count - data.appended.length;
        const parts = [];
        if (data.appended.length > 0) parts.push(`${appendMsg}에 내용 추가`);
        if (newCount > 0) parts.push(`${newCount}건 새로 저장`);
        toast.success(parts.join(", "));
      } else {
        toast.success(`${data.count}건의 업무가 저장되었습니다.`);
      }
      onReset();
      router.refresh();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "저장 실패", handleSave);
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
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              AI 파싱 결과 ({entries.length}건)
            </CardTitle>
            {isGrouped && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 font-medium">
                그룹 파싱
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {selected.size >= 2 && (
              <Button variant="secondary" size="sm" onClick={mergeSelected}>
                <Combine className="h-3.5 w-3.5 mr-1" />
                {selected.size}건 합치기
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onReset}>
              <X className="h-3.5 w-3.5 mr-1" />
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
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
        <p className="text-xs text-muted-foreground mt-1 truncate">
          원본: &ldquo;{originalText.length > 120 ? originalText.slice(0, 120) + "…" : originalText}&rdquo;
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length >= 2 && (
          <p className="text-xs text-muted-foreground -mb-1">
            같은 작업이 여러 건으로 쪼개졌다면 체크 후 합치기를 눌러 1건으로 합칠 수 있어요.
          </p>
        )}
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-3 space-y-2 transition-colors ${
              selected.has(idx) ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:border-indigo-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {entries.length >= 2 && (
                  <Checkbox
                    checked={selected.has(idx)}
                    onCheckedChange={() => toggleSelect(idx)}
                    className="shrink-0"
                  />
                )}
                {entry.appendTo && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 shrink-0 text-[10px]">
                    <Plus className="h-2.5 w-2.5 mr-0.5" />추가
                  </Badge>
                )}
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
              </div>
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
              {entry.projects.map((proj) => (
                <Badge key={proj} variant="secondary" className={PROJECT_COLORS[proj]}>
                  {proj}
                </Badge>
              ))}
              <Badge variant="secondary" className={STATUS_COLORS[entry.status]}>
                {entry.status}
              </Badge>
              {entry.priority && (
                <Badge variant="secondary" className={PRIORITY_COLORS[entry.priority]}>
                  {entry.priority}
                </Badge>
              )}
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
              <div className={`text-xs text-muted-foreground whitespace-pre-line leading-relaxed ${isGrouped ? "max-h-40 overflow-y-auto rounded border border-dashed border-border/60 bg-accent/20 px-2.5 py-2" : ""}`}>
                {entry.content}
              </div>
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
