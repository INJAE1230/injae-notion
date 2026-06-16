import { NextRequest, NextResponse } from "next/server";
import { queryWorkLogs, createWorkLog } from "@/lib/notion-service";
import type { WorkLogFilters, WorkLogFormData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const filters: WorkLogFilters = {};

    if (params.get("dateFrom")) filters.dateFrom = params.get("dateFrom")!;
    if (params.get("dateTo")) filters.dateTo = params.get("dateTo")!;
    if (params.get("project")) filters.project = params.get("project") as WorkLogFilters["project"];
    if (params.get("status")) filters.status = params.get("status") as WorkLogFilters["status"];
    if (params.get("tags")) filters.tags = params.get("tags")!.split(",") as WorkLogFilters["tags"];
    if (params.get("search")) filters.search = params.get("search")!;

    const logs = await queryWorkLogs(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    return NextResponse.json(logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: WorkLogFormData = await request.json();
    const id = await createWorkLog(data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "추가에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
