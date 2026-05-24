"use client";

import { cn } from "@/lib/cn";

// 요약 줌 — 4단계로 본문 깊이 조절.
//   1. 한 줄 / 2. 핵심 5문장 / 3. 전체 쉬운말 / 4. 원문 참고

export type ZoomLevel = 1 | 2 | 3 | 4;

const STEPS: { level: ZoomLevel; label: string }[] = [
  { level: 1, label: "한 줄" },
  { level: 2, label: "핵심 5문장" },
  { level: 3, label: "전체 쉬운말" },
  { level: 4, label: "원문 참고" },
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
