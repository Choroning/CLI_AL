"""Text chunking and RAG indexing utilities.

Splits input text into paragraph-level chunks (≤ 800 chars), embeds each
chunk with the passage model, and adds them to a RagStore.

Chunk splitting strategy
------------------------
1. Split on blank lines (\\n\\n) → paragraph-level chunks.
2. If a paragraph exceeds _MAX_CHUNK_CHARS, split further at sentence
   boundaries (period / question / exclamation followed by whitespace).
3. Chunks shorter than _MIN_CHUNK_CHARS are silently dropped.

format_rag_context()
--------------------
Converts a list of (Chunk, score) tuples (from hybrid_search) into a
single string suitable for injection into the LLM user message.
"""

from __future__ import annotations

import logging
import re

from app.rag.db import Chunk, RagStore
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)

_MAX_CHUNK_CHARS = 800
_MIN_CHUNK_CHARS = 50


# ---------------------------------------------------------------------------
# Splitting helpers
# ---------------------------------------------------------------------------

def _split_at_sentences(text: str) -> list[str]:
    """Split a long paragraph at sentence boundaries into ≤ _MAX_CHUNK_CHARS pieces."""
    sentences = re.split(r"(?<=[.?!])\s+", text)
    chunks: list[str] = []
    current = ""
    for sent in sentences:
        candidate = (current + " " + sent).strip() if current else sent
        if len(candidate) <= _MAX_CHUNK_CHARS:
            current = candidate
        else:
            if current:
                chunks.append(current)
            # A single sentence longer than the limit: keep as-is
            current = sent
    if current:
        chunks.append(current)
    return chunks


def _split_into_chunks(text: str) -> list[str]:
    """Split text into paragraph-level chunks, further splitting long paragraphs."""
    paragraphs = re.split(r"\n{2,}", text.strip())
    result: list[str] = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(para) <= _MAX_CHUNK_CHARS:
            result.append(para)
        else:
            result.extend(_split_at_sentences(para))
    return [c for c in result if len(c) >= _MIN_CHUNK_CHARS]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def index_text(text: str, store: RagStore) -> list[Chunk]:
    """Chunk *text*, embed each chunk with the passage model, and add to *store*.

    Embedding failures are non-fatal: chunks are still added without an
    embedding vector (keyword search still works for them).

    Returns the list of newly added Chunk objects.
    """
    chunk_texts = _split_into_chunks(text)
    added: list[Chunk] = []
    upstage = get_upstage()
    for chunk_text in chunk_texts:
        try:
            embedding = upstage.embed(chunk_text, passage=True)
        except Exception as e:  # noqa: BLE001
            logger.warning("embed failed for chunk (keyword-only fallback): %s", e)
            embedding = None
        chunk = store.add(chunk_text, embedding=embedding)
        added.append(chunk)
    logger.debug("index_text: added %d chunks to store (total=%d)", len(added), len(store))
    return added


def format_rag_context(results: list[tuple[Chunk, float]]) -> str:
    """Convert hybrid_search results to a plain-text context block.

    Returns an empty string when *results* is empty so callers can do a
    simple truthiness check before injecting into the prompt.
    """
    if not results:
        return ""
    return "\n---\n".join(chunk.text for chunk, _ in results)
