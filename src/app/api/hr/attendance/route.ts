import { NextResponse } from "next/server";
import { getAllAttendance, createAttendance } from "@/lib/hr-service";

export async function GET() {
  try {
    const records = await getAllAttendance();
    return NextResponse.json(records);
  } catch (error) {
    console.error("근태 기록 조회 실패:", error);
    return NextResponse.json({ error: "근태 기록 조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const id = await createAttendance(data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("근태 기록 실패:", error);
    return NextResponse.json({ error: "근태 기록 실패" }, { status: 500 });
  }
}
