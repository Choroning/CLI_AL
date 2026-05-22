"""In-memory RAG document store.

Each indexed piece of text is stored as a Chunk with an optional embedding
vector.  RagStore is intentionally simple — no persistence — so it can be
populated at startup from any corpus source (file, Supabase, etc.).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field


@dataclass
class Chunk:
    id: str
    text: str
    embedding: list[float] | None = None
    metadata: dict = field(default_factory=dict)


class RagStore:
    """In-memory store for Chunk objects."""

    def __init__(self) -> None:
        self._chunks: list[Chunk] = []

    def add(
        self,
        text: str,
        *,
        embedding: list[float] | None = None,
        metadata: dict | None = None,
    ) -> Chunk:
        """Add a text chunk and return the stored Chunk."""
        chunk = Chunk(
            id=str(uuid.uuid4()),
            text=text,
            embedding=embedding,
            metadata=metadata or {},
        )
        self._chunks.append(chunk)
        return chunk

    def all_chunks(self) -> list[Chunk]:
        return list(self._chunks)

    def __len__(self) -> int:
        return len(self._chunks)
