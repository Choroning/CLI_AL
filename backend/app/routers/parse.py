from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.models.schemas import ParseResponse
from app.services.rate_limit import RateLimiter
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parse", tags=["parse"])

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME = {
    "application/pdf",
    "text/plain",
    # Some browsers send empty / generic types — accept those too.
    "application/octet-stream",
    "",
}

_parse_limit = RateLimiter(times=5, seconds=60)


@router.post("", response_model=ParseResponse, dependencies=[Depends(_parse_limit)])
async def post_parse(file: UploadFile = File(...)) -> ParseResponse:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"지원하지 않는 파일 형식입니다: {file.content_type}",
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413, detail="파일 크기는 최대 10MB까지 허용됩니다."
        )
    if not raw:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    # Plain text path: skip Document Parse entirely.
    name = (file.filename or "uploaded").lower()
    if name.endswith(".txt") or file.content_type == "text/plain":
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = raw.decode("cp949")
            except UnicodeDecodeError as e:
                raise HTTPException(
                    status_code=400,
                    detail="텍스트 인코딩을 인식하지 못했습니다 (UTF-8/CP949).",
                ) from e
        return ParseResponse(text=text.strip(), char_count=len(text.strip()))

    # PDF path: Upstage Document Parse.
    upstage = get_upstage()
    try:
        md = upstage.parse_document(
            filename=file.filename or "uploaded.pdf",
            content=raw,
            content_type=file.content_type or "application/pdf",
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("document parse failed")
        raise HTTPException(status_code=502, detail=f"문서 파싱 실패: {e}") from e

    return ParseResponse(text=md, char_count=len(md))
