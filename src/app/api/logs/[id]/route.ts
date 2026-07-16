import { NextRequest, NextResponse } from "next/server";
import {
  getWorkLog,
  updateWorkLog,
  deleteWorkLog,
} from "@/lib/notion-service";
import { deleteAttachmentBlobs } from "@/lib/blob-cleanup";
import { workLogPatchSchema, validateBody } from "@/lib/validations";

async function getAttachmentUrls(id: string): Promise<string[]> {
  try {
    const log = await getWorkLog(id);
    return (log?.attachments ?? []).map((a) => a.url).filter(Boolean);
  } catch (error) {
    console.error(`첨부 조회 실패 (log=${id}):`, error);
    return [];
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const log = await getWorkLog(id);
    return NextResponse.json(log);
  } catch (error) {
    const message = error instanceof Error ? error.message : "조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = validateBody(workLogPatchSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await updateWorkLog(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "수정에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 레코드가 사라지면 첨부 URL을 다시 알아낼 수 없으므로 먼저 읽어둔다.
    // 단 실제 blob 삭제는 Notion 삭제가 성공한 뒤에만 (Blob은 복구 불가).
    const attachmentUrls = await getAttachmentUrls(id);
    await deleteWorkLog(id);
    await deleteAttachmentBlobs(attachmentUrls);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "삭제에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
