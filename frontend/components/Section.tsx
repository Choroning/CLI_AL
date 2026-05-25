import { cn } from "@/lib/cn";

/**
 * Feature card per DESIGN.md `feature-card` token:
 * surface-1 background, 1px hairline border, rounded-lg (12px), padding 24px.
 *
 * `accent` lifts the card to surface-2 with a lavender ring + lavender eyebrow
 * — used to mark the most important panel on a page (e.g. "쉬운말 재작성"
 * vs. the original-text panel on /convert results).
 */
export function Section({
  title,
  children,
  right,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-md p-6 flex flex-col",
        accent
          ? "bg-canvas ring-1 ring-primary"
          : "bg-canvas ring-1 ring-hairline"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2
          className={cn(
            "text-caption font-bold tracking-wider",
            accent ? "text-primary" : "text-ink-muted"
          )}
        >
          {title}
        </h2>
        {right}
      </div>
      {/* min-h-0 + relative → 자식이 absolute inset-0 으로 들어와도 부모 height 계산이
       *   자식 자연 높이를 따라 무한 팽창하지 않도록 막아 준다. block 자식은 평소처럼 동작. */}
      <div className="flex-1 min-h-0 relative">{children}</div>
    </section>
  );
}
