"""국가법령정보센터 Open API 래퍼 (OC 키 방식).

API 문서: https://www.law.go.kr/LSW/openApi.do
법령 용어 검색 endpoint:
    GET https://www.law.go.kr/DRF/lawSearch.do
        ?OC={key}&target=lsTrm&type=JSON&query={term}&display={n}
"""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.models.schemas import LawTermResult

logger = logging.getLogger(__name__)

_LAW_SEARCH_URL = "https://www.law.go.kr/DRF/lawSearch.do"


class LawClient:
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def search_term(self, query: str, display: int = 10) -> tuple[list[LawTermResult], int]:
        """법령 용어를 검색해 (결과 목록, 전체 건수) 를 반환한다.

        API 오류나 파싱 실패 시 ([], 0) 을 반환 — 호출부를 중단시키지 않는다.
        """
        params = {
            "OC": self._api_key,
            "target": "lsTrm",
            "type": "JSON",
            "query": query,
            "display": display,
        }
        try:
            with httpx.Client(timeout=10) as client:
                r = client.get(_LAW_SEARCH_URL, params=params)
                r.raise_for_status()
                data = r.json()
        except Exception:
            logger.exception("국가법령정보 API 호출 실패 (query=%s)", query)
            return [], 0

        return _parse_response(data)


def _parse_response(data: dict) -> tuple[list[LawTermResult], int]:
    """API 응답 JSON을 LawTermResult 목록으로 변환한다."""
    try:
        body = data.get("LawSearch", {})
        total = int(body.get("totalCnt", 0))
        raw_items = body.get("lsTrm", [])
        # 단일 항목이 dict로 오는 경우 대응
        if isinstance(raw_items, dict):
            raw_items = [raw_items]
        if not isinstance(raw_items, list):
            return [], total

        results: list[LawTermResult] = []
        for item in raw_items:
            term_name = item.get("용어", "").strip()
            definition = item.get("풀이", "").strip()
            law_name = item.get("법령명", "").strip()
            article = item.get("조문내용", "").strip() or None

            if not term_name or not definition:
                continue
            results.append(
                LawTermResult(
                    term_name=term_name,
                    definition=definition,
                    law_name=law_name,
                    article=article,
                )
            )
        return results, total
    except Exception:
        logger.exception("국가법령정보 API 응답 파싱 실패")
        return [], 0


_client: LawClient | None = None


def get_law_client() -> LawClient | None:
    """설정된 경우 LawClient 싱글톤을 반환한다. 키 미설정 시 None."""
    global _client
    if _client is None:
        key = get_settings().law_api_key
        if not key:
            return None
        _client = LawClient(api_key=key)
    return _client
