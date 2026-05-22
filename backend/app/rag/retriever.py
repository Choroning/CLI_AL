"""Hybrid RAG retriever.

Two independent searches, each returning top-N results:

  vector_search   — cosine similarity + QuickSelect (CLRS 9.2)
                    Isolates top-N without a full sort; O(n) average.

  keyword_search  — word-level LCS ratio + LSD Radix Sort (CLRS 8.3)
                    Scores every chunk with lcs_word_ratio, then sorts
                    in Θ(d·n) time and slices the top-N.

  hybrid_search   — runs both; returns the deduplicated union of their
                    top-N result sets.
"""

from __future__ import annotations

import logging
import math

from app.rag.db import Chunk, RagStore
from app.services.algorithms import lcs_word_ratio, radix_sort_by_score_desc, top_n_by_score
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cosine similarity (pure Python — no external deps)
# ---------------------------------------------------------------------------

def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


# ---------------------------------------------------------------------------
# Vector search — CLRS 9.2 Selection Problem
# ---------------------------------------------------------------------------

def vector_search(
    query_embedding: list[float],
    store: RagStore,
    n: int,
) -> list[tuple[Chunk, float]]:
    """Return top-N chunks by cosine similarity.

    Uses QuickSelect (CLRS 9.2) to isolate the top-N scored pairs in O(k)
    average time instead of sorting all k candidates.
    Only chunks that have been indexed with an embedding are considered.
    """
    candidates = [c for c in store.all_chunks() if c.embedding is not None]
    if not candidates:
        return []
    scored = [(c, _cosine(query_embedding, c.embedding)) for c in candidates]  # type: ignore[arg-type]
    return top_n_by_score(scored, n, key_fn=lambda x: x[1])


# ---------------------------------------------------------------------------
# Keyword search — LCS similarity + CLRS 8.3 Radix Sort
# ---------------------------------------------------------------------------

def keyword_search(
    query: str,
    store: RagStore,
    n: int,
) -> list[tuple[Chunk, float]]:
    """Return top-N chunks by word-level LCS similarity ratio.

    Scores every chunk with lcs_word_ratio (CLRS 15.4), then sorts all
    (chunk, score) pairs via LSD Radix Sort (CLRS 8.3) in Θ(d·k) time
    and slices the first N entries.
    """
    chunks = store.all_chunks()
    if not chunks:
        return []
    scored = [(c, lcs_word_ratio(query, c.text)) for c in chunks]
    sorted_scored = radix_sort_by_score_desc(scored)
    return sorted_scored[:n]


# ---------------------------------------------------------------------------
# Hybrid search — union of both top-N result sets
# ---------------------------------------------------------------------------

def hybrid_search(
    query: str,
    store: RagStore,
    n: int = 5,
) -> list[tuple[Chunk, float]]:
    """Run vector search and keyword search, each returning top-N results.

    Returns the deduplicated union (by chunk id) in the order:
    vector results first, then keyword-only results.

    If the embedding API is unavailable the function degrades gracefully
    to keyword-only search.
    """
    if len(store) == 0:
        return []

    # --- vector search ---
    vec_results: list[tuple[Chunk, float]] = []
    try:
        query_emb = get_upstage().embed(query)
        vec_results = vector_search(query_emb, store, n)
    except Exception as e:  # noqa: BLE001
        logger.warning("vector_search skipped (embed failed): %s", e)

    # --- keyword search ---
    kw_results = keyword_search(query, store, n)

    # --- merge, deduplicate by chunk id ---
    seen: set[str] = set()
    merged: list[tuple[Chunk, float]] = []
    for chunk, score in vec_results + kw_results:
        if chunk.id not in seen:
            seen.add(chunk.id)
            merged.append((chunk, score))

    return merged
