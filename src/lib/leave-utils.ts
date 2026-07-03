import type { AttendanceRecord, DeductionMethod } from "./hr-types";

const DEDUCTION_PREFIX_ANNUAL = "[연차차감]";
const DEDUCTION_PREFIX_REGULAR = "[정휴무차감]";

export function parseDeductionMethod(note: string): DeductionMethod | undefined {
  if (note.startsWith(DEDUCTION_PREFIX_ANNUAL)) return "연차";
  if (note.startsWith(DEDUCTION_PREFIX_REGULAR)) return "정휴무";
  return undefined;
}

export function encodeDeductionMethod(method: DeductionMethod, note: string): string {
  const prefix = method === "연차" ? DEDUCTION_PREFIX_ANNUAL : DEDUCTION_PREFIX_REGULAR;
  return `${prefix} ${note}`.trim();
}

export function stripDeductionPrefix(note: string): string {
  return note.replace(/^\[(연차|정휴무)차감\]\s*/, "");
}

export function calculateUsedLeave(records: AttendanceRecord[]): number {
  let used = 0;
  for (const r of records) {
    switch (r.category) {
      case "연차":
        used += 1;
        break;
      case "반차":
        used += 0.5;
        break;
      case "조퇴": {
        const method = r.deductionMethod || parseDeductionMethod(r.note);
        if (method === "연차") used += 0.5;
        break;
      }
      // 관공휴일, 근로자의날, 정상근무, 정휴무, 대출, 출장, 결근 → 연차 차감 없음
    }
  }
  return used;
}

export function calculateRemainingLeave(annualLeaveTotal: number, records: AttendanceRecord[]): number {
  return annualLeaveTotal - calculateUsedLeave(records);
}

export function calculateUsedUnusedRest(records: AttendanceRecord[]): number {
  return records.filter((r) => r.category === "미사용휴무").length;
}

export function calculateRemainingUnusedRest(unusedRestTotal: number, records: AttendanceRecord[]): number {
  return unusedRestTotal - calculateUsedUnusedRest(records);
}

export function isEarlyLeavePayDeductible(deductionMethod: DeductionMethod | undefined): boolean {
  return deductionMethod === "연차" || deductionMethod === "정휴무";
}
