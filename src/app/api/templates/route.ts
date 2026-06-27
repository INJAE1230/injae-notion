import { NextRequest, NextResponse } from "next/server";
import { getAllTemplates, createTemplate } from "@/lib/template-service";
import { templateFormSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const templates = await getAllTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    const message = error instanceof Error ? error.message : "조회에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateBody(templateFormSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const id = await createTemplate(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "추가에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
