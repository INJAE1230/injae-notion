import { generateObject } from "ai";
import { z } from "zod";
import { model } from "./ai";

const workLogSchema = z.object({
  entries: z.array(
    z.object({
      title: z.string().describe("업무 제목 (간결하게)"),
      date: z.string().describe("날짜 (YYYY-MM-DD 형식)"),
      project: z.enum(["내부", "클라이언트", "개인"]).describe("프로젝트 분류"),
      status: z.enum(["예정", "진행 중", "완료"]).describe("진행 상태"),
      content: z.string().describe("업무 상세 내용"),
      tags: z
        .array(z.enum(["회의", "개발", "기획", "리뷰", "버그"]))
        .describe("관련 태그"),
      hours: z.number().nullable().describe("소요 시간 (시간 단위)"),
      link: z.string().nullable().describe("관련 링크 URL"),
    })
  ),
});

export async function parseMemoText(text: string, today: string) {
  const { object } = await generateObject({
    model,
    schema: workLogSchema,
    prompt: `당신은 업무일지 파싱 도우미입니다. 사용자가 자유롭게 작성한 메모를 구조화된 업무일지 항목으로 변환해주세요.

오늘 날짜: ${today}

규칙:
- 하나의 메모에서 여러 업무를 분리해서 각각 항목으로 만드세요
- 날짜 언급이 없으면 오늘 날짜를 사용하세요
- "내일", "어제" 등 상대 날짜는 오늘 기준으로 계산하세요
- 프로젝트 분류: 외부 회사/고객 언급 → "클라이언트", 개인적인 일 → "개인", 그 외 → "내부"
- 진행상태: "했다/완료/끝냄" → "완료", "할 예정/내일/계획" → "예정", 그 외 → "진행 중"
- 태그: 미팅/회의 → "회의", 코딩/개발/구현 → "개발", 기획/설계 → "기획", 리뷰/검토 → "리뷰", 버그/에러/수정 → "버그"
- 시간 언급이 있으면 hours에 넣고, 없으면 null
- 링크(URL)가 있으면 link에 넣고, 없으면 null
- content에는 원본 메모에서 해당 업무에 관련된 상세 내용을 넣으세요

사용자 메모:
${text}`,
  });

  return object.entries;
}
