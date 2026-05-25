"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { RewriteResponse } from "@/lib/api";

const DYSLEXIA_KEY = "cli_al_dyslexia";

export function ResultActions({ result }: { result: RewriteResponse }) {
  const [copied, setCopied] = useState(false);
  const [dyslexia, setDyslexia] = useState<boolean | null>(null);

  useEffect(() => {
    setDyslexia(document.documentElement.classList.contains("dyslexia-mode"));
  }, []);

  function toggleDyslexia() {
    if (dyslexia === null) return;
    const next = !dyslexia;
    setDyslexia(next);
    document.documentElement.classList.toggle("dyslexia-mode", next);
    try {
      localStorage.setItem(DYSLEXIA_KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
  }

  function buildPlain(): string {
    const lines: string[] = [];
    lines.push("[쉬운말 재작성]");
    lines.push(result.rewrite);
    if (result.citations.length) {
      lines.push("");
      lines.push("[원문 인용]");
      result.citations.forEach((c, i) => lines.push(`[${i + 1}] ${c}`));
    }
    if (result.key_info.length) {
      lines.push("");
      lines.push("[핵심정보]");
      result.key_info.forEach((k) => {
        const meta = [
          k.deadline && `기한: ${k.deadline}`,
          k.amount && `금액: ${k.amount}`,
          k.contact && `연락처: ${k.contact}`,
        ]
          .filter(Boolean)
          .join(" · ");
        lines.push(`- (${k.type}) ${k.content}${meta ? ` — ${meta}` : ""}`);
      });
    }
    if (result.glossary.length) {
      lines.push("");
      lines.push("[어려운 용어]");
      result.glossary.forEach((g) => lines.push(`- ${g.term}: ${g.definition}`));
    }
    if (result.checklist.length) {
      lines.push("");
      lines.push("[할 일 목록]");
      result.checklist.forEach((c) => lines.push(`☐ (${c.priority}) ${c.text}`));
    }
    lines.push("");
    lines.push(`신뢰도: ${result.groundedness.label} (${result.groundedness.badge})`);
    lines.push("※ 본 결과는 참고용입니다. 법적 효력은 원문/전문가 확인이 필요합니다.");
    return lines.join("\n");
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
      {dyslexia !== null && (
        <button
          type="button"
          onClick={toggleDyslexia}
          aria-pressed={dyslexia}
          title={
            dyslexia
              ? "난독증 모드 끄기"
              : "난독증 모드 — 어절 머리 글자 강조"
          }
          className={cn(
            /* btn-secondary 와 동일한 사이징 토큰 — px-5 py-2.5, min-h-[44px], rounded-sm */
            "inline-flex items-center justify-center min-h-[44px] rounded-sm px-5 py-2.5 text-button ring-1 transition-colors",
            dyslexia
              ? "bg-primary text-primary-on ring-primary hover:bg-primary-hover"
              : "bg-canvas text-ink ring-hairline-strong hover:bg-surface-1 hover:ring-ink"
          )}
        >
          <span>
            <b style={{ fontWeight: 800 }}>난</b>독
          </span>
        </button>
      )}
      <button type="button" onClick={copy} className="btn-secondary" aria-live="polite">
        {copied ? "복사됨 ✓" : "결과 복사"}
      </button>
      <button type="button" onClick={print} className="btn-secondary">
        인쇄
      </button>
    </div>
  );
}
