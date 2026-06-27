import { NextResponse } from "next/server";
import { deletePayroll, updatePayroll } from "@/lib/payroll-service";
import { payrollFormSchema, validateBody } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = validateBody(payrollFormSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await updatePayroll(id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("급여 수정 실패:", error);
    return NextResponse.json({ error: "급여 수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePayroll(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("급여 삭제 실패:", error);
    return NextResponse.json({ error: "급여 삭제 실패" }, { status: 500 });
  }
}
