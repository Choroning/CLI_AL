"use client";

import { cn } from "@/lib/cn";

// 결과 화면 토글 그룹.
//   신뢰도 — 인용 마커가 붙은 절을 Groundedness 점수 색으로 강조
//   Diff  — CLRS 15.4 LCS DP 결과를 색으로 보여줌
// 둘 다 기본 OFF. 끄면 평이한 텍스트로 돌아간다.

export function ResultToolbar({
  conf,
  diff,
  onConf,
  onDiff,
}: {
  conf: boolean;
  diff: boolean;
  onConf: () => void;
  onDiff: () => void;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-sm ring-1 ring-hairline-strong"
      role="group"
      aria-label="결과 보기 옵션"
    >
      <Btn active={conf} onClick={onConf} title="원문과의 일치도를 색으로 표시">
        신뢰도
      </Btn>
      <Btn
        active={diff}
        onClick={onDiff}
        title="원문 대비 변경 부분을 색으로 표시 (LCS DP)"
        bordered
      >
        Diff
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  title,
  bordered,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "px-3 py-1.5 text-body-sm font-medium transition-colors",
        bordered && "border-l border-hairline-strong",
        active
          ? "bg-primary text-primary-on"
          : "bg-canvas text-ink-muted hover:bg-surface-1"
      )}
    >
      {children}
    </button>
  );
}
