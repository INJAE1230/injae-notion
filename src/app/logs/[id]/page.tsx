import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkLog } from "@/lib/notion-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PROJECT_COLORS, TAG_COLORS } from "@/lib/constants";
import { StatusQuickChange } from "@/components/logs/status-quick-change";
import { DeleteLogButton } from "@/components/logs/delete-log-button";
import { PolishContentButton } from "@/components/logs/polish-content-button";
import {
  Pencil,
  ArrowLeft,
  ExternalLink,
  FileText,
  Image,
  Clock,
  Calendar,
  Link2,
  MessageSquare,
  Paperclip,
  Tag,
  Smartphone,
} from "lucide-react";

export const dynamic = "force-dynamic";

const INPUT_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  "웹": { label: "웹", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  "빠른메모": { label: "빠른메모", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  "카카오톡": { label: "카카오톡", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  "슬랙": { label: "슬랙", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

const BACK_LABELS: Record<string, string> = {
  "/board": "칸반 보드",
  "/calendar": "캘린더",
  "/review": "주간 리뷰",
};

export default async function LogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref = from && BACK_LABELS[from] ? from : "/logs";
  const backLabel = BACK_LABELS[from || ""] || "목록";

  let log;
  try {
    log = await getWorkLog(id);
  } catch {
    notFound();
  }

  const sourceInfo = log.inputSource ? INPUT_SOURCE_LABELS[log.inputSource] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            {backLabel}
          </Button>
        </Link>
        <div className="flex items-center gap-1">
          <DeleteLogButton logId={id} title={log.title} />
          <Link href={`/logs/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-3.5 w-3.5" />
              수정
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* 제목 + 날짜 */}
          <div>
            <h1 className="text-lg font-semibold">{log.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{log.date}</span>
              {sourceInfo && (
                <Badge variant="secondary" className={`text-xs ${sourceInfo.color}`}>
                  <Smartphone className="mr-1 h-3 w-3" />
                  {sourceInfo.label}
                </Badge>
              )}
            </div>
          </div>

          {/* 상태 + 우선순위 + 프로젝트 + 태그 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {log.projects.map((proj) => (
              <Badge key={proj} variant="secondary" className={PROJECT_COLORS[proj]}>
                {proj}
              </Badge>
            ))}
            <StatusQuickChange
              logId={id}
              currentStatus={log.status}
              currentPriority={log.priority}
            />
            {log.tags.length > 0 && (
              <>
                <span className="text-muted-foreground mx-0.5">·</span>
                {log.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className={TAG_COLORS[tag]}>
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </>
            )}
          </div>

          <Separator />

          {/* 업무내용 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  업무내용
                </h3>
              </div>
              <PolishContentButton logId={id} hasContent={!!log.content} />
            </div>
            {log.content ? (
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {log.content}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">내용 없음</p>
            )}
          </div>

          {/* 소요시간 + 관련 링크 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  소요시간
                </h3>
              </div>
              <p className="text-sm">
                {log.hours !== null ? `${log.hours}시간` : "-"}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  관련 링크
                </h3>
              </div>
              {log.link ? (
                <a
                  href={log.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  링크 열기
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm">-</p>
              )}
            </div>
          </div>

          {/* 첨부파일 */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                첨부파일
              </h3>
              {log.attachments && log.attachments.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {log.attachments.length}
                </Badge>
              )}
            </div>
            {log.attachments && log.attachments.length > 0 ? (
              <div className="space-y-1">
                {log.attachments.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                  >
                    {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <Image className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="flex-1 truncate">{file.name}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">첨부파일 없음</p>
            )}
          </div>

          {/* 성과 기록 */}
          {(log.outcome || log.rating) && (
            <>
              <Separator />
              <div className="space-y-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 p-4">
                <h3 className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  성과 기록
                </h3>
                {log.outcome && (
                  <p className="whitespace-pre-wrap text-sm">{log.outcome}</p>
                )}
                {log.rating && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    성과등급: {log.rating}
                  </Badge>
                )}
              </div>
            </>
          )}

          {/* 원본 텍스트 (빠른메모로 생성된 경우) */}
          {log.originalText && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  원본 메모
                </h3>
                <div className="rounded-lg border border-dashed p-3">
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
                    {log.originalText}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
