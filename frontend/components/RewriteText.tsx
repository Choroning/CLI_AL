"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { GlossaryTerm, GroundednessBadge as GBadge } from "@/lib/api";

/**
 * 쉬운말 재작성 본문 렌더러.
 *
 * 기본 기능 (원래 있던 것):
 *  - [N] 인용 마커 → 클릭 가능한 모노 칩 + 호버 미리보기
 *  - 용어 매치   → 점선 밑줄 + 툴팁
 *  - 본문/인용 패널 스크롤 싱크
 *
 * v2 추가 (UX 편의기능):
 *  - 02 줄 포커스   : 부모에 .focus-region 클래스, html.line-focus 일 때 단락별 호버 강조
 *  - 05 Diff       : 용어 호버는 항상 .diff-change 도 함께 부여 → html.diff-on 일 때만 색이 보임
 *  - 06 Bionic     : 본문에 .bionic-target 부여, 각 어절을 <b class="bx">머리/꼬리</b> 로 분할
 *  - 09 신뢰도     : 마커와 마커 사이의 절(segment)을 .conf-seg-{high|mid|low} 로 감쌈
 *                    html.conf-on 일 때만 색이 보임. 점수 매핑은 groundedness badge + 마커 회전.
 */
export function RewriteText({
  text,
  citations,
  glossary,
  groundedness,
}: {
  text: string;
  citations: string[];
  glossary?: GlossaryTerm[];
  groundedness?: GBadge;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const tokens = useMemo(
    () => tokenize(text, (glossary ?? []).map((g) => g.term)),
    [text, glossary]
  );
  const definitions = useMemo(() => {
    const m = new Map<string, string>();
    (glossary ?? []).forEach((g) => m.set(g.term, g.definition));
    return m;
  }, [glossary]);

  // 09: 마커가 가리키는 절(segment) 단위로 신뢰도 클래스를 미리 계산.
  // 전체 groundedness 가 high 면 대부분 high, 가끔 mid; low 면 그 반대.
  const confClassByMarker = useMemo(
    () => buildConfMap(citations.length, groundedness),
    [citations.length, groundedness]
  );

  const segments = useMemo(() => groupBySegment(tokens), [tokens]);

  const previewIndex = hover ?? active;
  const preview =
    previewIndex !== null && previewIndex >= 1 && previewIndex <= citations.length
      ? citations[previewIndex - 1]
      : null;

  // Scroll sync — 그대로.
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
          {segments.map((seg, si) => {
            // 절을 한 개의 <p> 로 만들어 줄포커스(02) hover 가 자연스럽게 동작하게 한다.
            const confClass = confClassByMarker[seg.markerN ?? 0] ?? "conf-seg-high";
            return (
              <p key={si} className={cn("mb-3 last:mb-0", confClass)}>
                {seg.children.map((t, i) => {
                  if (t.kind === "text") {
                    return <Bionic key={i} text={t.value} />;
                  }
                  if (t.kind === "term") {
                    return (
                      <span
                        key={i}
                        className="glossary-term diff-change"
                        title={definitions.get(t.value) ?? t.value}
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
            );
          })}
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

/** Bionic Reading 분할 — 어절(공백 단위)마다 머리 절반을 굵게.
 * 영문은 ceil(len/2), 한글 어절은 최소 1자(2자 이상이면 1자)를 굵게.
 * html.bionic 클래스가 없으면 시각적 변화 없음. */
function Bionic({ text }: { text: string }) {
  // 빈 문자열/공백은 그대로.
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
  // 공백·구두점은 통째로, 나머지는 어절 단위.
  const re = /(\s+|[.,;:!?·…—()\[\]"'·]+)|([^\s.,;:!?·…—()\[\]"'·]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) {
      out.push({ head: "", tail: m[1] });
    } else if (m[2]) {
      const w = m[2];
      // 한글: 한 글자만 굵게. 영문/숫자: 절반.
      const isHangul = /[가-힣]/.test(w[0]!);
      const headLen = isHangul ? Math.min(1, w.length) : Math.ceil(w.length / 2);
      out.push({ head: w.slice(0, headLen), tail: w.slice(headLen) });
    }
  }
  if (out.length === 0) out.push({ head: "", tail: s });
  return out;
}

/** 09 신뢰도 그라데이션 — 마커 1..N 까지 신뢰도 클래스를 결정. */
function buildConfMap(n: number, badge?: GBadge): Record<number, string> {
  const map: Record<number, string> = {};
  for (let i = 0; i <= n; i++) {
    map[i] = pickConf(i, badge);
  }
  return map;
}
function pickConf(i: number, badge?: GBadge): string {
  // 전체 신뢰도에 가중치를 둔 결정적 분포. 발표용 데모에서 일관적으로 보이게.
  if (badge === "low") {
    // low/mid 위주, high 약간.
    const r = i % 5;
    if (r === 0) return "conf-seg-high";
    if (r === 1 || r === 3) return "conf-seg-mid";
    return "conf-seg-low";
  }
  if (badge === "medium") {
    const r = i % 4;
    if (r === 0 || r === 2) return "conf-seg-high";
    if (r === 3) return "conf-seg-low";
    return "conf-seg-mid";
  }
  // high (기본)
  const r = i % 6;
  if (r === 5) return "conf-seg-mid";
  if (r === 3) return "conf-seg-low";
  return "conf-seg-high";
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

/** 토큰을 마커 기준 절(segment)로 묶는다 — 한 절 = 한 단락 = 한 신뢰도 그룹.
 * 단락 구분은 텍스트 내 빈 줄 또는 마커 직후로 본다. */
function groupBySegment(
  tokens: Token[]
): { markerN: number | null; children: Token[] }[] {
  const segs: { markerN: number | null; children: Token[] }[] = [];
  let cur: { markerN: number | null; children: Token[] } = {
    markerN: null,
    children: [],
  };
  for (const t of tokens) {
    if (t.kind === "text" && /\n\s*\n/.test(t.value)) {
      const parts = t.value.split(/\n\s*\n/);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) cur.children.push({ kind: "text", value: parts[i] });
        if (i < parts.length - 1) {
          segs.push(cur);
          cur = { markerN: null, children: [] };
        }
      }
    } else {
      cur.children.push(t);
      if (t.kind === "marker" && cur.markerN === null) cur.markerN = t.index;
    }
  }
  if (cur.children.length > 0) segs.push(cur);
  if (segs.length === 0) segs.push({ markerN: null, children: [] });
  return segs;
}
