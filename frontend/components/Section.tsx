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
        "rounded-lg p-6 transition-colors",
        accent
          ? "bg-surface-2 ring-2 ring-primary/40"
          : "bg-surface-1 ring-1 ring-hairline"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={cn("eyebrow", accent && "!text-primary")}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
