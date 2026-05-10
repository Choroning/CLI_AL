"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Per DESIGN.md: no rainbow priority colors. We use the surface + single
 * lavender dot for high priority (link-emphasis usage), neutral ink for
 * medium, ink-tertiary for low. Conveys urgency monochromatically.
 */
const PRIORITY_DOT: Record<ChecklistItem["priority"], string> = {
  high: "bg-primary",
  medium: "bg-ink-muted",
  low: "bg-ink-tertiary",
};

export function Checklist({ items }: { items: ChecklistItem[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());

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

  return (
    <ul className="space-y-2.5">
      {items.map((c, i) => {
        const isDone = done.has(i);
        return (
          <li key={i}>
            <label className="group flex items-start gap-3 cursor-pointer rounded-md p-2 -mx-2 hover:bg-surface-2 transition-colors">
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggle(i)}
                className="mt-1 h-4 w-4 rounded-xs border-hairline-strong bg-surface-1 text-primary focus:ring-primary-focus"
              />
              <span className="flex flex-1 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0",
                    PRIORITY_DOT[c.priority]
                  )}
                  aria-label={`우선순위 ${c.priority}`}
                />
                <span
                  className={cn(
                    "flex-1 text-body leading-relaxed text-ink",
                    isDone && "line-through text-ink-tertiary"
                  )}
                >
                  {c.text}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
