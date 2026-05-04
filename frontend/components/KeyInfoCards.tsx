import type { KeyInfoItem } from "@/lib/api";

/**
 * Per DESIGN.md: no multi-chromatic palettes for status. All cards share the
 * same surface-2 fill + hairline. Type is conveyed via the eyebrow label.
 * Body content uses full-contrast text-ink for readability — older users.
 */
export function KeyInfoCards({ items }: { items: KeyInfoItem[] }) {
  if (items.length === 0) {
    return <p className="text-body text-ink">추출된 핵심정보가 없습니다.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((k, i) => (
        <li
          key={i}
          className="rounded-lg bg-surface-2 ring-1 ring-hairline p-5 flex flex-col gap-3"
        >
          <span className="eyebrow">{k.type}</span>
          <p className="text-body text-ink leading-relaxed">{k.content}</p>
          {(k.deadline || k.amount || k.contact) && (
            <dl className="grid grid-cols-3 gap-3 pt-3 border-t border-hairline text-body-sm">
              {k.deadline && <Field label="기한" value={k.deadline} />}
              {k.amount && <Field label="금액" value={k.amount} />}
              {k.contact && <Field label="연락처" value={k.contact} />}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-ink font-mono break-keep">{value}</dd>
    </div>
  );
}
