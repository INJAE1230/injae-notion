import { NextResponse } from "next/server";
import { getAllPayrolls, createPayroll } from "@/lib/payroll-service";
import { payrollFormSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const records = await getAllPayrolls();
    return NextResponse.json(records);
  } catch (error) {
    console.error("급여 목록 조회 실패:", error);
    return NextResponse.json({ error: "급여 목록 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateBody(payrollFormSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const id = await createPayroll(parsed.data);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("급여 등록 실패:", error);
    return NextResponse.json({ error: "급여 등록 실패" }, { status: 500 });
  }
}
