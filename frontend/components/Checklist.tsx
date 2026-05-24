"use client";

import { useMemo, useState } from "react";
import type { ChecklistItem } from "@/lib/api";
import { cn } from "@/lib/cn";

// UX 시안 08 — 체크리스트 자동 추출 + 우선순위 색바.
// CLRS 8.2 Counting Sort로 priority 정렬 (높음 → 낮음). 발표 핵심.

const PRI: Record<
  ChecklistItem["priority"],
  { bar: string; chip: string; label: string }
> = {
  high:   { bar: "bg-danger",        chip: "bg-danger/15 text-danger",   label: "높음" },
  medium: { bar: "bg-warning",       chip: "bg-warning/15 text-warning", label: "중간" },
  low:    { bar: "bg-ink-tertiary",  chip: "bg-surface-3 text-ink-muted", label: "낮음" },
};

const RANK: Record<ChecklistItem["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function Checklist({ items }: { items: ChecklistItem[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

  // CLRS 8.2 Counting Sort — priority bucket sort. 안정 정렬.
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
      <div className="flex items-center justify-between text-caption text-ink-muted">
        <span>
          진행률{" "}
          <span className="font-mono font-bold text-ink">
            {doneCount} / {total}
          </span>
        </span>
        <span className="font-mono text-ink-subtle">
          CLRS 8.2 우선순위 정렬
        </span>
      </div>
      <ul className="space-y-2">
        {sorted.map((c, i) => {
          const isDone = done.has(i);
          const p = PRI[c.priority];
          return (
            <li key={i}>
              <label
                className={cn(
                  "group flex cursor-pointer items-stretch gap-0 overflow-hidden rounded-lg ring-1 ring-hairline transition-colors hover:ring-primary/40",
                  isDone && "opacity-60"
                )}
              >
                <span className={cn("w-1 shrink-0", p.bar)} aria-hidden />
                <span className="flex flex-1 items-start gap-3 bg-surface-1 p-3">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggle(i)}
                    className="mt-1.5 h-4 w-4 rounded-xs border-hairline-strong bg-canvas text-primary focus:ring-primary-focus"
                  />
                  <span className="flex flex-1 flex-col gap-1">
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
                        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold",
                        p.chip
                      )}
                    >
                      우선순위 · {p.label}
                    </span>
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
