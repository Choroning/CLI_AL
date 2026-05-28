"""Tiny in-memory IP-based rate limiter.

Sufficient for a single-process local dev / single-instance MVP. Replace with
Redis-backed limiter (e.g. slowapi) when running multi-instance.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

from app.config import get_settings


class RateLimiter:
    def __init__(self, *, times: int, seconds: int) -> None:
        self._times = times
        self._window = seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def __call__(self, request: Request) -> None:
        if get_settings().disable_rate_limit:
            return
        ip = self._client_ip(request)
        key = f"{ip}:{request.url.path}"
        now = time.monotonic()
        cutoff = now - self._window
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self._times:
                retry_after = max(1, int(self._window - (now - q[0])))
                raise HTTPException(
                    status_code=429,
                    detail=f"요청이 너무 잦습니다. {retry_after}초 후 다시 시도해주세요.",
                    headers={"Retry-After": str(retry_after)},
                )
            q.append(now)

    @staticmethod
    def _client_ip(request: Request) -> str:
        # Trust X-Forwarded-For only if explicitly behind a known proxy. For
        # local dev, client.host is fine.
        if request.client is None:
            return "unknown"
        return request.client.host
