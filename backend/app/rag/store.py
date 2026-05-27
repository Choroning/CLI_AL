"""Global singleton RagStore instance.

Import get_store() wherever a shared store is needed.
The store accumulates chunks across requests — each rewrite call indexes
the input text so future requests can retrieve related context.
"""

from __future__ import annotations

from app.rag.db import RagStore

_store: RagStore | None = None


def get_store() -> RagStore:
    global _store
    if _store is None:
        _store = RagStore()
    return _store
