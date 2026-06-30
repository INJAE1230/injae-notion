import { NextRequest, NextResponse } from "next/server";
import { put, del, list } from "@vercel/blob";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const { blobs } = await list({ prefix: `tracks/${trackId}/` });
    return NextResponse.json({ files: blobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const pathname = `tracks/${trackId}/${Date.now()}-${file.name}`;
    const blob = await put(pathname, file, { access: "public" });

    return NextResponse.json(blob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "업로드에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL이 없습니다" }, { status: 400 });
    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "삭제에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
