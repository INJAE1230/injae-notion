import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, ArrowRight } from "lucide-react";
import { TRACK_STATUS_COLORS } from "@/lib/constants";
import type { Track, WorkLog } from "@/lib/types";

function getDday(targetDate: string, today: string): number {
  const target = new Date(targetDate + "T00:00:00");
  const todayDate = new Date(today + "T00:00:00");
  return Math.ceil((target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function TrackStatusWidget({
  tracks,
  allLogs,
  today,
}: {
  tracks: Track[];
  allLogs: WorkLog[];
  today: string;
}) {
  const activeTracks = tracks.filter((t) => t.status !== "완료");
  if (activeTracks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            트랙 현황
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {activeTracks.length}
            </Badge>
          </CardTitle>
          <Link href="/tracks">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1">
              전체 보기
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {activeTracks.map((track) => {
          const trackLogs = allLogs.filter((l) => l.trackId === track.id);
          const completed = trackLogs.filter((l) => l.status === "완료").length;
          const total = trackLogs.length;
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
          const dday = track.targetDate ? getDday(track.targetDate, today) : null;

          return (
            <div key={track.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">{track.title}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 h-4 ${TRACK_STATUS_COLORS[track.status]}`}
                    >
                      {track.status}
                    </Badge>
                  </div>
                  {track.entity && (
                    <p className="text-xs text-muted-foreground mt-0.5">{track.entity}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
                  {dday !== null && (
                    <span
                      className={`text-xs font-semibold ${
                        dday < 0
                          ? "text-red-500"
                          : dday === 0
                          ? "text-orange-500"
                          : dday <= 7
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {dday === 0 ? "D-Day" : dday < 0 ? `D+${Math.abs(dday)}` : `D-${dday}`}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {total > 0 ? `${completed}/${total}건` : "업무 없음"}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-right">{rate}% 완료</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
