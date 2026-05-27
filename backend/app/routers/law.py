from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.schemas import LawSearchResponse
from app.services.law_client import get_law_client
from app.services.rate_limit import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/law", tags=["law"])

_law_limit = RateLimiter(times=20, seconds=60)


@router.get("/term", response_model=LawSearchResponse, dependencies=[Depends(_law_limit)])
def search_law_term(
    q: str = Query(min_length=1, max_length=100, description="검색할 법령 용어"),
    display: int = Query(default=10, ge=1, le=30, description="반환할 최대 결과 수"),
) -> LawSearchResponse:
    """국가법령정보센터에서 법령 용어를 검색한다."""
    client = get_law_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="법령 API가 설정되지 않았습니다. LAW_API_KEY를 확인하세요.",
        )

    results, total = client.search_term(query=q, display=display)
    return LawSearchResponse(query=q, total=total, results=results)
