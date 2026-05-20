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
              <div className="mt-3 text-body text-ink leading-relaxed">
                <span className="inline-flex items-center rounded-sm bg-primary/15 text-primary ring-1 ring-primary/30 px-2 py-0.5 mr-2 text-caption font-semibold align-middle">
                  예
                </span>
                {g.example}
              </div>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
