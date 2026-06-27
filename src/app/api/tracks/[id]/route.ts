import { NextResponse } from "next/server";
import { updateTrack, deleteTrack } from "@/lib/track-service";
import { trackPatchSchema, validateBody } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = validateBody(trackPatchSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await updateTrack(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("트랙 수정 실패:", error);
    return NextResponse.json({ error: "트랙 수정 실패" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTrack(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("트랙 삭제 실패:", error);
    return NextResponse.json({ error: "트랙 삭제 실패" }, { status: 500 });
  }
}
