"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { GlossaryTerm } from "@/lib/api";

/**
 * Render the rewrite text with three kinds of inline emphasis:
 *   1. `[1]` markers → clickable mono chips with hover preview tooltip
 *   2. Glossary terms found inline → dotted-underline lavender for "look this up"
 *   3. Plain text → reading-friendly body-lg with generous leading
 *
 * The whole rewrite is given visual prominence (body-lg, lh 1.85) since this
 * is the primary artifact older users came here to read.
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

  const previewIndex = hover ?? active;
  const preview =
    previewIndex !== null && previewIndex >= 1 && previewIndex <= citations.length
      ? citations[previewIndex - 1]
      : null;

  // Sync the citation list scroll position with the rewrite body's scroll —
  // when the topmost visible marker changes, scroll the matching citation
  // into view in the panel below. rAF-throttled, so we recompute at most
  // once per frame.
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
      // Topmost-visible marker = smallest non-negative top. Fall back to the
      // marker just above the top edge so the panel keeps showing the most
      // recently passed citation when scrolled past all visible markers.
      const below = positions
        .filter((p) => p.top >= 0)
        .sort((a, b) => a.top - b.top);
      const above = positions
        .filter((p) => p.top < 0)
        .sort((a, b) => b.top - a.top);
      const topmost = below[0] ?? above[0];
      if (!topmost || topmost.n === lastTop) return;
      lastTop = topmost.n;

      const list = listRef.current;
      if (!list) return;
      const item = list.querySelector<HTMLElement>(
        `[data-citation-item="${topmost.n}"]`
      );
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
    // Initial alignment after paint
    requestAnimationFrame(sync);
    return () => body.removeEventListener("scroll", onScroll);
  }, [tokens, citations.length]);

  return (
    <div className="flex flex-col gap-4">
      {/* Rewrite body — its own scroll region so the citation panel below
          stays visible regardless of how long the rewrite is. */}
      <div ref={bodyRef} className="max-h-[300px] overflow-y-auto pr-2">
        <div className="text-body-lg leading-[1.85] text-ink whitespace-pre-wrap">
          {tokens.map((t, i) => {
            if (t.kind === "text") return <span key={i}>{t.value}</span>;
            if (t.kind === "term") {
              return (
                <span
                  key={i}
                  className="glossary-term"
                  title={definitions.get(t.value) ?? t.value}
                >
                  {t.value}
                </span>
              );
            }
            // marker
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

/**
 * Lavender chip used to label `[N]` citation references in the preview row
 * and the citation list. Visually echoes the inline `.citation-marker` chip
 * used inside the rewrite body so the same `N` reads the same everywhere.
 */
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
  const sorted = terms
    .filter((t) => t && t.trim().length > 0)
    .sort((a, b) => b.length - a.length);
  const termGroup =
    sorted.length > 0
      ? `(${sorted.map((t) => t.replace(REGEX_META, "\\$&")).join("|")})|`
      : "";
  const re = new RegExp(`${termGroup}\\[(\\d+)\\]`, "g");

  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", value: text.slice(last, m.index) });
    }
    if (m[1] != null) {
      out.push({ kind: "term", value: m[1] });
    } else if (m[2] != null) {
      out.push({ kind: "marker", index: Number(m[2]) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}
