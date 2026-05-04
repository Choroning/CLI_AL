"use client";

import { useMemo, useState } from "react";
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

  return (
    <div className="space-y-5">
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

      {preview && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md bg-surface-1 ring-1 ring-hairline-strong px-4 py-3 text-body text-ink"
        >
          <span className="font-mono text-primary mr-2">[{previewIndex}]</span>
          {preview}
        </div>
      )}

      {citations.length > 0 && (
        <ol className="rounded-md ring-1 ring-hairline divide-y divide-hairline overflow-hidden">
          {citations.map((c, idx) => {
            const num = idx + 1;
            const isActive = active === num;
            return (
              <li
                key={num}
                className={cn(
                  "px-4 py-3 text-body-sm transition-colors text-ink",
                  isActive ? "bg-surface-3" : "bg-surface-1"
                )}
              >
                <span
                  className={cn(
                    "font-mono mr-2 inline-block w-6 text-caption",
                    isActive ? "text-primary" : "text-ink-subtle"
                  )}
                >
                  [{num}]
                </span>
                {c}
              </li>
            );
          })}
        </ol>
      )}
    </div>
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
