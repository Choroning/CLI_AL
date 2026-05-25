"""Orchestration for the /rewrite endpoint.

Single-call rewrite (extracts terms + rewrites + key info + checklist all at
once via the rewrite_v1 prompt) followed by a Groundedness Check on the
original-vs-rewrite pair.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.models.schemas import (
    ChecklistItem,
    GlossaryTerm,
    GroundednessResult,
    KeyInfoItem,
    RewriteResponse,
)
from app.services.algorithms import (
    bfs_related_terms,
    build_term_graph,
    counting_sort_checklist,
    dedup_glossary,
    lcs_word_ratio,
    merge_sort_glossary,
)
from app.services.cache_service import HashTableCache
from app.services.prompt_loader import load_prompt
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)

# CLRS 11.2 / 11.3.1 — hash table with chaining, division method
_cache = HashTableCache(table_size=256, max_entries=128, ttl_seconds=3600.0)


def _label_to_badge(label: str, threshold: float) -> str:
    """Map Groundedness label (+ optional score) to UI badge level."""
    if label == "grounded":
        return "high"
    if label == "notSure":
        return "medium"
    return "low"


def _safe_list(raw: Any, key: str) -> list[Any]:
    val = raw.get(key) if isinstance(raw, dict) else None
    return val if isinstance(val, list) else []


_SUMMARY_SYSTEM = (
    "다음 문장을 30자 안팎 한 문장으로 요약하세요. "
    "핵심 의무·기한·금액을 우선 살리고, 인용 마커([1] 등)와 따옴표·괄호 메모는 빼세요. "
    "결과는 한 문장만, 추가 설명 없이 본문 텍스트만 출력하세요."
)


def _generate_summary(rewrite_text: str) -> str | None:
    """chat_text 보조 호출 — 본문을 한 줄로 요약. 실패 시 None."""
    text = rewrite_text.strip()
    if not text:
        return None
    try:
        upstage = get_upstage()
        out = upstage.chat_text(system=_SUMMARY_SYSTEM, user=text, temperature=0.2)
        # 첫 줄만, 좌우 공백/따옴표 제거, 60자 캡 (UI safety)
        first = out.strip().splitlines()[0] if out.strip() else ""
        first = first.strip().strip('"').strip("'")
        return first[:60] if first else None
    except Exception as e:  # noqa: BLE001 — 요약 실패는 결과 차단 사유 아님
        logger.warning("summary generation failed: %s", e)
        return None


def run_rewrite(text: str) -> RewriteResponse:
    cached = _cache.get(text)
    if cached is not None:
        return cached

    settings = get_settings()
    upstage = get_upstage()

    system = load_prompt("rewrite_v1")
    raw = upstage.chat_json(system=system, user=text)

    rewrite_text = raw.get("rewrite", "") if isinstance(raw, dict) else ""
    citations = [str(c) for c in _safe_list(raw, "citations")]

    glossary: list[GlossaryTerm] = []
    for g in _safe_list(raw, "glossary"):
        if not isinstance(g, dict):
            continue
        term = g.get("term")
        definition = g.get("definition")
        if not term or not definition:
            continue
        glossary.append(
            GlossaryTerm(term=str(term), definition=str(definition), example=g.get("example"))
        )
    # Ch. 11.2 — remove duplicates via hash table chaining, then Ch. 2.3 — merge sort
    glossary = merge_sort_glossary(dedup_glossary(glossary))

    key_info: list[KeyInfoItem] = []
    for k in _safe_list(raw, "key_info"):
        if not isinstance(k, dict):
            continue
        kt = k.get("type")
        content = k.get("content")
        if kt not in {"의무", "권리", "기한", "금액", "연락처"} or not content:
            continue
        key_info.append(
            KeyInfoItem(
                type=kt,  # type: ignore[arg-type]
                content=str(content),
                deadline=k.get("deadline"),
                amount=k.get("amount"),
                contact=k.get("contact"),
            )
        )

    checklist: list[ChecklistItem] = []
    for c in _safe_list(raw, "checklist"):
        if not isinstance(c, dict):
            continue
        ct = c.get("text")
        if not ct:
            continue
        priority = c.get("priority")
        if priority not in {"high", "medium", "low"}:
            priority = "medium"
        checklist.append(ChecklistItem(text=str(ct), priority=priority))
    # Ch. 8.2 — stable sort high → medium → low in Θ(n + k)
    checklist = counting_sort_checklist(checklist)

    # Ch. 15.4 — word-level LCS preservation ratio (original vs rewrite)
    preservation_ratio = lcs_word_ratio(text, rewrite_text)
    logger.info("LCS preservation_ratio=%.4f", preservation_ratio)

    # Ch. 22.1 + 22.2 — build term dependency graph, BFS-attach related_terms
    term_graph = build_term_graph(glossary)
    for gt in glossary:
        gt.related_terms = bfs_related_terms(term_graph, gt.term)

    # Groundedness Check on the rewrite vs original
    try:
        gnd = upstage.groundedness_check(context=text, answer=rewrite_text)
        label = gnd["label"]
    except Exception as e:  # noqa: BLE001 — surface as low-confidence, never crash
        logger.warning("Groundedness check failed: %s", e)
        label = "notSure"

    badge = _label_to_badge(label, settings.groundedness_threshold)
    groundedness = GroundednessResult(label=label, score=None, badge=badge)  # type: ignore[arg-type]

    # 보조 호출 — 한 줄 요약. 실패해도 결과 자체는 그대로 반환.
    summary = _generate_summary(rewrite_text)

    result = RewriteResponse(
        rewrite=rewrite_text,
        citations=citations,
        glossary=glossary,
        key_info=key_info,
        checklist=checklist,
        groundedness=groundedness,
        preservation_ratio=preservation_ratio,
        summary=summary,
    )
    _cache.put(text, result)
    return result
