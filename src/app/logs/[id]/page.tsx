import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkLog } from "@/lib/notion-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { STATUS_COLORS, PROJECT_COLORS, TAG_COLORS } from "@/lib/constants";
import { Pencil, ArrowLeft, ExternalLink } from "lucide-react";

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
      <div className="flex items-center gap-2">
        <Link href="/logs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            목록
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">{log.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{log.date}</p>
            </div>
            <Link href={`/logs/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-4 w-4" />
                수정
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={PROJECT_COLORS[log.project]}>
              {log.project}
            </Badge>
            <Badge variant="secondary" className={STATUS_COLORS[log.status]}>
              {log.status}
            </Badge>
            {log.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={TAG_COLORS[tag]}
              >
                {tag}
              </Badge>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              업무내용
            </h3>
            <p className="whitespace-pre-wrap text-sm">
              {log.content || "-"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                소요시간
              </h3>
              <p className="text-sm">
                {log.hours !== null ? `${log.hours}시간` : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                관련 링크
              </h3>
              {log.link ? (
                <a
                  href={log.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  링크 열기
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
