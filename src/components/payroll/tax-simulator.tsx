"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  formatKRW,
  calcSimpleTax,
  calcEarnedIncomeDeduction,
  calcEarnedIncomeTaxCredit,
  calcChildCredit,
} from "./payroll-utils";
import { NumField } from "./payroll-fields";
import type { PayrollRecord } from "@/lib/payroll-types";

export function TaxSimulator({ records }: { records: PayrollRecord[] }) {
  const currentYear = new Date().getFullYear().toString();
  const yearRecords = records.filter((r) => r.month.startsWith(currentYear));
  const monthCount = yearRecords.length;
  const annualize = (v: number) => (monthCount > 0 ? Math.round((v / monthCount) * 12) : 0);

  // 급여 데이터에서 연간 추정치 자동 산출
  const grossPaid = yearRecords.reduce((s, r) => s + r.totalPay, 0);
  const pensionPaid = yearRecords.reduce((s, r) => s + r.nationalPension, 0);
  const healthEmpPaid = yearRecords.reduce(
    (s, r) => s + r.healthInsurance + r.longTermCare + r.employmentInsurance,
    0
  );
  const taxPaid = yearRecords.reduce((s, r) => s + r.incomeTax + r.residentTax, 0);

  const projectedGrossTotal = annualize(grossPaid); // 지급액합계 연간(비과세 포함)
  const annualPension = annualize(pensionPaid); // 국민연금 (연금보험료공제)
  const annualHealthEmp = annualize(healthEmpPaid); // 건강+요양+고용 (특별소득공제)
  const projectedTaxPaid = annualize(taxPaid); // 기납부 소득세+지방소득세

  // --- 사용자 입력 ---
  const [taxFree, setTaxFree] = useState(0); // 연간 비과세소득(식대 등)
  const [dependents, setDependents] = useState(1); // 기본공제 대상(본인 포함)
  const [children, setChildren] = useState(0); // 8세 이상 자녀 수
  const [cardSpending, setCardSpending] = useState(0); // 신용카드 등 사용액
  const [etcIncomeDeduction, setEtcIncomeDeduction] = useState(0); // 기타 소득공제
  const [pensionSaving, setPensionSaving] = useState(0); // 연금계좌 납입액
  const [insurancePremium, setInsurancePremium] = useState(0); // 보장성보험료
  const [medical, setMedical] = useState(0); // 의료비 지출액
  const [education, setEducation] = useState(0); // 교육비 지출액
  const [donation, setDonation] = useState(0); // 기부금
  const [smeRate, setSmeRate] = useState(0); // 중소기업 취업자 소득세 감면율(0/0.7/0.9)

  // 1. 총급여 = 지급액 − 비과세
  const totalGross = Math.max(0, projectedGrossTotal - taxFree);

  // 2. 근로소득금액 = 총급여 − 근로소득공제
  const earnedIncomeDeduction = calcEarnedIncomeDeduction(totalGross);
  const earnedIncome = Math.max(0, totalGross - earnedIncomeDeduction);

  // 3. 소득공제
  const personalDeduction = Math.max(1, dependents) * 1_500_000; // 인적공제
  const cardThreshold = totalGross * 0.25;
  const cardDeduction = Math.min(
    Math.max(0, cardSpending - cardThreshold) * 0.15,
    3_000_000
  ); // 신용카드 소득공제(간이: 15%, 한도 300만)
  const totalIncomeDeduction =
    personalDeduction + annualPension + annualHealthEmp + cardDeduction + etcIncomeDeduction;

  // 4. 과세표준 → 산출세액
  const taxBase = Math.max(0, earnedIncome - totalIncomeDeduction);
  const computedTax = calcSimpleTax(taxBase);

  // 4-1. 중소기업 취업자 소득세 감면 (산출세액 × 감면율, 연 200만 한도)
  const smeReduction = Math.min(Math.round(computedTax * smeRate), 2_000_000);

  // 5. 세액공제
  const earnedTaxCredit = calcEarnedIncomeTaxCredit(computedTax, totalGross); // 근로소득세액공제
  const childCredit = calcChildCredit(children); // 자녀세액공제
  const pensionRate = totalGross <= 55_000_000 ? 0.15 : 0.12;
  const pensionCredit = Math.min(pensionSaving, 9_000_000) * pensionRate; // 연금계좌세액공제
  const insuranceCredit = Math.min(insurancePremium, 1_000_000) * 0.12; // 보장성보험료(한도 100만)
  const medicalCredit = Math.max(0, medical - totalGross * 0.03) * 0.15; // 의료비(총급여 3% 초과분)
  const educationCredit = education * 0.15; // 교육비(간이)
  const donationCredit = donation * 0.15; // 기부금(간이)
  const specialCredit = insuranceCredit + medicalCredit + educationCredit + donationCredit;
  // 특별세액공제 합이 표준세액공제(13만원)보다 작으면 표준세액공제 적용
  const appliedSpecialCredit = Math.max(specialCredit, 130_000);
  const totalTaxCredit =
    earnedTaxCredit + childCredit + Math.round(pensionCredit) + Math.round(appliedSpecialCredit);

  // 6. 결정세액 (소득세 + 지방소득세 10%)
  const decidedIncomeTax = Math.max(0, computedTax - smeReduction - totalTaxCredit);
  const localTax = Math.round(decidedIncomeTax * 0.1);
  const totalDecidedTax = decidedIncomeTax + localTax;

  // 7. 정산 = 기납부 − 결정세액 (양수 = 환급)
  const settlement = projectedTaxPaid - totalDecidedTax;

  const hasData = monthCount > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-accent/50 p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{currentYear}년 급여 데이터</span>
          <span className="font-medium">{monthCount}개월 반영 → 12개월 환산</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">연간 지급액(추정)</span>
          <span className="font-medium">{formatKRW(projectedGrossTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">국민연금 / 건강·고용보험(추정)</span>
          <span className="font-medium">{formatKRW(annualPension)} / {formatKRW(annualHealthEmp)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">기납부 소득세+지방소득세(추정)</span>
          <span className="font-medium">{formatKRW(projectedTaxPaid)}</span>
        </div>
      </div>

      {!hasData && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          올해 급여명세서가 없어 계산 기준이 없습니다. 명세서를 먼저 등록하세요.
        </p>
      )}

      <Separator />

      <p className="text-xs font-medium text-muted-foreground">기본 정보</p>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="연간 비과세소득 (식대 등)" value={taxFree} onChange={setTaxFree} />
        <div>
          <label className="text-xs font-medium text-muted-foreground">기본공제 인원 (본인 포함)</label>
          <Input type="number" value={dependents} onChange={(e) => setDependents(Math.max(1, Number(e.target.value) || 1))} min={1} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">8세 이상 자녀 수</label>
          <Input type="number" value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} min={0} className="mt-1" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground">중소기업 취업자 소득세 감면</label>
          <select
            value={smeRate}
            onChange={(e) => setSmeRate(Number(e.target.value))}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={0}>해당 없음</option>
            <option value={0.9}>청년(만 34세 이하) 90% 감면</option>
            <option value={0.7}>60세 이상·장애인·경력단절여성 70% 감면</option>
          </select>
          <p className="text-[10px] text-muted-foreground mt-0.5">산출세액에서 직접 차감 · 연 200만원 한도</p>
        </div>
      </div>

      <p className="text-xs font-medium text-muted-foreground">소득공제 (홈택스 간소화 금액 입력)</p>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="신용카드 등 사용액" value={cardSpending} onChange={setCardSpending} />
        <NumField label="기타 소득공제" value={etcIncomeDeduction} onChange={setEtcIncomeDeduction} />
      </div>

      <p className="text-xs font-medium text-muted-foreground">세액공제 (실제 지출/납입액 입력)</p>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="연금계좌 납입액" value={pensionSaving} onChange={setPensionSaving} />
        <NumField label="보장성보험료" value={insurancePremium} onChange={setInsurancePremium} />
        <NumField label="의료비" value={medical} onChange={setMedical} />
        <NumField label="교육비" value={education} onChange={setEducation} />
        <NumField label="기부금" value={donation} onChange={setDonation} />
      </div>

      <Separator />

      <div className="space-y-1.5 text-sm">
        <SimRow label="총급여" value={totalGross} />
        <SimRow label="(−) 근로소득공제" value={-earnedIncomeDeduction} muted />
        <SimRow label="(−) 소득공제 합계" value={-totalIncomeDeduction} muted sub="인적·국민연금·건강보험·카드 등" />
        <SimRow label="= 과세표준" value={taxBase} bold />
        <SimRow label="산출세액" value={computedTax} />
        {smeReduction > 0 && (
          <SimRow label="(−) 중소기업 취업자 감면" value={-smeReduction} muted />
        )}
        <SimRow label="(−) 근로소득세액공제" value={-earnedTaxCredit} muted />
        <SimRow label="(−) 자녀·연금·특별세액공제" value={-(childCredit + Math.round(pensionCredit) + Math.round(appliedSpecialCredit))} muted />
        <SimRow label="= 결정세액 (소득세)" value={decidedIncomeTax} bold />
        <SimRow label="지방소득세 (10%)" value={localTax} muted />
        <SimRow label="총 결정세액" value={totalDecidedTax} bold />
        <SimRow label="연간 기납부세액(추정)" value={projectedTaxPaid} muted />
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <span className="font-medium">예상 정산 결과</span>
        <span className={`text-lg font-bold ${settlement > 0 ? "text-emerald-500" : settlement < 0 ? "text-red-500" : ""}`}>
          {settlement > 0 ? "환급 " : settlement < 0 ? "추가납부 " : ""}
          {formatKRW(Math.abs(settlement))}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        * 근로소득공제·근로소득세액공제·중소기업 감면·주요 세액공제까지 반영한 추정치입니다.
        신용카드(체크/현금·전통시장·대중교통 구분)·의료비 세부항목·주택자금 등은 간이 계산이며,
        중소기업 감면 적용 시 근로소득세액공제가 실제로는 감면비율만큼 축소되지만 여기선 단순화했습니다.
        정확한 결과는 국세청 홈택스 &quot;연말정산 미리보기&quot;로 확인하세요.
      </p>
    </div>
  );
}

function SimRow({
  label,
  value,
  bold,
  muted,
  sub,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={bold ? "font-medium" : muted ? "text-muted-foreground text-xs" : "text-muted-foreground"}>
        {label}
        {sub && <span className="text-[10px] text-muted-foreground ml-1">({sub})</span>}
      </span>
      <span className={`tabular-nums ${bold ? "font-bold" : muted ? "text-xs text-muted-foreground" : ""}`}>
        {formatKRW(value)}
      </span>
    </div>
  );
}

