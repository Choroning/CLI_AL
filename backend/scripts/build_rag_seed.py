"""법제처 알기 쉬운 법령 정비기준 PDF → RAG seed JSONL 변환 스크립트.

출력: llm/corpus/rag_seed.jsonl
  각 줄: {"text": "...", "source": "법제처_알기쉬운법령정비기준_제10판", "type": "용어|문장"}

사용법:
    cd backend
    python scripts/build_rag_seed.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

REPO_ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = REPO_ROOT / "backend" / "app" / "rag" / "법제처_알기_쉬운_법령_정비기준_제10판_수정증보판(본문).pdf"
OUT_PATH = REPO_ROOT / "llm" / "corpus" / "rag_seed.jsonl"

# 용어편: p19~126 (0-indexed 18~125), 문장편: p127~210 (0-indexed 126~209)
TERM_PAGES = (18, 126)
SENT_PAGES = (126, 210)


# ---------------------------------------------------------------------------
# 텍스트 정제
# ---------------------------------------------------------------------------

_CID_RE = re.compile(r"\(cid:\d+\)")

# 페이지 여백에 세로로 인쇄된 목차용 텍스트 (한 글자씩 줄바꿈되어 추출됨)
_MARGIN_RE = re.compile(
    r"\n(소|개|용|어|문|장|작|성|례|어문규정|법령유형)\n",
)
# 단독 줄의 섹션 헤더/번호 제거
_SECTION_HDR_RE = re.compile(
    r"^\s*(?:\d+\.\s+[가-힣]+|제\d+[절장]\s+|가\.\s+|나\.\s+|다\.\s+|[가-힣]\.\s+|※.+)\s*$",
    re.M,
)
# 챕터 표시 줄
_CHAPTER_RE = re.compile(
    r"^(제\d+[절장]|알기\s*쉬운\s*법령|용어편|문장편|법령유형별).*$",
    re.M,
)


def _clean_page(text: str) -> str:
    text = _CID_RE.sub("", text)
    # 여백 세로 텍스트
    text = _MARGIN_RE.sub("\n", text)
    # 챕터·섹션 헤더
    text = _CHAPTER_RE.sub("", text)
    text = _SECTION_HDR_RE.sub("", text)
    # 쪽 번호 단독 줄 (1~3자리 숫자만)
    text = re.sub(r"^\s*\d{1,3}\s*$", "", text, flags=re.M)
    # 연속 빈 줄 정리
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------------------
# 공통 패턴
# ---------------------------------------------------------------------------

# "어려운용어 → 쉬운용어" — 줄 전체
_ARROW_RE = re.compile(
    r"^(?P<difficult>[^\n→]{1,80})\s*→\s*(?P<simple>[^\n]{1,120})$",
    re.M,
)
# 출처: (「법령명」 제X조...) 또는 ※권고안
_SOURCE_RE = re.compile(
    r"\(「[^」]+」[^)]*\)|\(※[^)]*\)"
)
# 예시 마커: "예", "예 1:", "예 2:", "예1:", ...
_EXAMPLE_RE = re.compile(r"^예\s*(?:\d+\s*[:：]\s*[가-힣]*)?\s*$", re.M)
# 설명 줄: "- 'xxx'는 ..."
_EXPL_RE = re.compile(r"^[-•]\s+.+", re.M)
# 노이즈 줄: 단일 한자 또는 2자리 이하 한글/알파벳만 있는 줄
_NOISE_LINE_RE = re.compile(r"^\s*[\w가-힣]{1,2}\s*$", re.M)


def _remove_noise_lines(text: str) -> str:
    return _NOISE_LINE_RE.sub("", text)


def _extract_source(text: str) -> str:
    m = _SOURCE_RE.search(text)
    return m.group(0) if m else ""


# PDF에서 정비 전/후 상자 사이의 화살표 구분자 (Private Use Area 문자)
_BOX_SEP = ""

# 여백 인라인 문자 (단일 글자가 줄 중간에 끼어 있는 경우)
_INLINE_MARGIN_RE = re.compile(r"\n[소개용어문장작성례]\n")


# ---------------------------------------------------------------------------
# 예시 블록에서 정비 전/후 추출
# ---------------------------------------------------------------------------

def _split_example(block: str) -> tuple[str, str, str]:
    """예시 블록 → (정비전, 정비후, 출처).

    PDF에서 정비 전/후 상자 구분자는 \\uf0e8 (커스텀 폰트 화살표).
    이 문자를 우선 사용하고, 없으면 첫 빈 줄로 fallback.
    """
    # 인라인 여백 텍스트 제거
    block = _INLINE_MARGIN_RE.sub("\n", block)
    block = _remove_noise_lines(block).strip()

    source = _extract_source(block)

    # 출처 이후 텍스트 제거
    if source:
        cut = block.find(source)
        content = block[:cut].strip()
    else:
        content = block

    # ── 1차:  구분자로 분리 ──────────────────────────────────────────
    if _BOX_SEP in content:
        parts = content.split(_BOX_SEP, 1)
        before = parts[0].strip()
        after  = parts[1].strip()
    # ── 2차: 빈 줄로 분리 ─────────────────────────────────────────────────
    else:
        parts = re.split(r"\n\n+", content, maxsplit=1)
        if len(parts) == 2:
            before, after = parts[0].strip(), parts[1].strip()
        else:
            before, after = content.strip(), ""

    # after가 noise인 경우 제거
    if after and len(after.split()) <= 3 and not re.search(r"[가-힣]{4,}", after):
        after = ""

    return before, after, source


# ---------------------------------------------------------------------------
# 용어편 파싱
# ---------------------------------------------------------------------------

def parse_term_pages(pages: list[str]) -> list[dict]:
    full = "\n\n".join(_clean_page(p) for p in pages if p)
    entries: list[dict] = []

    arrows = list(_ARROW_RE.finditer(full))
    for idx, m in enumerate(arrows):
        difficult = m.group("difficult").strip()
        simple    = m.group("simple").strip()

        # 불필요한 매치 필터 (섹션 번호 등)
        if len(difficult) <= 1 or re.match(r"^\d", difficult):
            continue

        body_start = m.end()
        body_end   = arrows[idx + 1].start() if idx + 1 < len(arrows) else len(full)
        body       = full[body_start:body_end]

        # 설명 추출
        expl_lines = _EXPL_RE.findall(body)
        explanation = " ".join(e.lstrip("-• ").strip() for e in expl_lines[:2])
        # 설명이 너무 길면 첫 문장만
        if explanation and len(explanation) > 200:
            explanation = explanation[:200].rsplit(".", 1)[0] + "."

        # 예시 블록 추출
        example_spans = [(em.start(), em.end()) for em in _EXAMPLE_RE.finditer(body)]
        examples: list[tuple[str, str, str]] = []

        for i, (es, ee) in enumerate(example_spans):
            ex_end = example_spans[i + 1][0] if i + 1 < len(example_spans) else len(body)
            raw_block = body[ee:ex_end]
            before, after, source = _split_example(raw_block)
            if before:
                examples.append((before, after, source))

        if examples:
            for before, after, source in examples:
                entries.append(_term_chunk(difficult, simple, explanation, before, after, source))
        else:
            # 예시 없어도 용어 쌍은 보존
            entries.append(_term_chunk(difficult, simple, explanation, "", "", ""))

    return entries


def _term_chunk(difficult, simple, explanation, before, after, source) -> dict:
    parts = [f"어려운 표현: {difficult}", f"쉬운 표현: {simple}"]
    if explanation:
        parts.append(f"설명: {explanation}")
    if before:
        parts.append(f"정비 전: {before}")
    if after:
        parts.append(f"정비 후: {after}")
    if source:
        parts.append(f"출처: {source}")
    return {
        "text":   "\n".join(parts),
        "source": "법제처_알기쉬운법령정비기준_제10판",
        "type":   "용어",
    }


# ---------------------------------------------------------------------------
# 문장편 파싱
# ---------------------------------------------------------------------------

def parse_sent_pages(pages: list[str]) -> list[dict]:
    full = "\n\n".join(_clean_page(p) for p in pages if p)
    entries: list[dict] = []

    # 소절 헤더 파악 (맥락용)
    _sub_hdr = re.compile(r"^(?:[가-힣]\.\s+.{4,40}|[0-9]+\)\s+.{4,40})$", re.M)

    example_spans = [(m.start(), m.end()) for m in _EXAMPLE_RE.finditer(full)]

    for i, (es, ee) in enumerate(example_spans):
        ex_end = example_spans[i + 1][0] if i + 1 < len(example_spans) else len(full)
        raw_block = full[ee:ex_end]
        before, after, source = _split_example(raw_block)

        if not (before and after):
            continue

        # 앞 400자에서 소절 헤더 추출
        preceding = full[max(0, es - 400):es]
        ctx_matches = list(_sub_hdr.finditer(preceding))
        context = ctx_matches[-1].group(0).strip() if ctx_matches else ""

        entries.append(_sent_chunk(context, before, after, source))

    return entries


def _sent_chunk(context, before, after, source) -> dict:
    parts = []
    if context:
        parts.append(f"정비 원칙: {context}")
    parts.append(f"정비 전: {before}")
    parts.append(f"정비 후: {after}")
    if source:
        parts.append(f"출처: {source}")
    return {
        "text":   "\n".join(parts),
        "source": "법제처_알기쉬운법령정비기준_제10판",
        "type":   "문장",
    }


# ---------------------------------------------------------------------------
# 품질 필터
# ---------------------------------------------------------------------------

_NOISE_TERMS = re.compile(
    r"^(제\d+[장절]|가\.|나\.|다\.|[0-9]+\.|법령유형별|작성례|어문규정)"
)


def _is_valid(entry: dict) -> bool:
    text = entry["text"]
    if len(text) < 40:
        return False
    # 어려운 표현이 너무 짧거나 노이즈
    lines = {l.split(":", 1)[0]: l.split(":", 1)[1].strip()
             for l in text.splitlines() if ":" in l}
    difficult = lines.get("어려운 표현", "")
    simple    = lines.get("쉬운 표현", "")
    if entry["type"] == "용어":
        if not difficult or not simple:
            return False
        if _NOISE_TERMS.match(difficult):
            return False
        if len(difficult) > 60 or len(simple) > 120:
            return False
    # 정비 후가 노이즈인 경우
    after = lines.get("정비 후", "")
    if after and _NOISE_TERMS.match(after):
        return False
    return True


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    sys.stdout = __import__("io").TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )

    print(f"PDF: {PDF_PATH}")
    print(f"출력: {OUT_PATH}")

    with pdfplumber.open(str(PDF_PATH)) as pdf:
        total = len(pdf.pages)
        print(f"총 {total}페이지")
        term_texts = [pdf.pages[i].extract_text() or "" for i in range(*TERM_PAGES) if i < total]
        sent_texts = [pdf.pages[i].extract_text() or "" for i in range(*SENT_PAGES) if i < total]

    print("용어편 파싱 중...")
    term_entries = parse_term_pages(term_texts)
    print(f"  원본: {len(term_entries)}건")

    print("문장편 파싱 중...")
    sent_entries = parse_sent_pages(sent_texts)
    print(f"  원본: {len(sent_entries)}건")

    all_entries = [e for e in term_entries + sent_entries if _is_valid(e)]
    print(f"품질 필터 후: {len(all_entries)}건")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        for entry in all_entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"\n완료 → {OUT_PATH}")

    # 통계
    terms = [e for e in all_entries if e["type"] == "용어"]
    sents = [e for e in all_entries if e["type"] == "문장"]
    t_both = [e for e in terms if "정비 전:" in e["text"] and "정비 후:" in e["text"]]
    s_both = [e for e in sents if "정비 전:" in e["text"] and "정비 후:" in e["text"]]
    print(f"  용어: {len(terms)}건 (전/후 쌍: {len(t_both)}건)")
    print(f"  문장: {len(sents)}건 (전/후 쌍: {len(s_both)}건)")

    print("\n--- 용어편 샘플 ---")
    for e in terms[1:5]:
        print(e["text"])
        print()
    print("--- 문장편 샘플 ---")
    for e in sents[3:6]:
        print(e["text"])
        print()


if __name__ == "__main__":
    main()
