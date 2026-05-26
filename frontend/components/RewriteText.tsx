"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Bionic } from "@/lib/Bionic";
import type { GlossaryTerm } from "@/lib/api";

/**
 * 쉬운말 재작성 본문 렌더러.
 *
 *  - [N] 인용 마커 → 클릭 가능한 모노 칩 + 호버 미리보기
 *  - 용어 매치   → 점선 밑줄 + 툴팁
 *  - 본문/인용 패널 스크롤 싱크
 *
 * 상시 작동 보조:
 *  - Bionic : .bionic-target 부여, 어절 머리 글자가 굵게
 */
export function RewriteText({
  text,
  citations,
  glossary,
  hideCitations = false,
  query = "",
  activeMatch = 0,
  onMatchesChange,
}: {
  text: string;
  citations: string[];
  glossary?: GlossaryTerm[];
  /* true 면 본문만 렌더. 출처 인용 리스트는 부모가 <CitationsPanel /> 로 따로
   * 배치할 때 사용 (예: convert 결과 페이지의 쉬운말 | 출처 2-col 구조). */
  hideCitations?: boolean;
  /* 본문 내 검색 — query 가 있으면 매치를 <mark> 로 하이라이트, activeMatch
   * (1-based) 가 가리키는 매치는 강조 + 자동 scrollIntoView. matchCount 는
   * 콜백으로 부모(검색 UI) 에 전달 — 부모가 카운트/현재위치를 표시. */
  query?: string;
  activeMatch?: number;
  onMatchesChange?: (count: number) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [termHover, setTermHover] = useState<{
    term: string;
    top: number;
    left: number;
  } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const baseTokens = useMemo(
    () => tokenize(text, (glossary ?? []).map((g) => g.term)),
    [text, glossary]
  );
  const { tokens, matchCount } = useMemo(
    () => applySearchMatch(baseTokens, query),
    [baseTokens, query]
  );
  const glossaryByTerm = useMemo(() => {
    const m = new Map<string, GlossaryTerm>();
    (glossary ?? []).forEach((g) => m.set(g.term, g));
    return m;
  }, [glossary]);

  const segments = useMemo(() => groupBySegment(tokens), [tokens]);

  // 매치 카운트를 부모(검색 UI) 에 전달.
  useEffect(() => {
    onMatchesChange?.(matchCount);
  }, [matchCount, onMatchesChange]);

  // activeMatch 가 바뀌면 해당 <mark> 으로 스크롤.
  useEffect(() => {
    if (!query.trim() || activeMatch < 1 || matchCount === 0) return;
    const root = contentRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `[data-search-match="${activeMatch}"]`,
    );
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatch, query, matchCount]);

  const previewIndex = hover ?? active;
  const preview =
    previewIndex !== null && previewIndex >= 1 && previewIndex <= citations.length
      ? citations[previewIndex - 1]
      : null;

  // 마커를 클릭해서 active 가 바뀔 때만 해당 list item 으로 scroll-into-view.
  // 본문 스크롤은 list 와 분리 — 자동 sync 제거로 list 가 어색하게 따라다니지 않음.
  useEffect(() => {
    if (active === null) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(`[data-citation-item="${active}"]`);
    if (!item) return;
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div className="flex flex-col gap-4">
      {/* 부모(예: convert 결과 카드) 가 max-h + overflow 로 스크롤을 제어할 수
       *  있도록 본문 자체에서는 스크롤을 잡지 않는다. hideCitations 일 때만 본문
       *  단독 사용으로 가정 — 내부 스크롤이 추가되면 이중 스크롤바가 생김. */}
      <div>
        <div
          ref={contentRef}
          className="bionic-target text-body-lg leading-[1.85] text-ink whitespace-pre-wrap"
        >
          {segments.map((seg, si) => (
            <p key={si} className="mb-3 last:mb-0">
              {seg.children.map((t, i) => {
                if (t.kind === "text") {
                  return <Bionic key={i} text={t.value} />;
                }
                if (t.kind === "match") {
                  const isActive = activeMatch === t.matchIndex;
                  return (
                    <mark
                      key={i}
                      data-search-match={t.matchIndex}
                      className={cn(
                        "rounded-xs px-0.5 -mx-0.5",
                        isActive
                          ? "bg-primary text-primary-on ring-1 ring-primary"
                          : "bg-primary/15 text-ink ring-1 ring-primary/30"
                      )}
                    >
                      <Bionic text={t.value} />
                    </mark>
                  );
                }
                if (t.kind === "term") {
                  return (
                    <span
                      key={i}
                      className="glossary-term"
                      tabIndex={0}
                      onMouseEnter={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setTermHover({ term: t.value, top: r.bottom + 6, left: r.left });
                      }}
                      onMouseLeave={() => setTermHover(null)}
                      onFocus={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setTermHover({ term: t.value, top: r.bottom + 6, left: r.left });
                      }}
                      onBlur={() => setTermHover(null)}
                    >
                      <Bionic text={t.value} />
                    </span>
                  );
                }
                return (
                  <button
                    key={i}
                    type="button"
                    data-citation-n={t.index}
                    className={cn(
                      "citation-marker",
                      active === t.index && "bg-primary text-primary-on ring-primary"
                    )}
                    onClick={() => setActive(t.index === active ? null : t.index)}
                    onMouseEnter={() => setHover(t.index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(t.index)}
                    onBlur={() => setHover(null)}
                    aria-label={`인용 ${t.index} 보기`}
                  >
                    {t.index}
                  </button>
                );
              })}
            </p>
          ))}
        </div>
      </div>

      {preview && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md bg-surface-1 ring-1 ring-hairline-strong px-4 py-3 text-body text-ink flex items-start gap-1"
        >
          <CitationChip n={previewIndex!} active />
          <span>{preview}</span>
        </div>
      )}

      {/* 용어 호버 카드 — fixed 위치, viewport 가장자리 단순 처리 */}
      {termHover && glossaryByTerm.get(termHover.term) && (
        <GlossaryHoverCard
          term={glossaryByTerm.get(termHover.term)!}
          top={termHover.top}
          left={termHover.left}
        />
      )}

      {!hideCitations && citations.length > 0 && (
        <div className="border-t border-hairline pt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-body-sm font-medium text-ink-muted">출처 인용</p>
            <p className="text-caption text-ink-subtle">
              마커를 누르면 해당 인용으로 이동합니다
            </p>
          </div>
          {/* 본문과 분리된 자유 스크롤. 짧으면 자연 높이, 길면 360px 까지. */}
          <div ref={listRef} className="max-h-[360px] overflow-y-auto pr-2">
            <ol className="rounded-md ring-1 ring-hairline divide-y divide-hairline overflow-hidden">
              {citations.map((c, idx) => {
                const num = idx + 1;
                const isActive = active === num;
                return (
                  <li
                    key={num}
                    data-citation-item={num}
                    className={cn(
                      "px-4 py-3 text-body-sm transition-colors text-ink flex items-start gap-1",
                      isActive ? "bg-surface-3 ring-1 ring-primary" : "bg-surface-1"
                    )}
                  >
                    <CitationChip n={num} active={isActive} />
                    <span>{c}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 본문 내 검색 — Section 의 right slot 에 배치되는 컨트롤.
 *   - 입력창 (placeholder "본문 검색")
 *   - 매치 카운트 (n/m 또는 "0건")
 *   - 이전/다음 점프 (Enter/Shift+Enter 단축키 동일)
 *   - 닫기 (Esc 단축키 동일)
 * RewriteText 의 query/activeMatch/onMatchesChange props 와 연동.
 */
export function RewriteSearch({
  query,
  setQuery,
  matchCount,
  activeMatch,
  onPrev,
  onNext,
}: {
  query: string;
  setQuery: (q: string) => void;
  matchCount: number;
  activeMatch: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }
  const hasQuery = query.trim().length > 0;
  return (
    <div className="flex items-center gap-1 text-caption text-ink">
      <div className="relative">
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
          aria-hidden
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="본문 검색"
          aria-label="쉬운말 본문에서 검색"
          className="w-40 rounded-sm bg-canvas ring-1 ring-hairline pl-7 pr-2 py-1 text-caption text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-ink transition-shadow"
        />
      </div>
      {hasQuery && (
        <>
          <span className="tabular-nums text-ink-subtle min-w-[2.5rem] text-center">
            {matchCount === 0 ? "0건" : `${activeMatch}/${matchCount}`}
          </span>
          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount === 0}
            aria-label="이전 결과"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm ring-1 ring-hairline text-ink hover:bg-surface-1 hover:ring-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0}
            aria-label="다음 결과"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm ring-1 ring-hairline text-ink hover:bg-surface-1 hover:ring-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="검색 닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-1 hover:text-ink transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * 출처 인용 독립 패널 — convert 결과의 쉬운말 옆 column 에 단독 배치할 때 사용.
 * 본문(RewriteText) 와 상태 공유는 하지 않는다 (간단 정적 리스트).
 */
export function CitationsPanel({ citations }: { citations: string[] }) {
  if (citations.length === 0) {
    return (
      <p className="text-body-sm text-ink-subtle">
        표시할 출처 인용이 없습니다.
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      {/* 컨테이너 상단에 항목 1 이 바로 와닿도록 안내 캡션은 제외 — 본문 ↔ 인용
       *  스크롤 sync 가 항목 정렬을 시도할 때 캡션이 가려지는 점프를 방지. */}
      <ol className="rounded-md ring-1 ring-hairline divide-y divide-hairline overflow-hidden">
        {citations.map((c, idx) => {
          const num = idx + 1;
          return (
            <li
              key={num}
              data-citation-item={num}
              // 좁은 컬럼(col-span-3)에서 텍스트가 찌그러지지 않도록 처리:
              //   - 폰트 text-body-sm → text-caption (좁은 박스에서 적정 크기)
              //   - li 에 min-w-0 으로 flex 자식이 부모 폭을 넘지 못하게
              //   - span 도 min-w-0 + flex-1 + overflow-wrap anywhere 로 한글
              //     keep-all 환경에서도 폭 초과 어절은 줄바꿈되도록 안전망
              className="px-3 py-3 text-caption text-ink bg-surface-1 flex items-start gap-2 min-w-0"
            >
              <CitationChip n={num} />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <Bionic text={c} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** 단어 호버 카드 — 어려운 용어 위에 마우스 올리면 정의·예시가 뜬다.
 * 위치는 anchor span의 bottom + 6px. viewport 우측 가장자리 단순 처리. */
function GlossaryHoverCard({
  term,
  top,
  left,
}: {
  term: GlossaryTerm;
  top: number;
  left: number;
}) {
  const CARD_W = 320;
  const max = typeof window !== "undefined" ? window.innerWidth - 16 : Infinity;
  const adjustedLeft = Math.min(left, max - CARD_W);

  return (
    <aside
      role="tooltip"
      className="fixed z-50 rounded-md bg-canvas ring-1 ring-hairline-strong shadow-lg p-4 pointer-events-none"
      style={{ top, left: Math.max(8, adjustedLeft), width: CARD_W }}
    >
      <p className="text-caption font-bold tracking-wider text-primary">어려운 말 풀이</p>
      <p className="mt-1.5 text-card-title text-ink leading-tight">{term.term}</p>
      <p className="mt-2 text-body-sm text-ink leading-relaxed">{term.definition}</p>
      {term.example && (
        <p className="mt-3 border-t border-hairline pt-2.5 text-body-sm text-ink-muted leading-relaxed">
          <span className="font-bold text-ink">예시 </span>
          {term.example}
        </p>
      )}
    </aside>
  );
}

function CitationChip({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        "font-semibold font-mono leading-none",
        "px-2 py-1 mr-2 rounded-xs ring-1",
        active
          ? "bg-primary text-primary-on ring-primary"
          : "bg-primary/15 text-primary ring-primary/30"
      )}
    >
      {n}
    </span>
  );
}

type Token =
  | { kind: "text"; value: string }
  | { kind: "marker"; index: number }
  | { kind: "term"; value: string }
  | { kind: "match"; value: string; matchIndex: number };

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

/**
 * tokenize 결과의 text 토큰 안에서 query 매치를 찾아 별도 match 토큰으로 분리.
 *   - 대소문자 무시 (한글엔 영향 없음)
 *   - term/marker 토큰은 그대로 (term 안 매치는 의도적으로 무시 — 행정 도메인에서
 *     검색어가 어려운 용어 자체일 가능성이 낮고, 토큰 split 시 메타 정보가 깨짐)
 *   - 매치마다 1-based matchIndex 부여 — 점프/카운트 표시용
 */
function applySearchMatch(
  tokens: Token[],
  query: string,
): { tokens: Token[]; matchCount: number } {
  const q = query.trim();
  if (!q) return { tokens, matchCount: 0 };
  const needle = q.toLowerCase();
  let counter = 0;
  const out: Token[] = [];
  for (const t of tokens) {
    if (t.kind !== "text") {
      out.push(t);
      continue;
    }
    const text = t.value;
    const haystack = text.toLowerCase();
    let cursor = 0;
    let idx = haystack.indexOf(needle, cursor);
    if (idx === -1) {
      out.push(t);
      continue;
    }
    while (idx !== -1) {
      if (idx > cursor) {
        out.push({ kind: "text", value: text.slice(cursor, idx) });
      }
      counter++;
      out.push({
        kind: "match",
        value: text.slice(idx, idx + needle.length),
        matchIndex: counter,
      });
      cursor = idx + needle.length;
      idx = haystack.indexOf(needle, cursor);
    }
    if (cursor < text.length) {
      out.push({ kind: "text", value: text.slice(cursor) });
    }
  }
  return { tokens: out, matchCount: counter };
}

function tokenize(text: string, terms: string[]): Token[] {
  const sorted = terms.filter((t) => t && t.trim().length > 0).sort((a, b) => b.length - a.length);
  const termGroup =
    sorted.length > 0
      ? `(${sorted.map((t) => t.replace(REGEX_META, "\\$&")).join("|")})|`
      : "";
  const re = new RegExp(`${termGroup}\\[(\\d+)\\]`, "g");

  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: "text", value: text.slice(last, m.index) });
    if (m[1] != null) out.push({ kind: "term", value: m[1] });
    else if (m[2] != null) out.push({ kind: "marker", index: Number(m[2]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}

/** 토큰을 문장 단위로 묶는다 — 줄 포커스가 한 단락 전체 대신 한 문장만 강조.
 *
 * 분할 경계:
 *   - 마침표·물음표·느낌표 뒤 공백 또는 줄바꿈
 *   - 빈 줄 (단락 구분)
 *
 * 인용 마커 [N] 은 보통 문장 끝에 붙으므로, 마커가 직전 segment에 자연스럽게
 * 포함되도록 처리. 다음 토큰이 직후 공백/줄바꿈이면 그 시점에서 break.
 */
function groupBySegment(tokens: Token[]): { children: Token[] }[] {
  const segs: { children: Token[] }[] = [];
  let cur: { children: Token[] } = { children: [] };

  const pushSeg = () => {
    if (cur.children.length > 0) {
      segs.push(cur);
      cur = { children: [] };
    }
  };

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    if (t.kind === "text") {
      // 문장 종결 후 break — 공백 유무·약자 오작동 모두 회피.
      // 한국어 도메인 한정: "[가-힣].\s*" 또는 빈 줄.
      // \s* 로 공백 0개도 허용 → "실시했습니다.주요" 같이 붙은 케이스도 split.
      const parts = t.value.split(/(?<=[가-힣][.!?。])\s*|\n\s*\n/);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p) cur.children.push({ kind: "text", value: p });
        if (i < parts.length - 1) pushSeg();
      }
    } else {
      cur.children.push(t);
      // 인용 마커 직후 텍스트가 마침표·공백·줄바꿈으로 시작하면 그 시점에서 break.
      // 패턴: "...실시했습니다 [3][4]. 주요" → marker [4] 뒤에서 끊는다.
      if (t.kind === "marker") {
        const next = tokens[ti + 1];
        if (next && next.kind === "text" && /^[.!?。\s\n]/.test(next.value)) {
          pushSeg();
        }
      }
    }
  }
  pushSeg();
  if (segs.length === 0) segs.push({ children: [] });
  return normalizeSegments(segs);
}

/** segment 후처리:
 *  1) i번째 segment의 첫 토큰이 ". " 또는 "." 으로 시작하면 그 마침표를 i-1번째 끝으로 옮긴다.
 *     → marker 뒤 break 시 다음 chunk 머리에 남던 마침표가 직전 segment 종결자로 자연스럽게 들어간다.
 *  2) 빈 segment 또는 마침표·공백만 있는 segment는 제거 — "한 줄에 마침표만" 보이는 현상 방지.
 */
function normalizeSegments(
  segs: { children: Token[] }[]
): { children: Token[] }[] {
  const out = segs.map((s) => ({ children: [...s.children] }));

  // 1) i번째 머리의 마침표를 i-1번째 끝으로 이동.
  for (let i = 1; i < out.length; i++) {
    const seg = out[i];
    const first = seg.children[0];
    if (first && first.kind === "text") {
      const m = first.value.match(/^([.!?。]+)\s*/);
      if (m) {
        const prev = out[i - 1];
        prev.children.push({ kind: "text", value: m[1] });
        const rest = first.value.slice(m[0].length);
        if (rest === "") {
          seg.children.shift();
        } else {
          seg.children[0] = { kind: "text", value: rest };
        }
      }
    }
  }

  // 2) 학술 인용 컨벤션: 각 segment 안에서, 끝이 [..text "...단어 ", marker, marker, text "."]
  //    형태면 "."를 마커 *앞* text 의 trailing 공백 자리로 이동. 결과: "...단어." + 마커 chip.
  for (const seg of out) {
    const ch = seg.children;
    if (ch.length < 2) continue;
    const last = ch[ch.length - 1];
    if (last.kind !== "text" || !/^[.!?。]+\s*$/.test(last.value)) continue;
    const period = last.value.match(/[.!?。]+/)![0];
    // 끝에서부터 marker chain 건너뛰기
    let i = ch.length - 2;
    while (i >= 0 && ch[i].kind === "marker") i--;
    if (i < 0 || ch[i].kind !== "text") continue;
    const before = ch[i] as { kind: "text"; value: string };
    ch[i] = { kind: "text", value: before.value.replace(/\s*$/, "") + period };
    ch.splice(ch.length - 1, 1);
  }

  return out.filter((s) => {
    if (s.children.length === 0) return false;
    const onlyTrivia = s.children.every(
      (c) => c.kind === "text" && /^[.!?。\s]*$/.test(c.value)
    );
    return !onlyTrivia;
  });
}
