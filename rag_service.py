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


# ── 관련성 검사 ──────────────────────────────────────────
def _is_standalone(keyword: str, law_name: str) -> bool:
    """
    키워드가 법령명에서 독립적인 단어 단위로 포함되는지 확인.
    앞 글자가 한글이면 다른 단어에 묻힌 것으로 판단해 거부.
    예) '약관' in '농약관리법' → 앞글자 '농'이 한글 → False
        '임차인' in '임차인 보호 특별법' → 앞글자 없음 → True
        '계약' in '공기업 계약사무규칙' → 앞글자 ' '(공백) → True
    """
    idx = law_name.find(keyword)
    if idx == -1:
        return False
    if idx > 0 and re.match(r'[가-힣]', law_name[idx - 1]):
        return False
    return True


# ── 키워드 추출 ───────────────────────────────────────────
# 이 단어 중 하나라도 있어야 법령 검색 의미 있음
_LEGAL_TRIGGERS = {
    '계약', '임차', '임대', '채무', '채권', '담보', '보증', '손해', '배상',
    '행정', '처분', '허가', '신청', '승인', '인가', '등록', '고지', '공문',
    '근로', '급여', '임금', '해고', '퇴직', '고용', '노동',
    '의료', '진료', '처방', '환자', '보험', '급여',
    '세금', '과세', '납세', '신고', '부과', '징수',
    '상속', '유언', '증여', '재산', '소유권',
    '소송', '판결', '재판', '고소', '고발', '소장',
    '법률', '법령', '조항', '조문', '시행령', '규정',
    '약관', '조건', '의무', '권리', '위반', '제재',
}

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
def get_rag_context(document: str) -> tuple[str, list[str]]:
    """
    문서를 분석해 관련 법령 조문을 가져온다.
    반환값: (프롬프트용 컨텍스트 문자열, 참고 법령명 리스트)
    API 오류 시 ('', []) 반환 (서비스 중단 없음).
    """
    try:
        # 법률 관련 문서가 아니면 RAG 건너뜀
        # 공백·특수문자 제거 후 서브스트링 검색 (조사 붙은 형태도 감지)
        doc_korean = ''.join(re.findall(r'[가-힣]', document))
        if not any(trigger in doc_korean for trigger in _LEGAL_TRIGGERS):
            return '', []

        keywords = extract_keywords(document)
        if not keywords:
            return '', []

        parts = []
        law_names_used = []
        seen_mst = set()

        for keyword in keywords[:3]:
            laws = search_laws(keyword, display=3)
            for law in laws:
                mst      = law.get('법령일련번호') or law.get('법령MST') or law.get('MST', '')
                law_name = law.get('법령명한글', '')
                if not mst or mst in seen_mst:
                    continue
                # 관련성 필터: 키워드가 법령명에서 독립 단위로 등장해야 함
                # 예) '약관' → '농약관리법' 거부 (앞에 '농'이라는 한글이 붙음)
                if not _is_standalone(keyword, law_name):
                    continue
                seen_mst.add(mst)
                articles = get_law_articles(mst)
                if articles:
                    parts.append(f"▶ {law_name}\n{articles}")
                    law_names_used.append(law_name)
                break  # 키워드당 관련 법령 1개만

        context = '\n\n'.join(parts) if parts else ''
        return context, law_names_used

    except Exception:
        return '', []
