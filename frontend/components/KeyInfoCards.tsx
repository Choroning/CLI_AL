import type { KeyInfoItem } from "@/lib/api";
import { Bionic } from "@/lib/Bionic";

/**
 * 핵심정보 — 행정 신뢰형 톤.
 *
 * 카테고리별 색구분 제거 (이전의 5색 보더 폐기). 정부24·복지로처럼 모든
 * 항목을 같은 위계로 보여주고, 카테고리는 좌측 라벨 텍스트로만 구분한다.
 */
export function KeyInfoCards({ items }: { items: KeyInfoItem[] }) {
  if (items.length === 0) {
    return <p className="text-body text-ink">추출된 핵심정보가 없습니다.</p>;
  }
  return (
    <ul className="divide-y divide-hairline rounded-md ring-1 ring-hairline bg-canvas">
      {items.map((k, i) => (
        <li
          key={i}
          className="grid grid-cols-1 gap-1.5 px-5 py-4 sm:grid-cols-[7rem_1fr] sm:gap-6 sm:px-6"
        >
          <div className="text-body font-bold tracking-wider text-ink-muted sm:pt-0.5">
            {k.type}
          </div>
          <div className="space-y-2">
            <p className="text-body text-ink leading-relaxed">
              <Bionic text={k.content} />
            </p>
            {(k.deadline || k.amount || k.contact) && (
              // 글자 크기 토글(size-l/size-xl) 영향에서 분리 — inline style 로
              // 강제 고정해서 클래스 override / rem 상속 경로 모두 차단.
              <dl
                className="flex flex-wrap gap-x-6 gap-y-1"
                style={{ fontSize: "15px", lineHeight: 1.5 }}
              >
                {k.deadline && <Field label="기한" value={k.deadline} />}
                {k.amount && <Field label="금액" value={k.amount} />}
                {k.contact && <Field label="연락처" value={k.contact} />}
              </dl>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-ink-subtle" style={{ fontSize: "13px" }}>
        {label}
      </dt>
      <dd
        className="text-ink font-medium break-keep"
        style={{ fontSize: "15px" }}
      >
        {value}
      </dd>
    </div>
  );
}
