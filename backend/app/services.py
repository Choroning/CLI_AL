import json

from app.llm import get_llm_provider
from app.models import SelectionRequest, SelectionResponse, SimplifyRequest, SimplifyResponse, TermExplanation
from app.prompts import build_selection_messages
from app.rag import retrieve_context


async def simplify_selection(request: SelectionRequest) -> SelectionResponse:
    chunks = retrieve_context(request)
    messages = build_selection_messages(request, chunks)
    llm = get_llm_provider()
    response = await llm.generate(messages)
    payload = _parse_json_response(response.content)

    citations = payload.get("citations") or [chunk.id for chunk in chunks]
    warnings = list(payload.get("warnings") or [])

    if len(request.selectedText.strip()) <= 1:
        warnings.append("선택한 글이 짧아 전체 원문에서 관련 표현을 함께 확인했습니다.")

    related_terms = [
        TermExplanation(**term)
        for term in payload.get("relatedTerms", [])
        if isinstance(term, dict) and term.get("term") and term.get("meaning")
    ]

    return SelectionResponse(
        resultText=str(payload.get("resultText") or request.selectedText),
        explanation=str(payload.get("explanation") or ""),
        plainMeaning=str(payload.get("plainMeaning") or ""),
        whyChanged=str(payload.get("whyChanged") or ""),
        terms=related_terms,
        relatedTerms=related_terms,
        citations=citations,
        warnings=warnings,
    )


async def summarize_document(request: SimplifyRequest) -> SimplifyResponse:
    sentences = _split_sentences(request.documentText)
    summary = " ".join(sentences[:3]) if sentences else request.documentText[:240]

    if len(summary) > 260:
        summary = summary[:257].rstrip() + "..."

    return SimplifyResponse(
        simplifiedText=request.documentText,
        summary=summary or "요약할 원문이 없습니다.",
        terms=[],
        citations=[],
        warnings=["MVP 요약입니다. NVIDIA NIM Provider 기반 전체 요약 프롬프트로 확장할 수 있습니다."],
    )


def _parse_json_response(content: str) -> dict:
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            return json.loads(content[start : end + 1])
        raise


def _split_sentences(text: str) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []

    sentences: list[str] = []
    current: list[str] = []
    for char in normalized:
        current.append(char)
        if char in ".!?。！？":
            sentence = "".join(current).strip()
            if sentence:
                sentences.append(sentence)
            current = []

    tail = "".join(current).strip()
    if tail:
        sentences.append(tail)
    return sentences
