import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";

// 급여명세서 이미지에서 추출할 항목. 모든 금액/수치는 못 읽으면 null.
const payslipSchema = z.object({
  month: z.string().nullable().describe("귀속월/급여 대상 월 (YYYY-MM). 예: '2026년 6월분' → '2026-06'"),
  payDate: z.string().nullable().describe("지급일 (YYYY-MM-DD)"),
  // 지급 항목
  basePay: z.number().nullable().describe("기본급"),
  overtimePay: z.number().nullable().describe("연장수당/시간외수당"),
  overtimeHours: z.number().nullable().describe("연장근로시간(시간). 금액 아님"),
  holidayPay: z.number().nullable().describe("휴일수당"),
  nightPay: z.number().nullable().describe("야간수당"),
  annualLeavePay: z.number().nullable().describe("연차수당"),
  positionPay: z.number().nullable().describe("직책수당"),
  mealAllowance: z.number().nullable().describe("식대"),
  vehicleAllowance: z.number().nullable().describe("차량지원비/자가운전보조금"),
  otherPay: z.number().nullable().describe("기타수당 (위에 해당하지 않는 기타 지급 항목 합)"),
  // 공제 항목
  incomeTax: z.number().nullable().describe("근로소득세/소득세"),
  residentTax: z.number().nullable().describe("주민세/지방소득세"),
  healthInsurance: z.number().nullable().describe("건강보험"),
  longTermCare: z.number().nullable().describe("장기요양보험/요양보험"),
  nationalPension: z.number().nullable().describe("국민연금"),
  employmentInsurance: z.number().nullable().describe("고용보험"),
  yearEndSettlement: z.number().nullable().describe("연말정산 정산액 (환급이면 음수)"),
  otherDeduction: z.number().nullable().describe("기타공제"),
  // 근무 정보
  totalWorkHours: z.number().nullable().describe("총근무시간"),
  workDays: z.number().nullable().describe("근무일수"),
  hourlyWage: z.number().nullable().describe("통상시급"),
  note: z.string().nullable().describe("비고/특이사항 (없으면 null)"),
});

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "이미지 URL이 필요합니다." }, { status: 400 });
    }

    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    )
      .toISOString()
      .split("T")[0];

    const { object } = await generateObject({
      model,
      schema: payslipSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 이미지는 급여명세서(급여지급명세서)입니다. 각 지급/공제 항목의 금액과 근무 정보를 정확히 추출해주세요.
오늘 날짜: ${today}
- 금액은 콤마/원 표기를 제거한 숫자만 (예: "2,128,000원" → 2128000)
- 해당 항목이 명세서에 없으면 null (0으로 채우지 말 것)
- 연장시간(overtimeHours)은 시간 단위 숫자이며 금액이 아님
- 여러 수당이 세분화되어 있으면 가장 가까운 항목에 매핑하고, 애매한 것은 otherPay(기타수당)/otherDeduction(기타공제)에 합산
- 연말정산 환급액은 음수로 표기`,
            },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("급여명세서 인식 실패:", error);
    const message = error instanceof Error ? error.message : "이미지 인식에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
