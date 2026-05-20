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
from app.services.prompt_loader import load_prompt
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)


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


def run_rewrite(text: str) -> RewriteResponse:
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

    # Groundedness Check on the rewrite vs original
    try:
        gnd = upstage.groundedness_check(context=text, answer=rewrite_text)
        label = gnd["label"]
    except Exception as e:  # noqa: BLE001 — surface as low-confidence, never crash
        logger.warning("Groundedness check failed: %s", e)
        label = "notSure"

    badge = _label_to_badge(label, settings.groundedness_threshold)
    groundedness = GroundednessResult(label=label, score=None, badge=badge)  # type: ignore[arg-type]

    return RewriteResponse(
        rewrite=rewrite_text,
        citations=citations,
        glossary=glossary,
        key_info=key_info,
        checklist=checklist,
        groundedness=groundedness,
    )
