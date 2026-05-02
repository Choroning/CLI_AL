import os
import re
import requests
from collections import Counter

LAW_API_KEY = os.getenv('LAW_API_KEY', 'Documentconversion')
BASE_URL = 'https://www.law.go.kr/DRF'
TIMEOUT = 5  # 초


def _get(endpoint: str, params: dict) -> dict:
    params.update({'OC': LAW_API_KEY, 'type': 'JSON'})
    try:
        res = requests.get(f'{BASE_URL}/{endpoint}', params=params, timeout=TIMEOUT)
        res.raise_for_status()
        return res.json()
    except Exception:
        return {}


def _to_list(val) -> list:
    """API 응답이 단건(dict)이면 리스트로 통일"""
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return [val]
    return []


# ── 법령 검색 ─────────────────────────────────────────────
def search_laws(query: str, display: int = 3) -> list:
    data = _get('lawSearch.do', {'target': 'law', 'query': query, 'display': display})
    return _to_list(data.get('LawSearch', {}).get('law'))


# ── 법령 본문 조회 ────────────────────────────────────────
def get_law_articles(mst: str, max_articles: int = 4) -> str:
    data = _get('lawService.do', {'target': 'law', 'MST': mst})
    law = data.get('법령', {})
    # 조문단위가 없으면 조문 전체 텍스트 시도
    articles = _to_list(law.get('조문', {}).get('조문단위'))
    if not articles:
        # 일부 법령은 조문 구조가 다름 — 전문(前文) 텍스트 사용
        preamble = law.get('전문', '')
        return preamble[:500] if preamble else ''
    texts = []
    for art in articles[:max_articles]:
        title   = art.get('조문제목', '')
        content = art.get('조문내용', '')
        if content:
            prefix = f"[{title}] " if title else ''
            texts.append(f"{prefix}{content[:200]}")
    return '\n'.join(texts)


# ── 법령용어 검색 ─────────────────────────────────────────
def search_term(term: str) -> str:
    data = _get('lawSearch.do', {'target': 'lawTerms', 'query': term, 'display': 1})
    items = _to_list(data.get('LawSearch', {}).get('law'))
    if items:
        return items[0].get('용어설명', '')
    return ''


# ── 키워드 추출 ───────────────────────────────────────────
_STOPWORDS = {
    '이다', '있다', '없다', '한다', '하는', '하여', '위하여', '대하여',
    '따라', '경우', '때에는', '것으로', '되는', '하고', '또는', '및',
    '관하여', '관련', '사항', '규정', '조항', '내용', '해당', '적용',
    '목적', '조항', '본문', '단서', '전항', '해당', '이하', '이상',
}

# 조사 제거용 (길이 긴 것 우선 처리)
_PARTICLES = ['에서', '으로', '에게', '부터', '까지', '이라', '이고',
              '과', '와', '은', '는', '이', '가', '을', '를', '의',
              '도', '만', '로', '에', '서']


def _strip_particle(word: str) -> str:
    for p in sorted(_PARTICLES, key=len, reverse=True):
        if word.endswith(p) and len(word) - len(p) >= 2:
            return word[:-len(p)]
    return word


def extract_keywords(document: str) -> list:
    # 1. 붙여쓴 법령명 우선 (예: 민법, 근로기준법, 주택임대차보호법)
    law_names = re.findall(r'[가-힣]{2,15}법(?:률|령|규|칙)?', document)

    # 2. 공백 단위로 토큰 분리 → 조사 제거 → 의미 있는 단어 추출
    tokens = re.split(r'[\s,.\(\)\[\]·\-·「」『』《》]+', document)
    cleaned = []
    for t in tokens:
        t = t.strip()
        if not t:
            continue
        t = _strip_particle(t)
        # 2~6글자 순수 한글만
        if re.fullmatch(r'[가-힣]{2,6}', t) and t not in _STOPWORDS:
            cleaned.append(t)

    top_words = [w for w, _ in Counter(cleaned).most_common(5)]

    # 법령명 우선, 중복 제거, 최대 4개
    keywords = list(dict.fromkeys(law_names[:2] + top_words))[:4]
    return keywords


# ── RAG 컨텍스트 생성 (메인 함수) ────────────────────────
def get_rag_context(document: str) -> str:
    """
    문서를 분석해 관련 법령 조문을 가져오고
    LLM 프롬프트에 넣을 참고 텍스트를 반환한다.
    API 오류 시 빈 문자열 반환 (서비스 중단 없음).
    """
    try:
        keywords = extract_keywords(document)
        if not keywords:
            return ''

        parts = []
        seen_mst = set()

        for keyword in keywords[:3]:
            laws = search_laws(keyword, display=2)
            for law in laws[:1]:
                # API 응답의 MST 키는 '법령일련번호'
                mst      = law.get('법령일련번호') or law.get('법령MST') or law.get('MST', '')
                law_name = law.get('법령명한글', '')
                if not mst or mst in seen_mst:
                    continue
                seen_mst.add(mst)
                articles = get_law_articles(mst)
                if articles:
                    parts.append(f"▶ {law_name}\n{articles}")

        return '\n\n'.join(parts) if parts else ''

    except Exception:
        return ''
