"use client";

import { cn } from "@/lib/cn";

// UX 시안 10 — 요약 줌 슬라이더 (Arc Browser 패턴).
// 인지부하를 사용자가 능동적으로 조절. 4단계.
//   1. 한 줄         : 가장 핵심만 한 줄 요약
//   2. 핵심 5문장    : 중요한 5문장 (기본값)
//   3. 전체 쉬운말   : 풀린 모든 문장
//   4. 원문 참고     : 원본 그대로

export type ZoomLevel = 1 | 2 | 3 | 4;

const STEPS: { level: ZoomLevel; label: string; sub: string }[] = [
  { level: 1, label: "한 줄",       sub: "TL;DR" },
  { level: 2, label: "핵심 5문장",  sub: "추천" },
  { level: 3, label: "전체 쉬운말", sub: "기본 변환" },
  { level: 4, label: "원문 참고",   sub: "비교용" },
];

export function ZoomSlider({
  value,
  onChange,
}: {
  value: ZoomLevel;
  onChange: (l: ZoomLevel) => void;
}) {
  return (
    <div className="rounded-xl bg-surface-1 ring-1 ring-hairline p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="eyebrow !text-primary">
          요약 줌 — 얼마나 자세히 볼까요?
        </p>
        <span className="text-caption text-ink-subtle hidden sm:inline">
          슬라이더로 깊이 조절
        </span>
      </div>
      <div
        className="flex items-stretch gap-1 rounded-full bg-canvas ring-1 ring-hairline p-1"
        role="radiogroup"
        aria-label="요약 깊이 선택"
      >
        {STEPS.map((s) => {
          const active = s.level === value;
          return (
            <button
              key={s.level}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(s.level)}
              className={cn(
                "flex-1 rounded-full px-2 py-2 transition-all text-center",
                active
                  ? "bg-primary text-primary-on shadow-sm"
                  : "text-ink-muted hover:bg-surface-2"
              )}
            >
              <div className={cn("text-xs font-bold", active ? "" : "text-ink")}>
                {s.label}
              </div>
              <div className={cn("text-[10px] font-mono mt-0.5", active ? "opacity-80" : "text-ink-subtle")}>
                {s.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
