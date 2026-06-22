import { NextResponse } from "next/server";
import { deleteAttendance } from "@/lib/hr-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteAttendance(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("근태 삭제 실패:", error);
    return NextResponse.json({ error: "근태 삭제 실패" }, { status: 500 });
  }
}
