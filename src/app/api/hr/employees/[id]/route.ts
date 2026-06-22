import { NextResponse } from "next/server";
import { updateEmployee, deleteEmployee } from "@/lib/hr-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    await updateEmployee(id, data);
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
