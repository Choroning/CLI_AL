"""CLRS-based algorithm implementations used in the rewrite pipeline.

Algorithm → CLRS reference:
  HashTableChaining       Ch. 11.2  Chaining
  dedup_glossary          Ch. 11.2  uses HashTableChaining
  merge_sort_glossary     Ch. 2.3   Merge Sort
  counting_sort_checklist Ch. 8.2   Counting Sort
  lcs_word_ratio          Ch. 15.4  Longest Common Subsequence
  build_term_graph        Ch. 22.1  Adjacency-list representation
  bfs_related_terms       Ch. 22.2  Breadth-First Search
  top_n_by_score          Ch. 9.2   Randomized Selection (QuickSelect)
  radix_sort_by_score_desc Ch. 8.3  LSD Radix Sort
"""

from __future__ import annotations

import random
from collections import deque
from typing import Any, TypeVar

_T = TypeVar("_T")

from app.models.schemas import ChecklistItem, GlossaryTerm


# ---------------------------------------------------------------------------
# CLRS 11.2 — Hash Table with Chaining
# ---------------------------------------------------------------------------

class _ChainNode:
    __slots__ = ("key", "value", "next")

    def __init__(self, key: str, value: object) -> None:
        self.key = key
        self.value = value
        self.next: _ChainNode | None = None


class HashTableChaining:
    """Fixed-capacity hash table that resolves collisions by chaining.

    Hash function: h(k) = (BASE * h + ord(c)) mod m  — polynomial rolling hash.
    Handles arbitrary Unicode (including Korean) via ord().
    """

    _BASE = 131  # prime base; works well for Unicode strings

    def __init__(self, capacity: int = 64) -> None:
        self._cap = capacity
        self._buckets: list[_ChainNode | None] = [None] * capacity
        self.size = 0

    # CLRS 11.3.3 division-method variant
    def _hash(self, key: str) -> int:
        h = 0
        for ch in key.lower():
            h = (h * self._BASE + ord(ch)) % self._cap
        return h

    def insert(self, key: str, value: object) -> bool:
        """Insert key. Returns True if new, False if key already present (duplicate)."""
        idx = self._hash(key)
        node = self._buckets[idx]
        while node is not None:
            if node.key == key:
                return False  # already in chain → duplicate
            node = node.next
        # Prepend to chain (O(1))
        new_node = _ChainNode(key, value)
        new_node.next = self._buckets[idx]
        self._buckets[idx] = new_node
        self.size += 1
        return True

    def contains(self, key: str) -> bool:
        idx = self._hash(key)
        node = self._buckets[idx]
        while node is not None:
            if node.key == key:
                return True
            node = node.next
        return False


def dedup_glossary(terms: list[GlossaryTerm]) -> list[GlossaryTerm]:
    """Remove duplicate glossary terms (by term string) using HashTableChaining."""
    table = HashTableChaining(capacity=max(64, len(terms) * 2))
    unique: list[GlossaryTerm] = []
    for t in terms:
        if table.insert(t.term, t):
            unique.append(t)
    return unique


# ---------------------------------------------------------------------------
# CLRS 2.3 — Merge Sort  (glossary alphabetical order)
# ---------------------------------------------------------------------------

def _merge_terms(
    left: list[GlossaryTerm], right: list[GlossaryTerm]
) -> list[GlossaryTerm]:
    result: list[GlossaryTerm] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i].term.lower() <= right[j].term.lower():
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result


def merge_sort_glossary(terms: list[GlossaryTerm]) -> list[GlossaryTerm]:
    """Sort GlossaryTerm list alphabetically (case-insensitive) via merge sort.

    CLRS 2.3 — T(n) = 2T(n/2) + Θ(n)  →  Θ(n log n).
    Stable: equal terms preserve their original relative order.
    """
    if len(terms) <= 1:
        return list(terms)
    mid = len(terms) // 2
    left = merge_sort_glossary(terms[:mid])
    right = merge_sort_glossary(terms[mid:])
    return _merge_terms(left, right)


# ---------------------------------------------------------------------------
# CLRS 8.2 — Counting Sort  (checklist by priority)
# ---------------------------------------------------------------------------

_PRIORITY_RANK: dict[str, int] = {"high": 0, "medium": 1, "low": 2}


def counting_sort_checklist(items: list[ChecklistItem]) -> list[ChecklistItem]:
    """Sort ChecklistItem list high → medium → low via counting sort.

    CLRS 8.2 — k = 3 priority levels; runs in Θ(n + k) = Θ(n).
    Stable: items with the same priority keep their original order.
    """
    if not items:
        return []

    k = 3  # |{high, medium, low}|
    count = [0] * k
    for item in items:
        count[_PRIORITY_RANK[item.priority]] += 1

    # Cumulative count (CLRS 8.2, lines 6-7): count[i] = # items with priority <= i
    for i in range(1, k):
        count[i] += count[i - 1]

    output: list[ChecklistItem | None] = [None] * len(items)
    # Reverse iteration preserves stability (CLRS 8.2, lines 10-12)
    for item in reversed(items):
        rank = _PRIORITY_RANK[item.priority]
        count[rank] -= 1
        output[count[rank]] = item

    return [x for x in output if x is not None]  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# CLRS 15.4 — Longest Common Subsequence → preservation ratio
# ---------------------------------------------------------------------------

def lcs_word_ratio(original: str, rewrite: str) -> float:
    """Compute LCS length on word tokens, normalised to [0, 1].

    CLRS 15.4 recurrence:
        c[i,j] = c[i-1,j-1] + 1           if x_i == y_j
        c[i,j] = max(c[i-1,j], c[i,j-1]) otherwise

    Space-optimised to O(n) using two rolling rows instead of the full O(mn) table.
    Returns  LCS_length / max(|original_words|, |rewrite_words|).
    """
    a = original.split()
    b = rewrite.split()
    m, n = len(a), len(b)
    if m == 0 or n == 0:
        return 0.0

    prev = [0] * (n + 1)
    curr = [0] * (n + 1)
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev, curr = curr, [0] * (n + 1)

    lcs_len = prev[n]
    return round(lcs_len / max(m, n), 4)


# ---------------------------------------------------------------------------
# CLRS 22.1 + 22.2 — Adjacency-list graph + BFS  (glossary term relations)
# ---------------------------------------------------------------------------

def build_term_graph(terms: list[GlossaryTerm]) -> dict[str, list[str]]:
    """Build a directed adjacency list from glossary term definitions.

    Edge A → B exists when term B appears as a substring in A's definition,
    meaning understanding A requires knowing B first.
    Representation follows CLRS 22.1 (adjacency-list).
    """
    term_set = {t.term for t in terms}
    graph: dict[str, list[str]] = {t.term: [] for t in terms}
    for t in terms:
        definition_lower = t.definition.lower()
        for other in term_set:
            if other != t.term and other.lower() in definition_lower:
                graph[t.term].append(other)
    return graph


def bfs_related_terms(graph: dict[str, list[str]], start: str) -> list[str]:
    """BFS from *start*; return all reachable terms in discovery order.

    CLRS 22.2 colour scheme:
      white  — undiscovered
      gray   — discovered, in queue
      black  — fully processed (dequeued)

    Returns [] if start is not in graph or has no outgoing edges.
    """
    if start not in graph:
        return []

    visited: set[str] = {start}        # white → gray on first discovery
    queue: deque[str] = deque([start])
    related: list[str] = []

    while queue:
        u = queue.popleft()             # gray → black
        for v in graph.get(u, []):
            if v not in visited:        # white vertex
                visited.add(v)          # colour gray
                related.append(v)
                queue.append(v)

    return related


# ---------------------------------------------------------------------------
# CLRS 9.2 — Randomized Selection  (vector search top-N)
# ---------------------------------------------------------------------------

def _rand_partition(arr: list[Any], lo: int, hi: int, key_fn: Any) -> int:
    """Randomized partition (CLRS 7.3): pivot chosen uniformly at random."""
    i = random.randint(lo, hi)
    arr[i], arr[hi] = arr[hi], arr[i]
    pivot = key_fn(arr[hi])
    i = lo - 1
    for j in range(lo, hi):
        if key_fn(arr[j]) <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
    return i + 1


def _quickselect_kth(arr: list[Any], lo: int, hi: int, k: int, key_fn: Any) -> None:
    """Iterative RandomizedSelect: rearranges arr so arr[k] is the k-th smallest.

    CLRS 9.2 — O(n) expected time.
    """
    while lo < hi:
        q = _rand_partition(arr, lo, hi, key_fn)
        if q == k:
            return
        elif q < k:
            lo = q + 1
        else:
            hi = q - 1


def top_n_by_score(items: list[Any], n: int, key_fn: Any) -> list[Any]:
    """Return top-N items (highest key_fn value) using the Selection Problem.

    CLRS 9.2 RandomizedSelect — O(n) average, avoids a full sort.
    The returned list is sorted descending by key_fn.
    """
    if n <= 0:
        return []
    arr = list(items)
    m = len(arr)
    if n >= m:
        return sorted(arr, key=key_fn, reverse=True)
    # k = index of the (n-th largest) element when sorted ascending
    k = m - n
    _quickselect_kth(arr, 0, m - 1, k, key_fn)
    # arr[k:] are the top-N (unordered); sort only those N elements
    top = arr[k:]
    top.sort(key=key_fn, reverse=True)
    return top


# ---------------------------------------------------------------------------
# CLRS 8.3 — LSD Radix Sort  (keyword search top-N by LCS score)
# ---------------------------------------------------------------------------

def radix_sort_by_score_desc(
    scored: list[tuple[Any, float]],
    *,
    scale: int = 10_000,
) -> list[tuple[Any, float]]:
    """Sort (item, float_score) pairs by score descending via LSD Radix Sort.

    CLRS 8.3 — Θ(d * (n + b)) where d = digits, b = base (10).
    float scores in [0, 1] are scaled to non-negative integers [0, scale]
    so that standard LSD radix sort applies.
    Stable: equal scores keep their original relative order.
    """
    if not scored:
        return []

    # Build (item, original_float, int_key) triples
    keyed: list[tuple[Any, float, int]] = [
        (item, score, round(score * scale)) for item, score in scored
    ]
    max_key = max(k for _, _, k in keyed)

    BASE = 10
    exp = 1
    # One counting-sort pass per digit position (CLRS 8.3, lines 1-4)
    while exp <= max(max_key, 1):
        buckets: list[list[tuple[Any, float, int]]] = [[] for _ in range(BASE)]
        for entry in keyed:
            digit = (entry[2] // exp) % BASE
            buckets[digit].append(entry)
        # Flatten buckets back into keyed (stable, ascending so far)
        keyed = [e for bucket in buckets for e in bucket]
        exp *= BASE

    # keyed is now sorted ascending by int_key → reverse for descending
    keyed.reverse()
    return [(item, score) for item, score, _ in keyed]