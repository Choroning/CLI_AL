import type { GlossaryTerm } from "@/lib/api";

export function GlossaryList({ items }: { items: GlossaryTerm[] }) {
  if (items.length === 0) {
    return <p className="text-body text-ink">어려운 용어가 감지되지 않았습니다.</p>;
  }
  return (
    <dl className="space-y-3">
      {items.map((g) => (
        <div
          key={g.term}
          className="rounded-md bg-surface-2 ring-1 ring-hairline p-4"
        >
          <dt className="text-card-title text-ink">{g.term}</dt>
          <dd className="mt-2 text-body leading-relaxed text-ink">
            {g.definition}
            {g.example && (
              <div className="mt-3 text-body-sm text-ink">
                <span className="eyebrow inline-block mr-2">예</span>
                {g.example}
              </div>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
