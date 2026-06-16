import { NextResponse } from "next/server";
import { queryWorkLogs } from "@/lib/notion-service";
import { generateReport } from "@/lib/report-generator";
import type { ReportType } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { type, dateFrom, dateTo } = (await request.json()) as {
      type: ReportType;
      dateFrom: string;
      dateTo: string;
    };

    if (!type || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "type, dateFrom, dateTo가 필요합니다." },
        { status: 400 }
      );
    }

    const logs = await queryWorkLogs({ dateFrom, dateTo });
    const report = generateReport(type, logs, dateFrom, dateTo);

    return NextResponse.json({
      ...report,
      period: { from: dateFrom, to: dateTo },
      stats: {
        totalLogs: logs.length,
        totalHours: logs.reduce((s, l) => s + (l.hours || 0), 0),
        completionRate:
          logs.length > 0
            ? Math.round(
                (logs.filter((l) => l.status === "완료").length / logs.length) * 100
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("보고서 생성 실패:", error);
    return NextResponse.json(
      { error: "보고서 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
