"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Render `[1]` `[2]` markers as clickable mono chips that highlight the
 * matching citation row below. Hovering also shows a small preview tooltip
 * so the user doesn't have to click to see the source snippet. */
export function RewriteText({
  text,
  citations,
}: {
  text: string;
  citations: string[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const segments = splitOnMarkers(text);
  const previewIndex = hover ?? active;
  const preview =
    previewIndex !== null && previewIndex >= 1 && previewIndex <= citations.length
      ? citations[previewIndex - 1]
      : null;

  return (
    <div className="space-y-5">
      <div className="text-body leading-relaxed text-ink whitespace-pre-wrap relative">
        {segments.map((s, i) =>
          s.kind === "text" ? (
            <span key={i}>{s.value}</span>
          ) : (
            <span key={i} className="relative inline">
              <button
                type="button"
                className={cn(
                  "citation-marker",
                  active === s.index && "bg-primary text-primary-on ring-primary"
                )}
                onClick={() => setActive(s.index === active ? null : s.index)}
                onMouseEnter={() => setHover(s.index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.index)}
                onBlur={() => setHover(null)}
                aria-label={`인용 ${s.index} 보기`}
                aria-describedby={`citation-${s.index}-preview`}
              >
                {s.index}
              </button>
            </span>
          )
        )}
      </div>

      {preview && (
        <div
          id={`citation-${previewIndex}-preview`}
          role="status"
          aria-live="polite"
          className="rounded-md bg-surface-2 ring-1 ring-hairline-strong px-4 py-3 text-body text-ink"
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
                  isActive ? "bg-surface-2" : "bg-surface-1"
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

type Segment =
  | { kind: "text"; value: string }
  | { kind: "marker"; index: number };

function splitOnMarkers(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", value: text.slice(last, m.index) });
    }
    out.push({ kind: "marker", index: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}
