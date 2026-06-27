import { NextResponse } from "next/server";
import { getAllTracks, createTrack } from "@/lib/track-service";
import { trackFormSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const tracks = await getAllTracks();
    return NextResponse.json(tracks);
  } catch (error) {
    console.error("트랙 목록 조회 실패:", error);
    return NextResponse.json({ error: "트랙 목록 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateBody(trackFormSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const id = await createTrack(parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("트랙 생성 실패:", error);
    return NextResponse.json({ error: "트랙 생성 실패" }, { status: 500 });
  }
}
