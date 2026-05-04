"use client";

import { useState } from "react";
import { postParse, postRewrite, type RewriteResponse } from "@/lib/api";
import { GroundednessBadge } from "@/components/GroundednessBadge";
import { RewriteText } from "@/components/RewriteText";
import { GlossaryList } from "@/components/GlossaryList";
import { KeyInfoCards } from "@/components/KeyInfoCards";
import { Checklist } from "@/components/Checklist";
import { Section } from "@/components/Section";
import { Dropzone } from "@/components/Dropzone";
import { ResultActions } from "@/components/ResultActions";

const SAMPLE = `제3조(임차인의 의무) 임차인은 본 계약체결일로부터 7일 이내에 임차보증금 30,000,000원을 임대인이 지정한 계좌로 입금하여야 하며, 입금이 지연될 경우 연 5%의 지연이자를 부담한다. 임차인은 임대차 기간 중 사회통념상 정상적인 사용·수익에 해당하지 아니하는 변경 또는 훼손을 가하여서는 아니 되며, 위반 시 원상회복에 필요한 비용 일체를 부담한다.`;

export default function ConvertPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RewriteResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await postRewrite(text);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file: File) {
    setParsing(true);
    setError(null);
    try {
      const r = await postParse(file);
      setText(r.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 읽지 못했어요.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="mx-auto max-w-content px-6 py-12 space-y-12">
      <header data-print="hide">
        <p className="eyebrow mb-3">변환</p>
        <h1 className="text-display-md text-ink">원문 입력</h1>
        <p className="mt-3 text-body-lg text-ink max-w-2xl">
          변환을 원하는 파일을 올리거나, 문장을 복사하여 붙여넣으세요.
        </p>
      </header>

      {/* Form wraps both panes AND the action bar so columns stretch to a
          shared height while actions live below, full-width. This fixes the
          previous mistake of putting buttons inside the right column only —
          the column heights matched but the bottom edges did not. */}
      <form onSubmit={onSubmit} className="space-y-5" data-print="hide">
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-10 lg:items-stretch">
          {/* Left: file pane (30%) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h2 className="eyebrow">① 파일에서 가져오기</h2>
            <Dropzone
              onFile={onFile}
              disabled={parsing || loading}
              className="flex-1"
            />
            {parsing && (
              <div className="rounded-md bg-surface-1 ring-1 ring-hairline px-4 py-3 text-body-sm text-ink animate-pulse">
                문서를 분석하고 있습니다…
              </div>
            )}
          </div>

          {/* Right: text pane (70%) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="text-pane-heading" className="eyebrow">
                ② 원문 텍스트
              </h2>
              <span className="text-caption text-ink-subtle font-mono">
                {text.length.toLocaleString()} / 20,000
              </span>
            </div>
            <textarea
              id="src"
              aria-labelledby="text-pane-heading"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 행정문서, 공문, 약관 텍스트를 붙여넣으세요. 왼쪽에서 파일을 올리면 자동으로 채워집니다."
              className="input flex-1 min-h-[260px] resize-none text-body leading-relaxed text-ink"
              maxLength={20000}
            />
          </div>
        </section>

        {/* Action bar — full width, below both columns. */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="btn-secondary"
          >
            예시 입력 채우기
          </button>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="btn-primary"
          >
            {loading ? "변환 중…" : "쉬운말로 변환"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-surface-1 ring-1 ring-hairline-strong px-4 py-3 text-body-sm text-ink"
          data-print="hide"
        >
          <span className="font-mono mr-2 text-primary">!</span>
          {error}
        </div>
      )}

      {loading && (
        <div
          className="rounded-lg bg-surface-1 ring-1 ring-hairline p-6 animate-pulse text-body text-ink"
          data-print="hide"
        >
          인공지능에 요청 중… 보통 5–15초 걸립니다.
        </div>
      )}

      {result && <ResultView result={result} original={text} />}
    </div>
  );
}

function ResultView({
  result,
  original,
}: {
  result: RewriteResponse;
  original: string;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">변환 결과</p>
          <h2 className="text-headline text-ink">읽기 쉬운 버전</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GroundednessBadge
            level={result.groundedness.badge}
            raw={result.groundedness.label}
          />
          <ResultActions result={result} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="원문">
          <p className="text-body leading-relaxed text-ink whitespace-pre-wrap">
            {original}
          </p>
        </Section>
        <Section title="쉬운말 재작성">
          <RewriteText text={result.rewrite} citations={result.citations} />
        </Section>
      </div>

      <Section title="핵심정보">
        <KeyInfoCards items={result.key_info} />
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="어려운 용어 풀이">
          <GlossaryList items={result.glossary} />
        </Section>
        <Section title="액션 체크리스트">
          <Checklist items={result.checklist} />
        </Section>
      </div>
    </div>
  );
}
