import { cn } from "@/lib/cn";
import type { GroundednessBadge as Level, GroundednessLabel } from "@/lib/api";

/**
 * Per DESIGN.md: avoid multi-color status. Surface ladder + a single dot.
 * Only "high" gets the allowed semantic-success green; others are monochrome.
 *
 * Tooltip and label are Korean — older users won't see English raw values.
 */
const DOT_CLASS: Record<Level, string> = {
  high: "bg-success",
  medium: "bg-ink-muted",
  low: "bg-ink-tertiary",
};

const LABEL: Record<Level, string> = {
  high: "신뢰도 높음",
  medium: "신뢰도 보통",
  low: "신뢰도 낮음",
};

const RAW_KO: Record<GroundednessLabel, string> = {
  grounded: "원문과 일치",
  notGrounded: "원문과 불일치",
  notSure: "확신할 수 없음",
};

export function GroundednessBadge(props: { level: Level; raw: GroundednessLabel }) {
  return (
    <span title={`AI 검증: ${RAW_KO[props.raw]}`} className="pill">
      <span
        className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[props.level])}
        aria-hidden
      />
      {LABEL[props.level]}
    </span>
  );
}
