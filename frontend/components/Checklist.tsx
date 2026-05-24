"use client";

import { useMemo, useState } from "react";
import type { ChecklistItem } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * 할 일 — CLRS 8.2 Counting Sort 로 priority 정렬.
 *
 * 색상은 우선순위(높음/중간/낮음) 의미 전달에만 최소로 사용:
 *   - 높음만 danger 라벨, 나머지는 ink 톤 — 행정 톤 유지를 위해 단조롭게.
 */

const RANK: Record<ChecklistItem["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const LABEL: Record<ChecklistItem["priority"], string> = {
  high: "긴급",
  medium: "보통",
  low: "참고",
};

export function Checklist({ items }: { items: ChecklistItem[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

  // CLRS 8.2 Counting Sort — priority bucket sort, 안정 정렬.
  const sorted = useMemo(() => {
    const buckets: ChecklistItem[][] = [[], [], []];
    items.forEach((it) => buckets[RANK[it.priority]].push(it));
    return buckets.flat();
  }, [items]);

  if (items.length === 0) {
    return <p className="text-body text-ink">생성된 할 일 목록이 없습니다.</p>;
  }

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const total = items.length;
  const doneCount = done.size;

  return (
    <div className="space-y-3">
      <div className="text-caption text-ink-muted">
        진행률{" "}
        <span className="font-mono font-bold text-ink">
          {doneCount} / {total}
        </span>
      </div>
      <ul className="divide-y divide-hairline rounded-md ring-1 ring-hairline bg-canvas">
        {sorted.map((c, i) => {
          const isDone = done.has(i);
          const isHigh = c.priority === "high";
          return (
            <li key={i}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-1",
                  isDone && "opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(i)}
                  className="mt-1.5 h-4 w-4 rounded-xs border-hairline-strong bg-canvas text-primary focus:ring-ink"
                />
                <span className="flex flex-1 items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      "text-body leading-snug text-ink",
                      isDone && "line-through text-ink-tertiary"
                    )}
                  >
                    {c.text}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-sm px-1.5 py-0.5 text-caption font-bold tracking-wider",
                      isHigh
                        ? "bg-danger/10 text-danger ring-1 ring-danger/30"
                        : "bg-surface-2 text-ink-muted ring-1 ring-hairline"
                    )}
                  >
                    {LABEL[c.priority]}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
