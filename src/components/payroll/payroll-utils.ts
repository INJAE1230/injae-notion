import type { PayrollRecord, PayrollFormData } from "@/lib/payroll-types";

export function formatKRW(n: number) {
  if (n === 0) return "0원";
  const abs = Math.abs(n);
  const formatted =
    abs >= 10000
      ? `${Math.floor(abs / 10000).toLocaleString()}만 ${abs % 10000 > 0 ? (abs % 10000).toLocaleString() : ""}`.trim() + "원"
      : abs.toLocaleString() + "원";
  return n < 0 ? `-${formatted}` : formatted;
}

export function formatNumber(n: number) {
  return n.toLocaleString();
}

export const DEDUCTION_COLORS = [
  "oklch(0.65 0.16 260)",
  "oklch(0.65 0.14 170)",
  "oklch(0.7 0.16 45)",
  "oklch(0.65 0.18 310)",
  "oklch(0.6 0.14 140)",
  "oklch(0.7 0.12 200)",
  "oklch(0.6 0.16 90)",
  "oklch(0.55 0.12 30)",
];

export const EMPTY_FORM: PayrollFormData = {
  month: "",
  payDate: "",
  basePay: 2166000,
  overtimePay: 684000,
  overtimeHours: 44,
  holidayPay: 0,
  nightPay: 0,
  annualLeavePay: 0,
  positionPay: 0,
  mealAllowance: 0,
  vehicleAllowance: 0,
  otherPay: 0,
  incomeTax: 71580,
  residentTax: 7150,
  healthInsurance: 102450,
  longTermCare: 13460,
  nationalPension: 133000,
  employmentInsurance: 25650,
  yearEndSettlement: 0,
  otherDeduction: 0,
  totalWorkHours: 253,
  workDays: 21,
  hourlyWage: 10363.64,
  note: "",
};

export function recordToFormData(r: PayrollRecord): PayrollFormData {
  return {
    month: r.month,
    payDate: r.payDate,
    basePay: r.basePay,
    overtimePay: r.overtimePay,
    overtimeHours: r.overtimeHours,
    holidayPay: r.holidayPay,
    nightPay: r.nightPay,
    annualLeavePay: r.annualLeavePay,
    positionPay: r.positionPay,
    mealAllowance: r.mealAllowance,
    vehicleAllowance: r.vehicleAllowance,
    otherPay: r.otherPay,
    incomeTax: r.incomeTax,
    residentTax: r.residentTax,
    healthInsurance: r.healthInsurance,
    longTermCare: r.longTermCare,
    nationalPension: r.nationalPension,
    employmentInsurance: r.employmentInsurance,
    yearEndSettlement: r.yearEndSettlement,
    otherDeduction: r.otherDeduction,
    totalWorkHours: r.totalWorkHours,
    workDays: r.workDays,
    hourlyWage: r.hourlyWage,
    note: r.note,
  };
}

// 급여명세서 OCR 결과(각 필드 nullable)를 폼 데이터에 병합.
// 숫자는 값이 있을 때만 덮어쓰고, month/payDate/note는 비어있지 않을 때만 반영.
export type PayslipOcr = Partial<Record<keyof PayrollFormData, number | string | null>>;

export function mergeOcrIntoForm(prev: PayrollFormData, ocr: PayslipOcr): PayrollFormData {
  const next = { ...prev };
  const numKeys: (keyof PayrollFormData)[] = [
    "basePay", "overtimePay", "overtimeHours", "holidayPay", "nightPay",
    "annualLeavePay", "positionPay", "mealAllowance", "vehicleAllowance", "otherPay",
    "incomeTax", "residentTax", "healthInsurance", "longTermCare", "nationalPension",
    "employmentInsurance", "yearEndSettlement", "otherDeduction",
    "totalWorkHours", "workDays", "hourlyWage",
  ];
  for (const k of numKeys) {
    const v = ocr[k];
    if (typeof v === "number" && !isNaN(v)) (next[k] as number) = v;
  }
  if (typeof ocr.month === "string" && /^\d{4}-\d{2}$/.test(ocr.month)) next.month = ocr.month;
  if (typeof ocr.payDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ocr.payDate)) next.payDate = ocr.payDate;
  if (typeof ocr.note === "string" && ocr.note.trim()) next.note = ocr.note.trim();
  return next;
}

// 과세표준 → 산출세액 (2023년 이후 기본세율 구간)
export function calcSimpleTax(taxBase: number): number {
  const taxBrackets = [
    { limit: 14_000_000, rate: 0.06, deduction: 0 },
    { limit: 50_000_000, rate: 0.15, deduction: 1_260_000 },
    { limit: 88_000_000, rate: 0.24, deduction: 5_760_000 },
    { limit: 150_000_000, rate: 0.35, deduction: 15_440_000 },
    { limit: 300_000_000, rate: 0.38, deduction: 19_940_000 },
    { limit: 500_000_000, rate: 0.40, deduction: 25_940_000 },
    { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
    { limit: Infinity, rate: 0.45, deduction: 65_940_000 },
  ];
  const bracket = taxBrackets.find((b) => taxBase <= b.limit)!;
  return Math.max(0, Math.round(taxBase * bracket.rate - bracket.deduction));
}

// 근로소득공제 (총급여 → 공제액, 한도 2,000만원)
export function calcEarnedIncomeDeduction(gross: number): number {
  let d: number;
  if (gross <= 5_000_000) d = gross * 0.7;
  else if (gross <= 15_000_000) d = 3_500_000 + (gross - 5_000_000) * 0.4;
  else if (gross <= 45_000_000) d = 7_500_000 + (gross - 15_000_000) * 0.15;
  else if (gross <= 100_000_000) d = 12_000_000 + (gross - 45_000_000) * 0.05;
  else d = 14_750_000 + (gross - 100_000_000) * 0.02;
  return Math.round(Math.min(d, 20_000_000));
}

// 근로소득세액공제 (산출세액 → 공제액, 총급여 구간별 한도)
export function calcEarnedIncomeTaxCredit(computedTax: number, gross: number): number {
  const credit =
    computedTax <= 1_300_000
      ? computedTax * 0.55
      : 715_000 + (computedTax - 1_300_000) * 0.3;
  let cap: number;
  if (gross <= 33_000_000) cap = 740_000;
  else if (gross <= 70_000_000) cap = Math.max(660_000, 740_000 - (gross - 33_000_000) * 0.008);
  else if (gross <= 120_000_000) cap = Math.max(500_000, 660_000 - (gross - 70_000_000) * 0.5);
  else cap = Math.max(200_000, 500_000 - (gross - 120_000_000) * 0.5);
  return Math.round(Math.min(credit, cap));
}

// 자녀세액공제 (8세 이상 자녀 수 기준)
export function calcChildCredit(children: number): number {
  if (children <= 0) return 0;
  if (children === 1) return 150_000;
  if (children === 2) return 350_000;
  return 350_000 + (children - 2) * 300_000;
}
