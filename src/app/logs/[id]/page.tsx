import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkLog } from "@/lib/notion-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PROJECT_COLORS, TAG_COLORS } from "@/lib/constants";
import { StatusQuickChange } from "@/components/logs/status-quick-change";
import { Pencil, ArrowLeft, ExternalLink, FileText, Image } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let log;
  try {
    log = await getWorkLog(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/logs">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            목록
          </Button>
        </Link>
        <Link href={`/logs/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-3.5 w-3.5" />
            수정
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div>
            <h1 className="text-lg font-semibold">{log.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{log.date}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={PROJECT_COLORS[log.project]}>
              {log.project}
            </Badge>
            <StatusQuickChange
              logId={id}
              currentStatus={log.status}
              currentPriority={log.priority}
            />
            {log.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className={TAG_COLORS[tag]}>
                {tag}
              </Badge>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              업무내용
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {log.content || "-"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                소요시간
              </h3>
              <p className="text-sm">
                {log.hours !== null ? `${log.hours}시간` : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                관련 링크
              </h3>
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

          {log.attachments && log.attachments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  첨부파일 ({log.attachments.length})
                </h3>
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
              </div>
            </>
          )}

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
        </CardContent>
      </Card>
    </div>
  );
}
