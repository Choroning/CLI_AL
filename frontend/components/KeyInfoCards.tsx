import type { KeyInfoItem } from "@/lib/api";

// UX 시안 12 — 인포카드 (Notion DB 패턴).
// 핵심정보 5종을 카드로 추출 + 카테고리별 색 보더.
// 카테고리 → 컬러 매핑:
//   기한  : 빨강 (시간 압박)
//   금액  : 초록 (돈)
//   의무  : 호박 (주의)
//   권리  : 파랑 (수혜)
//   연락처: 자주 (메타)

const CATEGORY: Record<
  KeyInfoItem["type"],
  { border: string; bg: string; chip: string; icon: string }
> = {
  기한:   { border: "border-l-danger",  bg: "bg-danger/5",  chip: "bg-danger/15 text-danger",   icon: "📅" },
  금액:   { border: "border-l-success", bg: "bg-success/5", chip: "bg-success/15 text-success", icon: "💰" },
  의무:   { border: "border-l-warning", bg: "bg-warning/5", chip: "bg-warning/15 text-warning", icon: "⚠️" },
  권리:   { border: "border-l-primary", bg: "bg-primary/5", chip: "bg-primary/15 text-primary", icon: "✨" },
  연락처: { border: "border-l-ink-tertiary", bg: "bg-surface-2", chip: "bg-surface-3 text-ink-muted", icon: "📞" },
};

export function KeyInfoCards({ items }: { items: KeyInfoItem[] }) {
  if (items.length === 0) {
    return <p className="text-body text-ink">추출된 핵심정보가 없습니다.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((k, i) => {
        const c = CATEGORY[k.type] ?? CATEGORY["연락처"];
        return (
          <li
            key={i}
            className={`rounded-lg ${c.bg} ring-1 ring-hairline p-5 flex flex-col gap-3 border-l-4 ${c.border}`}
          >
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-bold ${c.chip}`}
            >
              <span aria-hidden>{c.icon}</span>
              {k.type}
            </span>
            <p className="text-body text-ink leading-relaxed">{k.content}</p>
            {(k.deadline || k.amount || k.contact) && (
              <dl className="grid grid-cols-3 gap-3 pt-3 border-t border-hairline text-body-sm">
                {k.deadline && <Field label="기한" value={k.deadline} />}
                {k.amount && <Field label="금액" value={k.amount} />}
                {k.contact && <Field label="연락처" value={k.contact} />}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-ink break-keep font-bold">{value}</dd>
    </div>
  );
}
