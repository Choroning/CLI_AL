import json

from app.llm.base import ChatMessage, LLMProvider, LLMResponse


class MockLLMProvider(LLMProvider):
    async def generate(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1200,
    ) -> LLMResponse:
        user_message = next((message.content for message in reversed(messages) if message.role == "user"), "")
        selected_text = _extract_between(user_message, "선택한 텍스트:", "주변 문맥:").strip()
        mode = _extract_between(user_message, "작업 모드:", "선택한 텍스트:").strip()

        is_word = len(selected_text.split()) <= 1
        result_text = (
            f"{selected_text}는 문맥을 확인해 쉽게 설명해야 하는 말입니다."
            if is_word
            else _simplify_sentence(selected_text)
        )

        if mode == "fillExample":
            result_text = (
                "예시: 성명 홍길동 / 생년월일 1990년 1월 1일 / 주소 세종특별자치시 도움1로 00. "
                "실제 제출 시에는 본인의 정확한 정보를 적어야 합니다."
            )

        if mode == "summarize":
            result_text = selected_text[:80].rstrip() + ("..." if len(selected_text) > 80 else "")

        payload = {
            "resultText": result_text,
            "explanation": "개발용 mock LLM 응답입니다. 실제 배포에서는 NVIDIA NIM 응답으로 대체됩니다.",
            "plainMeaning": "선택한 부분을 문서의 앞뒤 내용과 함께 보고 쉬운 말로 풀이했습니다.",
            "whyChanged": "빈칸 예시 요청이면 주변 양식 문맥을 보고 허구 예시값을 제시합니다.",
            "relatedTerms": [],
            "citations": ["mock-rag-001"],
            "warnings": ["실제 법적 판단이 필요한 내용은 담당 기관 확인이 필요합니다."],
        }
        return LLMResponse(content=json.dumps(payload, ensure_ascii=False), raw=payload)


def _extract_between(text: str, start: str, end: str) -> str:
    if start not in text:
        return ""
    after = text.split(start, 1)[1]
    if end not in after:
        return after
    return after.split(end, 1)[0]


def _simplify_sentence(text: str) -> str:
    replacements = {
        "제출하여야 합니다": "내야 합니다",
        "해당하는 경우": "맞으면",
        "환수할 수 있습니다": "돌려받을 수 있습니다",
        "소득인정액": "소득과 재산을 계산한 금액",
        "선정기준액": "지원 대상을 정하는 기준 금액",
    }
    simplified = text
    for source, target in replacements.items():
        simplified = simplified.replace(source, target)
    return simplified
