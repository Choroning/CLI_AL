"use client";

import { Fragment } from "react";
import type { GlossaryTerm } from "@/lib/api";

export function GlossaryList({ items }: { items: GlossaryTerm[] }) {
  if (items.length === 0) {
    return <p className="text-body text-ink">어려운 용어가 감지되지 않았습니다.</p>;
  }

  // 같은 카드 그룹 안의 관련 용어 카드로 부드럽게 스크롤.
  function jumpTo(term: string) {
    const el = document.getElementById(termAnchorId(term));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <dl className="space-y-3">
      {items.map((g) => (
        <div
          key={g.term}
          id={termAnchorId(g.term)}
          className="scroll-mt-20 rounded-md bg-surface-2 ring-1 ring-hairline p-4"
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
          {g.related_terms && g.related_terms.length > 0 && (
            <p className="mt-3 pt-3 border-t border-hairline text-caption text-ink-subtle">
              <span className="font-bold text-ink-muted mr-2">함께 보기</span>
              {g.related_terms.map((t, i) => (
                <Fragment key={t}>
                  <a
                    href={`#${termAnchorId(t)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      jumpTo(t);
                    }}
                    className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
                  >
                    {t}
                  </a>
                  {i < g.related_terms!.length - 1 && (
                    <span className="mx-1.5 text-ink-tertiary">·</span>
                  )}
                </Fragment>
              ))}
            </p>
          )}
        </div>
      ))}
    </dl>
  );
}

/** id 로 안전하게 쓰일 수 있게 한글·특수문자 인코딩. CSS 선택자엔 안 쓰고
 *  document.getElementById 로만 조회하므로 길이/문자 제약 거의 없음. */
function termAnchorId(term: string): string {
  return `gloss-${encodeURIComponent(term)}`;
}
