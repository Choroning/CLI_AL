"""Global singleton RagStore instance.

Import get_store() wherever a shared store is needed.
The store accumulates chunks across requests — each rewrite call indexes
the input text so future requests can retrieve related context.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from app.rag.db import RagStore

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).resolve().parents[4] / "llm" / "corpus" / "rag_seed.jsonl"

_store: RagStore | None = None


def _load_seed(store: RagStore) -> None:
    """법제처 정비 사례 seed 파일을 RagStore에 로드한다.

    임베딩 없이 추가하므로 키워드(LCS) 검색만 활성화된다.
    벡터 검색은 이후 요청에서 index_text()가 쌓인 청크에 대해 활성화된다.
    """
    if not _SEED_PATH.exists():
        logger.warning("RAG seed file not found: %s", _SEED_PATH)
        return
    count = 0
    with _SEED_PATH.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            store.add(
                entry["text"],
                embedding=None,
                metadata={"source": entry.get("source", ""), "type": entry.get("type", "")},
            )
            count += 1
    logger.info("RAG seed loaded: %d chunks (keyword-only)", count)


def get_store() -> RagStore:
    global _store
    if _store is None:
        _store = RagStore()
        _load_seed(_store)
    return _store
