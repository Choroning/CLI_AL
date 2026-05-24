"""Hash table cache — CLRS 11장 Hash Tables with Chaining.

Structure:
  _table[slot]  : list[_CacheEntry]  — chaining (CLRS 11.2)
  slot          : int(sha256_hex, 16) % table_size  — division method (CLRS 11.3.1)
  eviction      : LRU when entry count reaches max_entries
  expiry        : TTL-based per entry via monotonic timestamp
"""

from __future__ import annotations

import hashlib
import logging
import threading
import time
from dataclasses import dataclass

from app.models.schemas import RewriteResponse

logger = logging.getLogger(__name__)


@dataclass
class _CacheEntry:
    key: str              # full SHA-256 hex — used for exact match inside chain
    value: RewriteResponse
    created_at: float     # time.monotonic() snapshot


class HashTableCache:
    """Hash table with chaining (CLRS 11.2) + LRU eviction + TTL expiry.

    Slot selection uses the division method (CLRS 11.3.1):
        slot = int(sha256(text), 16)  mod  table_size
    SHA-256 distributes keys uniformly so the division method is effective
    even with non-prime table_size values.

    Collision resolution: each slot holds a Python list used as a linked chain.
    Search, insert, delete are O(1) expected under simple uniform hashing
    (CLRS Theorem 11.2).

    Eviction: when size reaches max_entries the least-recently-used entry is
    removed before each new insertion.  _order (head = LRU, tail = MRU) tracks
    access recency.
    """

    def __init__(
        self,
        table_size: int = 256,
        max_entries: int = 128,
        ttl_seconds: float = 3600.0,
    ) -> None:
        self._m = table_size
        self._max = max_entries
        self._ttl = ttl_seconds
        self._table: list[list[_CacheEntry]] = [[] for _ in range(self._m)]
        self._order: list[str] = []   # LRU list: index 0 = LRU, -1 = MRU
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _digest(text: str) -> str:
        """Normalise then SHA-256 hash the input text."""
        normalised = text.strip().lower().encode()
        return hashlib.sha256(normalised).hexdigest()

    def _slot(self, digest: str) -> int:
        """Division method h(k) = k mod m  (CLRS 11.3.1)."""
        return int(digest, 16) % self._m

    def _expired(self, entry: _CacheEntry) -> bool:
        return (time.monotonic() - entry.created_at) > self._ttl

    def _touch(self, key: str) -> None:
        """Promote key to MRU position (tail of _order)."""
        try:
            self._order.remove(key)
        except ValueError:
            pass
        self._order.append(key)

    def _evict_lru(self) -> None:
        """Delete the LRU entry from both the chain and _order."""
        if not self._order:
            return
        lru_key = self._order.pop(0)
        slot = self._slot(lru_key)
        self._table[slot] = [e for e in self._table[slot] if e.key != lru_key]
        logger.debug("Cache EVICT key=%.12s…", lru_key)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, text: str) -> RewriteResponse | None:
        """Return cached response for *text*, or None on miss / expiry."""
        digest = self._digest(text)
        slot = self._slot(digest)
        with self._lock:
            chain = self._table[slot]
            for i, entry in enumerate(chain):
                if entry.key != digest:
                    continue
                if self._expired(entry):
                    chain.pop(i)
                    try:
                        self._order.remove(digest)
                    except ValueError:
                        pass
                    self._misses += 1
                    logger.info("Cache EXPIRED slot=%d key=%.12s…", slot, digest)
                    return None
                self._touch(digest)
                self._hits += 1
                logger.info("Cache HIT  slot=%d key=%.12s…", slot, digest)
                return entry.value
            self._misses += 1
            return None

    def put(self, text: str, value: RewriteResponse) -> None:
        """Insert or update the cache entry for *text*."""
        digest = self._digest(text)
        slot = self._slot(digest)
        with self._lock:
            chain = self._table[slot]
            for i, entry in enumerate(chain):
                if entry.key == digest:
                    chain[i] = _CacheEntry(key=digest, value=value, created_at=time.monotonic())
                    self._touch(digest)
                    return
            while len(self._order) >= self._max:
                self._evict_lru()
            chain.append(_CacheEntry(key=digest, value=value, created_at=time.monotonic()))
            self._order.append(digest)
            logger.info("Cache PUT  slot=%d key=%.12s… size=%d", slot, digest, len(self._order))

    def stats(self) -> dict[str, object]:
        """Return hit/miss counters and current occupancy."""
        with self._lock:
            total = self._hits + self._misses
            return {
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total, 4) if total else 0.0,
                "size": len(self._order),
                "capacity": self._max,
                "table_size": self._m,
                "ttl_seconds": self._ttl,
            }