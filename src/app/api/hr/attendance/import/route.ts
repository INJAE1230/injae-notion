import { NextResponse } from "next/server";
import { getAllEmployees, getAllAttendance, createAttendanceBulk } from "@/lib/hr-service";
import { parseAttendanceExcel } from "@/lib/excel-attendance";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const yearRaw = formData.get("year");
    const year = yearRaw ? parseInt(yearRaw as string, 10) : undefined;

    const buffer = await file.arrayBuffer();
    const parsed = await parseAttendanceExcel(buffer, year);

    if (parsed.length === 0) {
      return NextResponse.json({ error: "파싱 가능한 근태 데이터가 없습니다" }, { status: 400 });
    }

    const employees = await getAllEmployees();
    const existing = await getAllAttendance();
    const existingSet = new Set(existing.map((a) => `${a.employeeId}_${a.date}`));

    // 이름이 같은 직원이 여러 명이면 자동 매칭하지 않고 별도 보고 (동명이인 오배정 방지)
    const empsByName = new Map<string, typeof employees>();
    for (const e of employees) {
      const key = e.name.replace(/\s+/g, "");
      const list = empsByName.get(key) || [];
      list.push(e);
      empsByName.set(key, list);
    }

    const records: { employeeId: string; employeeName: string; date: string; category: string }[] = [];
    const unmatchedNames: string[] = [];
    const ambiguousNames: string[] = [];

    for (const row of parsed) {
      const candidates = empsByName.get(row.name);
      if (!candidates || candidates.length === 0) {
        if (!unmatchedNames.includes(row.name) && row.name.length >= 2) {
          unmatchedNames.push(row.name);
        }
        continue;
      }
      if (candidates.length > 1) {
        if (!ambiguousNames.includes(row.name)) ambiguousNames.push(row.name);
        continue;
      }
      const emp = candidates[0];

      for (const rec of row.records) {
        const key = `${emp.id}_${rec.date}`;
        if (existingSet.has(key)) continue;
        records.push({
          employeeId: emp.id,
          employeeName: emp.name,
          date: rec.date,
          category: rec.category,
        });
        existingSet.add(key);
      }
    }

    let created = 0;
    if (records.length > 0) {
      created = await createAttendanceBulk(records);
    }

    return NextResponse.json({
      created,
      totalParsed: parsed.reduce((s, r) => s + r.records.length, 0),
      skippedDuplicate: parsed.reduce((s, r) => s + r.records.length, 0) - records.length,
      unmatchedNames,
      ambiguousNames,
    });
  } catch (error) {
    console.error("엑셀 가져오기 실패:", error);
    return NextResponse.json({ error: "엑셀 파싱 또는 등록 실패" }, { status: 500 });
  }
}
