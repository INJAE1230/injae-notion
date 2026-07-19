import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 기본 모델: 일반 파싱·요약 등 대부분의 호출에 사용 (저비용)
export const model = openai("gpt-4o-mini");

// 고성능 모델: 대용량 카톡 그룹 파싱처럼 긴 입력에서 디테일 보존이 중요한 호출에만 사용
export const modelPro = openai("gpt-4o");

// Claude Haiku 4.5 — 한국어 품질 좋고 저렴. ANTHROPIC_API_KEY가 있을 때만 사용하고,
// 없으면 OpenAI로 자동 폴백한다(다른 PC에서 키 없이도 그대로 동작). 필수 환경변수 아님.
const anthropic = process.env.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// 업무내용 다듬기용 (Haiku 우선, 키 없으면 gpt-4o-mini로 폴백)
export const modelPolish = anthropic ? anthropic("claude-haiku-4-5") : model;

// AI 비서용 (Haiku 우선, 키 없으면 gpt-4o로 폴백)
export const modelAssistant = anthropic ? anthropic("claude-haiku-4-5") : modelPro;
