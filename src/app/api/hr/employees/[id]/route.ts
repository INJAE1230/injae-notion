import { NextResponse } from "next/server";
import { updateEmployee, deleteEmployee, recalculateLeave } from "@/lib/hr-service";
import { employeePatchSchema, validateBody } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = validateBody(employeePatchSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await updateEmployee(id, parsed.data);
    if (parsed.data.annualLeaveTotal !== undefined || parsed.data.unusedRestTotal !== undefined) {
      await recalculateLeave(id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("직원 수정 실패:", error);
    return NextResponse.json({ error: "직원 수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteEmployee(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("직원 삭제 실패:", error);
    return NextResponse.json({ error: "직원 삭제 실패" }, { status: 500 });
  }
}
