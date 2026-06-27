import { NextResponse } from "next/server";
import { getAllEmployees, createEmployee } from "@/lib/hr-service";
import { employeeFormSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    const employees = await getAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error("직원 목록 조회 실패:", error);
    return NextResponse.json({ error: "직원 목록 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = validateBody(employeeFormSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const id = await createEmployee(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("직원 등록 실패:", error);
    return NextResponse.json({ error: "직원 등록 실패" }, { status: 500 });
  }
}
