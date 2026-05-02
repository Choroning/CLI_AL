_ANALYZE_BASE = """당신은 행정문서를 장애인과 고령자도 쉽게 이해할 수 있도록 변환하는 전문가입니다.
{rag_section}
다음 문서를 분석하고, 아래 JSON 형식으로 정확히 응답해주세요.

문서:
{document}

응답 형식 (반드시 이 JSON 형식만 출력, 다른 텍스트 없이):
{{
  "doc_type": "아래 유형 중 하나만 정확히 출력: 임대차계약서 | 근로계약서 | 기타계약서 | 공문서 | 의료안내문 | 약관 | 법령·규정 | 기타",
  "simplified": "쉬운 한국어로 재작성한 전체 내용. 어려운 한자어와 법률/행정 용어를 모두 쉬운 말로 바꾸고, 문장을 짧고 명확하게 작성하세요.",
  "key_points": [
    "핵심 항목 1",
    "핵심 항목 2"
  ],
  "action_items": [
    "사용자가 실제로 해야 할 행동 1",
    "사용자가 실제로 해야 할 행동 2"
  ],
  "difficult_words": [
    {{"word": "어려운단어", "explanation": "쉬운 풀이"}}
  ]
}}

[문서 유형별 key_points 작성 기준]
- 임대차계약서: 보증금·월세 금액, 임대기간, 계약 해지 조건, 수리 책임, 묵시적 갱신
- 근로계약서: 임금·지급일, 근로시간·휴게, 연차·휴가, 해고 조건, 퇴직금
- 기타계약서: 계약 금액, 납품·이행 기한, 위약금, 해제 조건
- 공문서: 요구 사항, 제출 기한, 필요 서류, 담당 부서 연락처
- 의료안내문: 시술·치료 내용, 부작용·주의사항, 동의 범위, 비용
- 약관: 이용자 권리·제한, 해지·환불 조건, 개인정보 처리, 분쟁 해결
- 법령·규정: 적용 대상, 의무 사항, 금지 행위, 위반 시 제재
- 기타: 문서의 핵심 내용 위주

주의사항:
- 반드시 유효한 JSON만 출력 (앞뒤 설명 텍스트 없이)
- 원문의 내용과 의미를 정확히 유지
- 참고 법령이 제공된 경우 이를 활용해 더 정확한 해설 작성
- key_points는 최대 6개, 가장 중요한 것만
- action_items는 실제로 사용자가 해야 할 행동만, 최대 8개
- difficult_words는 문서에서 어려운 단어 최대 10개"""

_RAG_SECTION = """
[참고 법령 — 아래 조문을 바탕으로 정확한 해설을 작성하세요]
{rag_context}

"""


_DETAIL_INSTRUCTIONS = {
    'brief':    '- simplified는 3~5문장으로 핵심만 간결하게 요약\n- key_points 최대 3개\n- action_items 최대 3개',
    'normal':   '- key_points 최대 6개\n- action_items 최대 8개',
    'detailed': '- simplified는 원문 내용을 빠짐없이 모두 포함하여 문단별로 자세히 설명\n- key_points 최대 8개\n- action_items 최대 10개',
}


def build_analyze_prompt(document: str, rag_context: str = '', detail_level: str = 'normal') -> str:
    rag_section  = _RAG_SECTION.format(rag_context=rag_context) if rag_context else '\n'
    detail_note  = _DETAIL_INSTRUCTIONS.get(detail_level, _DETAIL_INSTRUCTIONS['normal'])
    base = _ANALYZE_BASE.replace(
        '- key_points는 최대 6개, 가장 중요한 것만\n- action_items는 실제로 사용자가 해야 할 행동만, 최대 8개',
        detail_note
    )
    return base.format(document=document, rag_section=rag_section)


# 단순 호환용 (rag 없이 호출할 때)
ANALYZE_PROMPT = _ANALYZE_BASE.replace('{rag_section}', '\n')

CHAT_SYSTEM = """당신은 아래 문서를 완전히 이해한 전문 상담사입니다.
사용자가 이 문서에 관해 질문하면 쉽고 친절하게 답변해주세요.
장애인과 고령자도 이해할 수 있도록 짧고 쉬운 문장으로 설명하세요.
문서에 없는 내용은 "이 문서에서는 확인할 수 없습니다"라고 정직하게 답하세요.
추측이나 일반 법률 지식으로 보완할 경우 반드시 "문서 외 일반 정보"임을 밝히세요.

[분석 대상 문서]
{document}"""

EXPLAIN_PROMPT = """다음 단어를 장애인과 고령자도 이해할 수 있도록 쉽게 설명해주세요.

단어: {word}
문맥: {context}

응답 형식 (반드시 이 JSON 형식만 출력):
{{
  "word": "{word}",
  "explanation": "쉽고 간단한 풀이 (2-3문장 이내)",
  "example": "일상생활에서 이해하기 쉬운 예시"
}}"""
