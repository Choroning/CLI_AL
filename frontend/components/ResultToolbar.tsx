"use client";

import { cn } from "@/lib/cn";

// 결과 화면 우측 상단 토글 그룹.
//   09 신뢰도 그라데이션 — 인용 마커가 붙은 절을 Groundedness 점수 색으로 강조
//   05 Diff 시각화      — CLRS 15.4 LCS DP 결과를 색으로 직접 보여줌
// 끄면 평이한 텍스트로 돌아간다.

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
    <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 ring-1 ring-hairline p-1">
      <Pill
        active={conf}
        onClick={onConf}
        title="원문과의 일치도를 색으로 — 빨강은 원문 확인 권장"
        emoji="🎯"
      >
        신뢰도
      </Pill>
      <Pill
        active={diff}
        onClick={onDiff}
        title="CLRS 15.4 LCS DP 결과를 시각화 — 추가/제거/변경"
        emoji="🔀"
      >
        Diff
      </Pill>
    </div>
  );
}

function Pill({
  active,
  onClick,
  title,
  emoji,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-bold transition-colors",
        active
          ? "bg-primary text-primary-on"
          : "text-ink-muted hover:bg-surface-2"
      )}
    >
      <span aria-hidden>{emoji}</span>
      {children}
    </button>
  );
}
