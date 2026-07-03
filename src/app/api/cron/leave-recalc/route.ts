import { NextRequest, NextResponse } from "next/server";
import { recalcJuniorEmployeeLeave } from "@/lib/hr-service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updated = await recalcJuniorEmployeeLeave();
    return NextResponse.json({ updated: updated.length, details: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "연차 자동 재계산 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
