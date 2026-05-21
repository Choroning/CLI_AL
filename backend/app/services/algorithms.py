"""CLRS-based algorithm implementations used in the rewrite pipeline.

Algorithm → CLRS reference:
  HashTableChaining       Ch. 11.2  Chaining
  dedup_glossary          Ch. 11.2  uses HashTableChaining
  merge_sort_glossary     Ch. 2.3   Merge Sort
  counting_sort_checklist Ch. 8.2   Counting Sort
  lcs_word_ratio          Ch. 15.4  Longest Common Subsequence
  build_term_graph        Ch. 22.1  Adjacency-list representation
  bfs_related_terms       Ch. 22.2  Breadth-First Search
"""

from __future__ import annotations

from collections import deque

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