import { NextRequest, NextResponse } from "next/server";
import { updateTemplate, deleteTemplate } from "@/lib/template-service";
import { templatePatchSchema, validateBody } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = validateBody(templatePatchSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await updateTemplate(id, parsed.data);
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
    await deleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "삭제에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
