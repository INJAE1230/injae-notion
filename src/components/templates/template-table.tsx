"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, Pencil, Trash2, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DAY_OF_WEEK_LABELS, TAG_COLORS } from "@/lib/constants";
import { TemplateFormDialog } from "./template-form-dialog";
import { DeleteTemplateDialog } from "./delete-template-dialog";
import type { RecurringTemplate } from "@/lib/types";

function formatDay(template: RecurringTemplate): string {
  if (template.frequency === "매주") {
    return template.dayValues
      .map((d) => (DAY_OF_WEEK_LABELS[d] || `${d}`).replace("요일", ""))
      .join(", ");
  }
  return template.dayValues.map((d) => d === 0 ? "말일" : `${d}일`).join(", ");
}

export function TemplateTable({
  templates,
}: {
  templates: RecurringTemplate[];
}) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<RecurringTemplate | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (template: RecurringTemplate) => {
    setTogglingId(template.id);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !template.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(`"${template.name}" ${template.active ? "비활성" : "활성"}화됨`);
      router.refresh();
    } catch {
      toast.error("상태 변경 실패");
    } finally {
      setTogglingId(null);
    }
  };

  const handleGenerateSingle = async (template: RecurringTemplate) => {
    setGeneratingId(template.id);
    try {
      const mode = template.frequency === "매주" ? "이번주" : template.frequency === "매분기" ? "이번분기" : "이번달";
      const res = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, templateIds: [template.id] }),
      });
      if (!res.ok) throw new Error();
      toast.success(`"${template.name}" 업무가 생성되었습니다`);
      router.refresh();
    } catch {
      toast.error("업무 생성에 실패했습니다");
    } finally {
      setGeneratingId(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        등록된 템플릿이 없습니다. 위의 &quot;템플릿 추가&quot; 버튼으로 시작하세요.
      </div>
    );
  }

  return (
    <>
      {/* 모바일 카드 뷰 */}
      <div className="space-y-3 md:hidden">
        {templates.map((tmpl) => (
          <Card key={tmpl.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{tmpl.name}</span>
                  {tmpl.autoGenerate && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">자동</Badge>
                  )}
                  <button
                    onClick={() => handleToggleActive(tmpl)}
                    disabled={togglingId === tmpl.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tmpl.active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    {togglingId === tmpl.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mx-auto text-white" />
                    ) : (
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${tmpl.active ? "translate-x-[18px]" : "translate-x-1"}`} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tmpl.frequency} {formatDay(tmpl)} · {tmpl.defaultProjects.join(", ")}
                  {tmpl.defaultHours ? ` · ${tmpl.defaultHours}시간` : ""}
                </p>
                {tmpl.defaultTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tmpl.defaultTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={`text-xs ${TAG_COLORS[tag] || ""}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleGenerateSingle(tmpl)}
                    disabled={generatingId === tmpl.id}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    업무 생성
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditTarget(tmpl)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(tmpl)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>템플릿명</TableHead>
                <TableHead>반복주기</TableHead>
                <TableHead>프로젝트</TableHead>
                <TableHead>태그</TableHead>
                <TableHead>소요시간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tmpl) => (
                <TableRow key={tmpl.id} className={!tmpl.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{tmpl.name}</TableCell>
                  <TableCell>
                    {tmpl.frequency} {formatDay(tmpl)}
                  </TableCell>
                  <TableCell>{tmpl.defaultProjects.join(", ")}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.defaultTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`text-xs ${TAG_COLORS[tag] || ""}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {tmpl.defaultHours ? `${tmpl.defaultHours}h` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(tmpl)}
                        disabled={togglingId === tmpl.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tmpl.active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      >
                        {togglingId === tmpl.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mx-auto text-white" />
                        ) : (
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${tmpl.active ? "translate-x-[18px]" : "translate-x-1"}`} />
                        )}
                      </button>
                      {tmpl.autoGenerate && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">자동</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleGenerateSingle(tmpl)}
                          disabled={generatingId === tmpl.id}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          업무 생성
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditTarget(tmpl)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(tmpl)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {editTarget && (
        <TemplateFormDialog
          template={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      <DeleteTemplateDialog
        template={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </>
  );
}
