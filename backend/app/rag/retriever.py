"""Hybrid RAG retriever with combined-score filtering.

Score formula
-------------
Each candidate chunk is scored using **both** vector (cosine) and keyword
(LCS) signals. The combined score has three terms:

    v_norm   = (cosine_similarity + 1) / 2      # normalise [-1, 1] → [0, 1]
    base     = VEC_WEIGHT * v_norm
               + LCS_WEIGHT * lcs_score         # weighted sum of both signals
    penalty  = DIFF_PENALTY * |v_norm - lcs|    # penalise signal disagreement
    combined = max(0.0, base - penalty)

Intuition
---------
- A chunk that scores well on *both* signals gets a high combined score.
- A chunk that only looks good on one signal is penalised via the
  difference term: if v_norm and lcs_score diverge by 0.5, the score is
  reduced by DIFF_PENALTY * 0.5 = 0.10.
- Chunks whose combined score falls below MIN_RELEVANCE_SCORE are excluded
  even if they would appear in the top-N by either individual metric alone.

Fallback
--------
If the embedding API is unavailable a chunk has no vector score; its
combined score degrades to the raw lcs_score (keyword-only mode).

Individual search functions (vector_search, keyword_search) are kept intact
so they can be called independently; hybrid_search now drives them with
k = len(store) to collect full score maps before combining.
"""

from __future__ import annotations

import logging
import math

from app.rag.db import Chunk, RagStore
from app.services.algorithms import lcs_word_ratio, radix_sort_by_score_desc, top_n_by_score
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scoring hyper-parameters
# ---------------------------------------------------------------------------

_VEC_WEIGHT: float = 0.7      # weight for normalised cosine similarity
_LCS_WEIGHT: float = 0.3      # weight for LCS word-ratio score
_DIFF_PENALTY: float = 0.2    # coefficient applied to |v_norm - lcs|

# Chunks with combined_score < this threshold are dropped from results.
MIN_RELEVANCE_SCORE: float = 0.50


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
# Combined score
# ---------------------------------------------------------------------------

def _combined_score(vector_score: float, lcs_score: float) -> float:
    """Return a combined relevance score in [0, 1].

    Parameters
    ----------
    vector_score:
        Raw cosine similarity in [-1, 1].
    lcs_score:
        Word-level LCS ratio in [0, 1].

    Returns
    -------
    float
        Combined score in [0, 1]. Uses the *difference* between the two
        normalised values as a disagreement penalty so that chunks strongly
        backed by only one signal rank lower than those supported by both.
    """
    v_norm = (vector_score + 1.0) / 2.0           # [-1, 1] → [0, 1]
    base = _VEC_WEIGHT * v_norm + _LCS_WEIGHT * lcs_score
    penalty = _DIFF_PENALTY * abs(v_norm - lcs_score)
    return max(0.0, base - penalty)


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
# Hybrid search — combined score + threshold filter
# ---------------------------------------------------------------------------

def hybrid_search(
    query: str,
    store: RagStore,
    n: int = 5,
    min_score: float = MIN_RELEVANCE_SCORE,
) -> list[tuple[Chunk, float]]:
    """Return up to N chunks whose combined score meets the relevance threshold.

    Algorithm
    ---------
    1. Run vector_search and keyword_search over ALL chunks (k = len(store))
       to build complete score maps for every chunk.
    2. For each chunk, compute _combined_score(v_norm, lcs) using the
       difference of the two signals as a disagreement penalty.
    3. Drop any chunk whose combined_score < min_score.
    4. Sort survivors by combined_score descending (radix_sort_by_score_desc).
    5. Return the top-N survivors.

    Graceful degradation
    --------------------
    - If the embedding API fails, chunks without a vector score fall back to
      their raw lcs_score (keyword-only combined score).
    - Returns [] when the store is empty or no chunk clears the threshold.

    Parameters
    ----------
    query:     The query string (original document text).
    store:     The RagStore to search.
    n:         Maximum number of results to return.
    min_score: Minimum combined score; chunks below this are excluded.
    """
    if len(store) == 0:
        return []

    k = len(store)  # fetch all so we have scores for every chunk

    # ── 1. Build vector score map ──────────────────────────────────────────
    vec_map: dict[str, float] = {}
    try:
        query_emb = get_upstage().embed(query)
        for chunk, score in vector_search(query_emb, store, k):
            vec_map[chunk.id] = score
        logger.debug("vector_search scored %d chunks", len(vec_map))
    except Exception as e:  # noqa: BLE001
        logger.warning("vector_search skipped (embed failed) — keyword-only mode: %s", e)

    # ── 2. Build LCS score map ─────────────────────────────────────────────
    lcs_map: dict[str, float] = {
        chunk.id: score
        for chunk, score in keyword_search(query, store, k)
    }

    # ── 3. Compute combined scores and apply threshold ─────────────────────
    scored: list[tuple[Chunk, float]] = []
    for chunk in store.all_chunks():
        lcs = lcs_map.get(chunk.id, 0.0)

        if chunk.id in vec_map:
            combined = _combined_score(vec_map[chunk.id], lcs)
        else:
            # No embedding → keyword-only fallback
            combined = lcs

        if combined >= min_score:
            scored.append((chunk, combined))

    if not scored:
        logger.info(
            "hybrid_search: no chunks cleared min_score=%.2f "
            "(store_size=%d, vec_available=%d)",
            min_score, len(store), len(vec_map),
        )
        return []

    # ── 4. Sort by combined score descending, return top-N ────────────────
    sorted_results = radix_sort_by_score_desc(scored)
    top = sorted_results[:n]

    logger.info(
        "hybrid_search: %d/%d chunks cleared threshold=%.2f; "
        "returning top-%d (scores: %s)",
        len(scored), len(store), min_score, len(top),
        [f"{s:.3f}" for _, s in top],
    )
    return top
