"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

const CALENDAR_ID = "976db75da23ef87f6f1140f9efef72076858ee249b047cbd3f71ec546c59c2ae@group.calendar.google.com";

export function GoogleCalendarEmbed() {
  const { theme } = useTheme();
  const bgColor = theme === "dark" ? "121212" : "ffffff";
  const color = "8b5cf6";

  const src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR_ID)}&ctz=Asia/Seoul&bgcolor=%23${bgColor}&color=%23${color}&showTitle=0&showNav=1&showPrint=0&showCalendars=0&showTz=0&mode=MONTH`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Google Calendar — 회사</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-2">
        <div className="relative w-full overflow-hidden rounded-md" style={{ paddingBottom: "75%" }}>
          <iframe
            src={src}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center py-2">
          캘린더가 보이지 않으면 Google Calendar에서 &ldquo;회사&rdquo; 캘린더를 공개로 설정해주세요
        </p>
      </CardContent>
    </Card>
  );
}
