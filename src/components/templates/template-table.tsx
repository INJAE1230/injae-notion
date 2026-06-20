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
import { MoreHorizontal, Pencil, Trash2, Play } from "lucide-react";
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
  return template.dayValues.map((d) => `${d}일`).join(", ");
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

  const handleGenerateSingle = async (template: RecurringTemplate) => {
    setGeneratingId(template.id);
    try {
      const mode = template.frequency === "매주" ? "이번주" : "이번달";
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
                  {!tmpl.active && (
                    <Badge variant="secondary" className="text-xs">비활성</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tmpl.frequency} {formatDay(tmpl)} · {tmpl.defaultProject}
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
                  <TableCell>{tmpl.defaultProject}</TableCell>
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
                    {tmpl.active ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">활성</Badge>
                    ) : (
                      <Badge variant="secondary">비활성</Badge>
                    )}
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
