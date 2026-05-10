from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.models.schemas import ParseResponse
from app.services.rate_limit import RateLimiter
from app.services.upstage_client import get_upstage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parse", tags=["parse"])

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

# MIME types we recognize directly. HWPX has no widely-agreed registered type
# (browsers commonly send "" or "application/octet-stream"), so the extension
# fallback below is the real gate for HWPX/DOCX.
ALLOWED_MIME = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.hancom.hwpx",  # .hwpx (rarely sent)
    "application/haansofthwpx",  # .hwpx (alternate, seen in some clients)
    "application/x-hwpx",  # .hwpx (alternate)
    # Some browsers send empty / generic types — accept those and rely on
    # the extension allow-list below.
    "application/octet-stream",
    "",
}

ALLOWED_EXTS = (".pdf", ".txt", ".docx", ".hwpx")

_parse_limit = RateLimiter(times=5, seconds=60)


@router.post("", response_model=ParseResponse, dependencies=[Depends(_parse_limit)])
async def post_parse(file: UploadFile = File(...)) -> ParseResponse:
    name = (file.filename or "uploaded").lower()
    ext_ok = name.endswith(ALLOWED_EXTS)
    mime_ok = file.content_type in ALLOWED_MIME
    if not (ext_ok or mime_ok):
        raise HTTPException(
            status_code=415,
            detail=f"지원하지 않는 파일 형식입니다: {file.content_type or name}",
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413, detail="파일 크기는 최대 10MB까지 허용됩니다."
        )
    if not raw:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    # Plain text path: skip Document Parse entirely.
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

    # PDF / DOCX / HWPX path: Upstage Document Parse handles all three at the
    # same endpoint. We pass a sensible content_type so multipart parsers on
    # the server side don't choke on empty/octet-stream values from browsers.
    upstage = get_upstage()
    fallback_ct = _content_type_for(name, file.content_type)
    try:
        md = upstage.parse_document(
            filename=file.filename or f"uploaded{_ext_for(name)}",
            content=raw,
            content_type=fallback_ct,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("document parse failed")
        raise HTTPException(status_code=502, detail=f"문서 파싱 실패: {e}") from e

    return ParseResponse(text=md, char_count=len(md))


def _content_type_for(name: str, browser_ct: str | None) -> str:
    """Pick a content_type Upstage will accept.

    Browsers send empty or ``application/octet-stream`` for HWPX (and sometimes
    DOCX) — Upstage's multipart parser is happier with a concrete type.
    """
    if browser_ct and browser_ct not in ("application/octet-stream", ""):
        return browser_ct
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if name.endswith(".hwpx"):
        return "application/vnd.hancom.hwpx"
    return "application/octet-stream"


def _ext_for(name: str) -> str:
    for ext in ALLOWED_EXTS:
        if name.endswith(ext):
            return ext
    return ".pdf"
