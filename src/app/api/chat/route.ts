import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { modelAssistant } from "@/lib/ai";
import { aiTools } from "@/lib/ai-tools";
import { getKSTToday } from "@/lib/date-utils";

// tool 여러 번 호출 + 응답 생성이 이어질 수 있어 여유를 둔다
export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const today = getKSTToday();

  const result = streamText({
    // tool 파라미터 선택 정확도가 답변 품질을 좌우한다. Claude Haiku 우선,
    // ANTHROPIC_API_KEY 없으면 gpt-4o로 폴백(ai.ts에서 결정).
    model: modelAssistant,
    maxOutputTokens: 4096,
    // 여러 tool을 연속 호출한 뒤 답하도록 멀티스텝 허용 (무한루프 방지 상한)
    stopWhen: stepCountIs(6),
    system: `당신은 이 업무 관리 앱의 AI 비서입니다. 사용자의 업무일지·트랙·근태·연차·급여 데이터를 조회해 질문에 답합니다.

오늘 날짜: ${today} (요일 계산에 활용하세요)

원칙:
- 데이터가 필요한 질문은 반드시 제공된 도구로 실제 데이터를 조회한 뒤 답하세요. 추측하지 마세요.
- "이번 주", "지난달" 같은 표현은 오늘 날짜 기준으로 구체적 날짜 범위(YYYY-MM-DD)로 바꿔 도구에 넘기세요. (주는 월요일 시작 기준)
- 사용자가 명시하지 않은 필터는 넣지 마세요. "이번 주 업무"는 기간만 걸고, 사업장·상태·우선순위는 사용자가 말했을 때만 거세요. 임의로 좁히면 건수가 틀립니다.
- 답변은 한국어로, 간결하게. 숫자·날짜·건수는 정확히.
- 조회 결과가 없으면 없다고 솔직히 말하세요.
- 사용자가 정확한 단어를 기억 못 하는 "찾기" 질문(예: "지난달에 어느 업체랑 견적 얘기했더라")은 키워드 검색에 의존하지 말고, 기간 정도만 걸어 넓게 조회한 뒤 content·originalText를 직접 읽고 의미가 맞는 항목을 찾아 제시하세요.
- 당신은 조회만 할 수 있습니다. 업무 생성·수정·삭제는 할 수 없으니, 그런 요청이 오면 해당 페이지에서 직접 하도록 안내하세요.`,
    messages: await convertToModelMessages(messages),
    tools: aiTools,
  });

  return result.toUIMessageStreamResponse();
}
