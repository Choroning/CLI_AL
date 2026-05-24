"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { GlossaryTerm } from "@/lib/api";

/**
 * 쉬운말 재작성 본문 렌더러.
 *
 *  - [N] 인용 마커 → 클릭 가능한 모노 칩 + 호버 미리보기
 *  - 용어 매치   → 점선 밑줄 + 툴팁
 *  - 본문/인용 패널 스크롤 싱크
 *
 * 상시 작동 보조:
 *  - 줄 포커스 : 부모에 .focus-region 클래스 → 호버 단락만 선명하게
 *  - Bionic   : .bionic-target 부여, 어절 머리 글자가 굵게
 */
export function RewriteText({
  text,
  citations,
  glossary,
}: {
  text: string;
  citations: string[];
  glossary?: GlossaryTerm[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [termHover, setTermHover] = useState<{
    term: string;
    top: number;
    left: number;
  } | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const tokens = useMemo(
    () => tokenize(text, (glossary ?? []).map((g) => g.term)),
    [text, glossary]
  );
  const glossaryByTerm = useMemo(() => {
    const m = new Map<string, GlossaryTerm>();
    (glossary ?? []).forEach((g) => m.set(g.term, g));
    return m;
  }, [glossary]);

  const segments = useMemo(() => groupBySegment(tokens), [tokens]);

  const previewIndex = hover ?? active;
  const preview =
    previewIndex !== null && previewIndex >= 1 && previewIndex <= citations.length
      ? citations[previewIndex - 1]
      : null;

  // 본문 스크롤에 맞춰 인용 패널 스크롤 동기화.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || citations.length === 0) return;
    let ticking = false;
    let lastTop: number | null = null;
    const sync = () => {
      const bodyRect = body.getBoundingClientRect();
      const markers = Array.from(
        body.querySelectorAll<HTMLElement>("[data-citation-n]")
      );
      if (markers.length === 0) return;
      const positions = markers.map((el) => ({
        n: Number(el.dataset.citationN),
        top: el.getBoundingClientRect().top - bodyRect.top,
      }));
      const below = positions.filter((p) => p.top >= 0).sort((a, b) => a.top - b.top);
      const above = positions.filter((p) => p.top < 0).sort((a, b) => b.top - a.top);
      const topmost = below[0] ?? above[0];
      if (!topmost || topmost.n === lastTop) return;
      lastTop = topmost.n;
      const list = listRef.current;
      if (!list) return;
      const item = list.querySelector<HTMLElement>(`[data-citation-item="${topmost.n}"]`);
      if (!item) return;
      const itemRect = item.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const offset = itemRect.top - listRect.top;
      if (Math.abs(offset) > 4) {
        list.scrollTo({ top: list.scrollTop + offset, behavior: "smooth" });
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sync();
        ticking = false;
      });
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(sync);
    return () => body.removeEventListener("scroll", onScroll);
  }, [tokens, citations.length]);

  return (
    <div className="flex flex-col gap-4">
      <div ref={bodyRef} className="max-h-[460px] overflow-y-auto pr-2 focus-region">
        <div className="bionic-target text-body-lg leading-[1.85] text-ink whitespace-pre-wrap">
          {segments.map((seg, si) => (
            <p key={si} className="mb-1 last:mb-0">
              {seg.children.map((t, i) => {
                if (t.kind === "text") {
                  return <Bionic key={i} text={t.value} />;
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

      {citations.length > 0 && (
        <div className="border-t border-hairline pt-4">
          <p className="text-body-sm font-medium text-ink-muted mb-2">출처 인용</p>
          <div ref={listRef} className="max-h-[180px] overflow-y-auto pr-2">
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
                      isActive ? "bg-surface-3" : "bg-surface-1"
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

/** Bionic Reading 분할 — 어절(공백 단위)마다 머리 절반을 굵게. */
function Bionic({ text }: { text: string }) {
  const parts = useMemo(() => splitBionic(text), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.head ? (
          <span key={i}>
            <b className="bx">{p.head}</b>
            {p.tail}
          </span>
        ) : (
          <span key={i}>{p.tail}</span>
        )
      )}
    </>
  );
}

type BionicPart = { head: string; tail: string };
function splitBionic(s: string): BionicPart[] {
  const out: BionicPart[] = [];
  const re = /(\s+|[.,;:!?·…—()\[\]"'·]+)|([^\s.,;:!?·…—()\[\]"'·]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) {
      out.push({ head: "", tail: m[1] });
    } else if (m[2]) {
      const w = m[2];
      const isHangul = /[가-힣]/.test(w[0]!);
      const headLen = isHangul ? Math.min(1, w.length) : Math.ceil(w.length / 2);
      out.push({ head: w.slice(0, headLen), tail: w.slice(headLen) });
    }
  }
  if (out.length === 0) out.push({ head: "", tail: s });
  return out;
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
  | { kind: "term"; value: string };

const REGEX_META = /[.*+?^${}()|[\]\\]/g;

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
      // 텍스트 내부를 문장 종결 또는 빈 줄 기준으로 잘게 split.
      // (?<=...) lookbehind 로 종결 부호를 직전 chunk에 남긴다.
      const parts = t.value.split(/(?<=[.!?。])\s+|\n\s*\n/);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p) cur.children.push({ kind: "text", value: p });
        if (i < parts.length - 1) pushSeg();
      }
    } else {
      cur.children.push(t);
      // 인용 마커 뒤에 공백이 오면 그 마커까지 한 문장으로 잘라낸다.
      if (t.kind === "marker") {
        const next = tokens[ti + 1];
        if (next && next.kind === "text" && /^[\s\n]/.test(next.value)) {
          pushSeg();
        }
      }
    }
  }
  pushSeg();
  if (segs.length === 0) segs.push({ children: [] });
  return segs;
}
