import { cn } from "@/lib/cn";
import type { GroundednessBadge as Level, GroundednessLabel } from "@/lib/api";

/**
 * 신뢰도 배지 — 행정 톤. 색은 의미 전달에만 사용.
 * 사각 라벨, 둥근 pill 폐기.
 */
const STYLE: Record<Level, string> = {
  high: "bg-success/10 text-success ring-1 ring-success/30",
  medium: "bg-surface-2 text-ink-muted ring-1 ring-hairline",
  low: "bg-danger/10 text-danger ring-1 ring-danger/30",
};

const DOT: Record<Level, string> = {
  high: "bg-success",
  medium: "bg-ink-tertiary",
  low: "bg-danger",
};

const LABEL: Record<Level, string> = {
  high: "신뢰도 높음",
  medium: "신뢰도 보통",
  low: "원문 확인 권장",
};

const RAW_KO: Record<GroundednessLabel, string> = {
  grounded: "원문과 일치",
  notGrounded: "원문과 불일치",
  notSure: "확신할 수 없음",
};

export function GroundednessBadge(props: { level: Level; raw: GroundednessLabel }) {
  return (
    <span
      title={`AI 검증: ${RAW_KO[props.raw]}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-caption font-bold tracking-wider",
        STYLE[props.level]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-sm", DOT[props.level])} aria-hidden />
      {LABEL[props.level]}
    </span>
  );
}
