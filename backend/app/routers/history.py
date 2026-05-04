from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.schemas import HistoryResponse
from app.services.history_service import list_history

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryResponse)
def get_history(limit: int = Query(default=20, ge=1, le=100)) -> HistoryResponse:
    return list_history(limit=limit)
