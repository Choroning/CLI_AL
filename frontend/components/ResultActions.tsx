"use client";

import { useState } from "react";
import type { RewriteResponse } from "@/lib/api";

export function ResultActions({ result }: { result: RewriteResponse }) {
  const [copied, setCopied] = useState(false);

  function buildPlain(): string {
    // 영문 enum → 한국어 라벨(화면 표기와 일치). 복사본 가독성 핵심.
    const PRIORITY: Record<string, string> = { high: "중요", medium: "보통", low: "참고" };
    const GROUND: Record<string, string> = {
      grounded: "근거 충분",
      notGrounded: "근거 부족",
      notSure: "불확실",
    };
    const BADGE: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };
    const HR = "──────────────────────────";

    const out: string[] = [];
    out.push("행정문서 쉬운말 변환 결과");
    if (result.summary) out.push(`요약: ${result.summary}`);
    out.push(HR, "■ 쉬운말 재작성", result.rewrite);

    if (result.citations.length) {
      out.push("", HR, "■ 원문 인용");
      result.citations.forEach((c, i) => out.push(`[${i + 1}] ${c}`));
    }
    if (result.key_info.length) {
      out.push("", HR, "■ 꼭 알아야 할 정보");
      result.key_info.forEach((k) => {
        const meta = [
          k.deadline && `기한 ${k.deadline}`,
          k.amount && `금액 ${k.amount}`,
          k.contact && `연락처 ${k.contact}`,
        ]
          .filter(Boolean)
          .join(" · ");
        out.push(`· [${k.type}] ${k.content}`);
        if (meta) out.push(`    (${meta})`);
      });
    }
    if (result.glossary.length) {
      out.push("", HR, "■ 어려운 말 풀이");
      result.glossary.forEach((g) => out.push(`· ${g.term}: ${g.definition}`));
    }
    if (result.checklist.length) {
      out.push("", HR, "■ 해야 할 일");
      result.checklist.forEach((c) =>
        out.push(`☐ [${PRIORITY[c.priority] ?? c.priority}] ${c.text}`),
      );
    }

    const g = result.groundedness;
    out.push(
      "",
      HR,
      `신뢰도: ${GROUND[g.label] ?? g.label} (${BADGE[g.badge] ?? g.badge})`,
      "※ 본 결과는 참고용입니다. 법적 효력은 원문·전문가 확인이 필요합니다.",
    );
    return out.join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildPlain());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user can still select & copy manually */
    }
  }

  function print() {
    window.print();
  }

  return (
    <div
      data-print="hide"
      className="flex flex-wrap items-center gap-2 text-body-sm"
      aria-label="결과 작업"
    >
      <button type="button" onClick={copy} className="btn-secondary" aria-live="polite">
        {copied ? "복사됨 ✓" : "결과 복사"}
      </button>
      <button type="button" onClick={print} className="btn-secondary">
        인쇄
      </button>
    </div>
  );
}
