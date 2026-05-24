"use client";

import { cn } from "@/lib/cn";

/**
 * 요약 깊이 선택 — 2단계.
 *   "full"    : 전체 쉬운말 (기본)
 *   "summary" : 핵심 5문장 만
 */

export type ZoomLevel = "summary" | "full";

const STEPS: { level: ZoomLevel; label: string }[] = [
  { level: "full", label: "전체 쉬운말" },
  { level: "summary", label: "핵심 5문장" },
];

export function ZoomSlider({
  value,
  onChange,
}: {
  value: ZoomLevel;
  onChange: (l: ZoomLevel) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md ring-1 ring-hairline bg-canvas px-4 py-3">
      <span className="text-caption font-bold tracking-wider text-ink-muted">
        요약 깊이
      </span>
      <div
        className="inline-flex overflow-hidden rounded-sm ring-1 ring-hairline-strong"
        role="radiogroup"
        aria-label="요약 깊이 선택"
      >
        {STEPS.map((s, i) => {
          const active = s.level === value;
          return (
            <button
              key={s.level}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s.level)}
              className={cn(
                "px-3 py-1.5 text-body-sm font-medium transition-colors",
                i > 0 && "border-l border-hairline-strong",
                active
                  ? "bg-primary text-primary-on"
                  : "bg-canvas text-ink-muted hover:bg-surface-1"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
