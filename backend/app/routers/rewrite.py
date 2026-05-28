from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import RewriteRequest, RewriteResponse
from app.services.history_service import save_rewrite
from app.services.rate_limit import RateLimiter
from app.services.rewrite_service import run_rewrite

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rewrite", tags=["rewrite"])

_rewrite_limit = RateLimiter(times=10, seconds=60)


@router.post("", response_model=RewriteResponse, dependencies=[Depends(_rewrite_limit)])
def post_rewrite(req: RewriteRequest) -> RewriteResponse:
    try:
        result = run_rewrite(req.text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM 응답 형식 오류: {e}") from e
    except Exception as e:  # noqa: BLE001
        logger.exception("rewrite failed")
        raise HTTPException(status_code=500, detail=f"재작성 실패: {e}") from e

    if req.save_history:
        doc_id = save_rewrite(req.text, result)
        if doc_id:
            result = result.model_copy(update={"document_id": doc_id})
    return result
