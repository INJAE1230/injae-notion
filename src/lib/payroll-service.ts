import { notion } from "./notion";
import { queryAllPages, type NotionPage } from "./notion-helpers";
import type { PayrollRecord, PayrollFormData } from "./payroll-types";

function getPayrollDbId(): string {
  const id = process.env.NOTION_PAYROLL_DB_ID;
  if (!id) throw new Error("NOTION_PAYROLL_DB_ID 환경변수가 설정되지 않았습니다.");
  return id;
}

function mapRecord(page: NotionPage): PayrollRecord {
  const p = page.properties as Record<string, Record<string, unknown>>;

  const title =
    (p["제목"]?.title as { plain_text: string }[] | undefined)?.[0]
      ?.plain_text || "";
  const monthDate = p["귀속월"]?.date as { start: string } | null | undefined;
  const payDateObj = p["지급일"]?.date as { start: string } | null | undefined;
  const note =
    (p["비고"]?.rich_text as { plain_text: string }[] | undefined)?.[0]
      ?.plain_text || "";

  const num = (key: string) => (p[key]?.number as number | null) ?? 0;

  const monthStr = monthDate?.start || "";
  const month = monthStr ? monthStr.substring(0, 7) : "";

  return {
    id: page.id,
    title,
    month,
    payDate: payDateObj?.start || "",
    basePay: num("기본급"),
    overtimePay: num("연장수당"),
    overtimeHours: num("연장시간"),
    holidayPay: num("휴일수당"),
    nightPay: num("야간수당"),
    annualLeavePay: num("연차수당"),
    positionPay: num("직책수당"),
    mealAllowance: num("식대"),
    vehicleAllowance: num("차량지원비"),
    otherPay: num("기타수당"),
    totalPay: num("지급액합계"),
    incomeTax: num("근로소득세"),
    residentTax: num("주민세"),
    healthInsurance: num("건강보험"),
    longTermCare: num("요양보험"),
    nationalPension: num("국민연금"),
    employmentInsurance: num("고용보험"),
    yearEndSettlement: num("연말정산"),
    otherDeduction: num("기타공제"),
    totalDeduction: num("공제합계"),
    netPay: num("실수령액"),
    totalWorkHours: num("총근무시간"),
    workDays: num("근무일수"),
    hourlyWage: num("통상시급"),
    note,
  };
}

export async function getAllPayrolls(): Promise<PayrollRecord[]> {
  const pages = await queryAllPages(getPayrollDbId(), [{ property: "귀속월", direction: "descending" }]);
  return pages.map(mapRecord);
}

export async function createPayroll(data: PayrollFormData): Promise<string> {
  const totalPay =
    data.basePay +
    data.overtimePay +
    data.holidayPay +
    data.nightPay +
    data.annualLeavePay +
    data.positionPay +
    data.mealAllowance +
    data.vehicleAllowance +
    data.otherPay;
  const totalDeduction =
    data.incomeTax +
    data.residentTax +
    data.healthInsurance +
    data.longTermCare +
    data.nationalPension +
    data.employmentInsurance +
    data.yearEndSettlement +
    data.otherDeduction;
  const netPay = totalPay - totalDeduction;

  const [y, m] = data.month.split("-");
  const title = `${y}년 ${parseInt(m)}월 급여명세서`;

  const properties: Record<string, unknown> = {
    제목: { title: [{ text: { content: title } }] },
    귀속월: { date: { start: `${data.month}-01` } },
    지급일: { date: { start: data.payDate } },
    기본급: { number: data.basePay },
    연장수당: { number: data.overtimePay },
    연장시간: { number: data.overtimeHours },
    휴일수당: { number: data.holidayPay },
    야간수당: { number: data.nightPay },
    연차수당: { number: data.annualLeavePay },
    직책수당: { number: data.positionPay },
    식대: { number: data.mealAllowance },
    차량지원비: { number: data.vehicleAllowance },
    기타수당: { number: data.otherPay },
    지급액합계: { number: totalPay },
    근로소득세: { number: data.incomeTax },
    주민세: { number: data.residentTax },
    건강보험: { number: data.healthInsurance },
    요양보험: { number: data.longTermCare },
    국민연금: { number: data.nationalPension },
    고용보험: { number: data.employmentInsurance },
    연말정산: { number: data.yearEndSettlement },
    기타공제: { number: data.otherDeduction },
    공제합계: { number: totalDeduction },
    실수령액: { number: netPay },
    총근무시간: { number: data.totalWorkHours },
    근무일수: { number: data.workDays },
    통상시급: { number: data.hourlyWage },
    비고: { rich_text: [{ text: { content: data.note || "" } }] },
  };

  const page = await notion.pages.create({
    parent: { database_id: getPayrollDbId() },
    properties,
  } as Parameters<typeof notion.pages.create>[0]);
  return page.id;
}

export async function updatePayroll(id: string, data: PayrollFormData): Promise<void> {
  const totalPay =
    data.basePay +
    data.overtimePay +
    data.holidayPay +
    data.nightPay +
    data.annualLeavePay +
    data.positionPay +
    data.mealAllowance +
    data.vehicleAllowance +
    data.otherPay;
  const totalDeduction =
    data.incomeTax +
    data.residentTax +
    data.healthInsurance +
    data.longTermCare +
    data.nationalPension +
    data.employmentInsurance +
    data.yearEndSettlement +
    data.otherDeduction;
  const netPay = totalPay - totalDeduction;

  const [y, m] = data.month.split("-");
  const title = `${y}년 ${parseInt(m)}월 급여명세서`;

  const properties: Record<string, unknown> = {
    제목: { title: [{ text: { content: title } }] },
    귀속월: { date: { start: `${data.month}-01` } },
    지급일: { date: { start: data.payDate } },
    기본급: { number: data.basePay },
    연장수당: { number: data.overtimePay },
    연장시간: { number: data.overtimeHours },
    휴일수당: { number: data.holidayPay },
    야간수당: { number: data.nightPay },
    연차수당: { number: data.annualLeavePay },
    직책수당: { number: data.positionPay },
    식대: { number: data.mealAllowance },
    차량지원비: { number: data.vehicleAllowance },
    기타수당: { number: data.otherPay },
    지급액합계: { number: totalPay },
    근로소득세: { number: data.incomeTax },
    주민세: { number: data.residentTax },
    건강보험: { number: data.healthInsurance },
    요양보험: { number: data.longTermCare },
    국민연금: { number: data.nationalPension },
    고용보험: { number: data.employmentInsurance },
    연말정산: { number: data.yearEndSettlement },
    기타공제: { number: data.otherDeduction },
    공제합계: { number: totalDeduction },
    실수령액: { number: netPay },
    총근무시간: { number: data.totalWorkHours },
    근무일수: { number: data.workDays },
    통상시급: { number: data.hourlyWage },
    비고: { rich_text: [{ text: { content: data.note || "" } }] },
  };

  await notion.pages.update({
    page_id: id,
    properties,
  } as Parameters<typeof notion.pages.update>[0]);
}

export async function deletePayroll(id: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  } as Parameters<typeof notion.pages.update>[0]);
}
