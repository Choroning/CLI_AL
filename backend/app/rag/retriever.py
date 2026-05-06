from dataclasses import dataclass

from app.models import SelectionRequest


@dataclass(frozen=True)
class RagChunk:
    id: str
    title: str
    content: str
    source_type: str
    keywords: tuple[str, ...]


KNOWLEDGE_BASE = [
    RagChunk(
        id="term-income-recognition",
        title="소득인정액",
        content="소득인정액은 복지 급여 대상자를 정할 때 소득과 재산을 일정한 방식으로 계산한 금액이다.",
        source_type="term",
        keywords=("소득인정액", "소득", "재산", "급여", "기초연금"),
    ),
    RagChunk(
        id="term-selection-threshold",
        title="선정기준액",
        content="선정기준액은 지원을 받을 수 있는지 정하기 위해 정부가 정한 기준 금액이다.",
        source_type="term",
        keywords=("선정기준액", "기준", "지원", "대상"),
    ),
    RagChunk(
        id="term-reclaim",
        title="환수",
        content="환수는 잘못 지급된 돈이나 물건을 다시 거두어들이는 것을 뜻한다.",
        source_type="term",
        keywords=("환수", "부정", "거짓", "급여"),
    ),
    RagChunk(
        id="guide-short-sentences",
        title="쉬운 문장 작성 지침",
        content="한 문장에는 한 가지 내용만 담고, 긴 문장은 1~3개의 짧은 문장으로 나누어 쓴다.",
        source_type="guide",
        keywords=("문장", "쉽게", "짧게", "요약", "작성"),
    ),
    RagChunk(
        id="guide-preserve-conditions",
        title="조건 보존 지침",
        content="날짜, 금액, 신청 자격, 제출 서류, 법적 조건은 쉬운말 변환 과정에서 삭제하거나 바꾸면 안 된다.",
        source_type="guide",
        keywords=("날짜", "금액", "자격", "서류", "조건", "제출"),
    ),
]


def retrieve_context(request: SelectionRequest, top_k: int = 4) -> list[RagChunk]:
    query = f"{request.selectedText} {request.surroundingContext}".lower()
    scored: list[tuple[int, RagChunk]] = []

    for chunk in KNOWLEDGE_BASE:
        score = 0
        for keyword in chunk.keywords:
            if keyword.lower() in query:
                score += 3
        if chunk.source_type == "term" and request.selectionType == "word":
            score += 1
        if chunk.source_type == "guide" and request.selectionType in {"sentence", "phrase"}:
            score += 1
        if chunk.source_type == "guide" and request.mode == "summarize":
            score += 1

        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
