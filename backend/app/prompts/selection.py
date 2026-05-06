from app.llm.base import ChatMessage
from app.models import SelectionRequest
from app.rag.retriever import RagChunk


SYSTEM_PROMPT = """당신은 장애인과 고령자가 행정문서를 쉽게 이해하도록 돕는 한국어 쉬운말 전문가입니다.

공통 규칙:
- 원문의 법적 의미, 조건, 금액, 날짜, 신청 자격, 제출 서류를 바꾸거나 삭제하지 마세요.
- 사용자가 선택한 텍스트가 짧거나 불완전하면 주변 문맥과 전체 원문 발췌에서 가장 관련 있는 표현을 찾아 함께 해석하세요.
- 근거가 부족하면 추측하지 말고 warnings에 확인 필요 사항을 쓰세요.
- 반드시 JSON 객체만 반환하세요.

mode가 explain이면:
- 선택한 내용이 행정문서 안에서 무슨 뜻인지 쉬운 한국어로 설명하세요.
- 어려운 용어는 초등 고학년 수준으로 풀어 쓰세요.
- 문장 자체를 다시 작성하기보다 의미, 필요한 행동, 주의할 점을 설명하세요.

mode가 fillExample이면:
- 선택 영역이나 주변 문맥에 빈칸, 괄호, 서명란, 날짜란, 주소란, 성명란 같은 작성 칸이 있는지 찾으세요.
- 빈칸이 있으면 실제 개인정보가 아닌 안전한 예시값으로 채운 예시를 제시하세요.
- 예시는 현실적인 형식을 따르되 허구 정보임을 분명히 하세요.
- 빈칸이 없으면 억지로 만들지 말고, 어떤 칸을 선택해야 하는지 안내하세요."""


def build_selection_messages(request: SelectionRequest, chunks: list[RagChunk]) -> list[ChatMessage]:
    rag_context = "\n".join(
        f"- [{chunk.id}] {chunk.title}: {chunk.content}" for chunk in chunks
    ) or "- 참고 자료 없음"

    user_prompt = f"""작업 모드: {request.mode}
사용자가 드래그한 텍스트:
{request.selectedText}

주변 문맥 또는 전체 원문 발췌:
{request.surroundingContext}

RAG 참고 자료:
{rag_context}

출력 JSON 스키마:
{{
  "resultText": "설명 결과 또는 빈칸 작성 예시",
  "explanation": "사용자에게 보여줄 짧은 설명",
  "plainMeaning": "행정문서 안에서의 쉬운 뜻",
  "whyChanged": "어떤 문맥을 보았고 왜 그렇게 설명하거나 예시를 채웠는지",
  "relatedTerms": [
    {{"term": "용어", "meaning": "쉬운 뜻", "easyExpression": "쉬운 표현"}}
  ],
  "citations": ["참고한 RAG chunk id"],
  "warnings": ["확인 필요 사항"]
}}"""

    return [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=user_prompt),
    ]
