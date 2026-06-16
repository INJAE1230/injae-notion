import Link from "next/link";
import { getAllWorkLogs } from "@/lib/notion-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_COLORS, TAG_COLORS } from "@/lib/constants";
import { Trophy, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const RATING_COLORS = {
  "상": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "중": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "하": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export default async function AchievementsPage() {
  const allLogs = await getAllWorkLogs();
  const achievements = allLogs.filter(
    (log) => log.status === "완료" && (log.outcome || log.rating)
  );
  const completedCount = allLogs.filter((l) => l.status === "완료").length;
  const totalHours = achievements.reduce((sum, l) => sum + (l.hours || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          성과 관리
        </h1>
        <p className="text-sm text-muted-foreground">
          완료된 업무 {completedCount}건 중 성과 기록 {achievements.length}건
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{achievements.length}</p>
            <p className="text-xs text-muted-foreground">성과 기록</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {achievements.filter((a) => a.rating === "상").length}
            </p>
            <p className="text-xs text-muted-foreground">상급 성과</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(totalHours * 10) / 10}h
            </p>
            <p className="text-xs text-muted-foreground">총 투입 시간</p>
          </CardContent>
        </Card>
      </div>

      {achievements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              아직 성과 기록이 없습니다.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              업무를 완료하고 성과를 기록해보세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {achievements.map((log) => (
            <Card key={log.id} className="hover:border-amber-300 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/logs/${log.id}`}
                        className="font-medium hover:text-amber-600 transition-colors"
                      >
                        {log.title}
                      </Link>
                      {log.rating && (
                        <Badge variant="secondary" className={RATING_COLORS[log.rating]}>
                          {log.rating}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="text-muted-foreground">{log.date}</span>
                      <Badge variant="secondary" className={`text-xs ${PROJECT_COLORS[log.project]}`}>
                        {log.project}
                      </Badge>
                      {log.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className={`text-xs ${TAG_COLORS[tag]}`}>
                          {tag}
                        </Badge>
                      ))}
                      {log.hours && (
                        <span className="text-muted-foreground">{log.hours}시간</span>
                      )}
                    </div>
                    {log.outcome && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {log.outcome}
                      </p>
                    )}
                  </div>
                  <Link href={`/logs/${log.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
