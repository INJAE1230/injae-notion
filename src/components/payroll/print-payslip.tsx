import { formatNumber } from "./payroll-utils";
import type { PayrollRecord } from "@/lib/payroll-types";

export function PrintPayslip({ record: r }: { record: PayrollRecord }) {
  const [y, m] = r.month.split("-");
  return (
    <div>
      <h1>{y}년 {parseInt(m)}월 급여명세서</h1>
      <p className="sub">지급일: {r.payDate} | 근무일수: {r.workDays}일 | 총근무시간: {r.totalWorkHours}시간</p>
      <table>
        <thead>
          <tr><th colSpan={2}>지급 항목</th><th colSpan={2}>공제 항목</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>기본급</td><td className="num">{formatNumber(r.basePay)}원</td>
            <td>근로소득세</td><td className="num">{formatNumber(r.incomeTax)}원</td>
          </tr>
          <tr>
            <td>연장수당 ({r.overtimeHours}h)</td><td className="num">{formatNumber(r.overtimePay)}원</td>
            <td>주민세</td><td className="num">{formatNumber(r.residentTax)}원</td>
          </tr>
          <tr>
            <td>휴일수당</td><td className="num">{formatNumber(r.holidayPay)}원</td>
            <td>건강보험</td><td className="num">{formatNumber(r.healthInsurance)}원</td>
          </tr>
          <tr>
            <td>야간수당</td><td className="num">{formatNumber(r.nightPay)}원</td>
            <td>요양보험</td><td className="num">{formatNumber(r.longTermCare)}원</td>
          </tr>
          <tr>
            <td>연차수당</td><td className="num">{formatNumber(r.annualLeavePay)}원</td>
            <td>국민연금</td><td className="num">{formatNumber(r.nationalPension)}원</td>
          </tr>
          <tr>
            <td>직책수당</td><td className="num">{formatNumber(r.positionPay)}원</td>
            <td>고용보험</td><td className="num">{formatNumber(r.employmentInsurance)}원</td>
          </tr>
          <tr>
            <td>식대</td><td className="num">{formatNumber(r.mealAllowance)}원</td>
            <td>연말정산</td><td className="num">{formatNumber(r.yearEndSettlement)}원</td>
          </tr>
          <tr>
            <td>차량지원비</td><td className="num">{formatNumber(r.vehicleAllowance)}원</td>
            <td>기타공제</td><td className="num">{formatNumber(r.otherDeduction)}원</td>
          </tr>
          <tr>
            <td>기타수당</td><td className="num">{formatNumber(r.otherPay)}원</td>
            <td></td><td></td>
          </tr>
          <tr className="total-row">
            <td>지급액 합계</td><td className="num">{formatNumber(r.totalPay)}원</td>
            <td>공제 합계</td><td className="num">{formatNumber(r.totalDeduction)}원</td>
          </tr>
        </tbody>
      </table>
      <div className="net">실수령액: {formatNumber(r.netPay)}원</div>
      {r.note && <div className="note">비고: {r.note}</div>}
      <div className="info">
        <span>통상시급: {formatNumber(r.hourlyWage)}원</span>
      </div>
    </div>
  );
}

