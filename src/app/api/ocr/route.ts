import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";
import { getKSTToday } from "@/lib/date-utils";

const receiptSchema = z.object({
  storeName: z.string().describe("상호명/가게이름"),
  date: z.string().nullable().describe("날짜 (YYYY-MM-DD)"),
  totalAmount: z.number().nullable().describe("총 금액"),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      amount: z.number().nullable(),
    })
  ).describe("항목 목록"),
  documentType: z.enum(["영수증", "세금계산서", "거래명세서", "기타"]).describe("문서 유형"),
  summary: z.string().describe("한 줄 요약"),
});

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "이미지 URL이 필요합니다." },
        { status: 400 }
      );
    }

    const today = getKSTToday();

    const { object } = await generateObject({
      model,
      schema: receiptSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 이미지에서 영수증/세금계산서/거래명세서 정보를 추출해주세요.
오늘 날짜: ${today}
- 날짜가 보이지 않으면 null
- 금액이 보이지 않으면 null
- summary에는 "상호명 / 총금액" 형태로 한 줄 요약`,
            },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("OCR 실패:", error);
    const message =
      error instanceof Error ? error.message : "이미지 인식에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
