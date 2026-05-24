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
import { ZoomSlider, type ZoomLevel } from "@/components/ZoomSlider";

const SAMPLE = `주택임대차계약서

제1조(목적) 임대인 김○○(이하 "임대인")과 임차인 박○○(이하 "임차인")은 아래 표시 부동산에 관하여 임대차계약을 체결하며, 본 계약의 내용을 성실히 이행할 것을 약정한다.

제2조(임대차의 목적물) 임대차의 목적물은 서울특별시 마포구 망원동 123-45 소재 다세대주택 301호(전용면적 39.6㎡)로 한다.

제3조(임차인의 의무) ① 임차인은 본 계약체결일로부터 7일 이내에 임차보증금 30,000,000원을 임대인이 지정한 계좌로 입금하여야 하며, 입금이 지연될 경우 연 5%의 지연이자를 부담한다.
② 임차인은 매월 25일까지 당월분 차임 950,000원을 임대인 명의의 계좌(○○은행 123-456-789012)로 송금하여야 한다. 차임의 지급이 2기에 달하도록 연체될 경우 임대인은 본 계약을 해지할 수 있다.
③ 임차인은 임대차 기간 중 사회통념상 정상적인 사용·수익에 해당하지 아니하는 변경 또는 훼손을 가하여서는 아니 되며, 위반 시 원상회복에 필요한 비용 일체를 부담한다.

제4조(관리비 등) 임차인은 전기·수도·가스·인터넷 등 개별 사용량에 따라 부과되는 공과금 및 공동주택 관리비(월 약 80,000원)를 별도로 부담한다.

제5조(임대차 기간) 임대차 기간은 2026년 6월 1일부터 2028년 5월 31일까지 24개월로 한다. 임차인은 계약 만료일 2개월 전까지 임대인에게 갱신 또는 종료의 의사를 서면으로 통지하여야 하며, 통지가 없는 경우 동일한 조건으로 1년간 묵시적 갱신된 것으로 본다.

제6조(원상회복 및 보증금 반환) 임차인은 임대차 종료 시 목적물을 원상으로 회복하여 임대인에게 인도하여야 한다. 임대인은 임대차 종료 후 30일 이내에 보증금에서 미지급 차임·관리비·원상회복비용을 공제한 잔액을 임차인에게 반환한다.

제7조(계약의 해지) 다음 각 호의 사유가 발생한 경우 상대방은 즉시 본 계약을 해지할 수 있다.
1. 임차인이 차임을 2기 이상 연체한 경우
2. 임차인이 임대인의 동의 없이 목적물을 전대 또는 양도한 경우
3. 임차인이 목적물을 본래의 용도가 아닌 영업용으로 사용한 경우

제8조(분쟁의 해결) 본 계약과 관련하여 분쟁이 발생할 경우 양 당사자는 우선 상호 협의에 의하여 해결하며, 협의가 이루어지지 아니할 경우 임대인의 주소지를 관할하는 법원을 합의관할로 한다. 분쟁 조정이 필요한 경우 주택임대차분쟁조정위원회(☎ 1670-1234)에 신청할 수 있다.

특약사항: 반려동물의 사육은 사전 서면 동의 없이는 불가하며, 무단 사육 적발 시 임대인은 30일의 시정 기간을 부여한 후에도 시정되지 아니하면 본 계약을 해지할 수 있다.`;

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
        <p className="mt-3 text-body-lg text-ink-muted max-w-2xl">
          변환을 원하는 파일을 올리거나, 문장을 복사하여 붙여넣으세요.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" data-print="hide">
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-10 lg:items-stretch">
          <div className="lg:col-span-3 flex flex-col gap-3">
            <h2 className="text-body font-medium text-ink-muted">① 파일에서 가져오기</h2>
            <Dropzone onFile={onFile} disabled={parsing || loading} className="flex-1" />
            {parsing && (
              <div className="rounded-md bg-surface-1 ring-1 ring-hairline px-4 py-3 text-body-sm text-ink animate-pulse">
                문서를 분석하고 있습니다…
              </div>
            )}
          </div>

          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="text-pane-heading" className="text-body font-medium text-ink-muted">
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
              className="input flex-1 min-h-[420px] resize-none text-body leading-relaxed text-ink"
              maxLength={20000}
            />
            <p className="text-caption text-ink-subtle">
              개인정보(주민번호 · 계좌번호 등)는 사전에 가려서 입력해 주세요.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setText(SAMPLE)} className="btn-secondary">
            예시 입력 채우기
          </button>
          <button type="submit" disabled={loading || !text.trim()} className="btn-primary">
            {loading ? "변환 중…" : "쉬운말로 변환하기"}
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
          className="rounded-md bg-surface-1 ring-1 ring-hairline p-6 flex items-center gap-3 text-body text-ink"
          role="status"
          aria-live="polite"
          data-print="hide"
        >
          <svg aria-hidden className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>변환 중입니다. 잠시만 기다려 주세요.</span>
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
  const [zoom, setZoom] = useState<ZoomLevel>("full");

  const sentences = splitSentences(result.rewrite);
  const zoomText =
    zoom === "summary" ? sentences.slice(0, 5).join(" ") : result.rewrite;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2 !text-primary">변환 결과</p>
          <h2 className="text-headline text-ink">읽기 쉬운 버전</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3" data-print="hide">
          <GroundednessBadge level={result.groundedness.badge} raw={result.groundedness.label} />
          <ResultActions result={result} />
        </div>
      </div>

      <div data-print="hide">
        <ZoomSlider value={zoom} onChange={setZoom} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="원문">
          <div className="max-h-[480px] overflow-y-auto pr-2">
            <p className="text-body leading-relaxed text-ink whitespace-pre-wrap">
              {original}
            </p>
          </div>
        </Section>
        <Section
          title={zoom === "summary" ? "쉬운말 · 핵심 5문장" : "쉬운말 재작성"}
          accent
        >
          <RewriteText
            text={zoomText}
            citations={result.citations}
            glossary={result.glossary}
          />
        </Section>
      </div>

      <Section title="꼭 알아야 할 정보">
        <KeyInfoCards items={result.key_info} />
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="어려운 말 풀이">
          <GlossaryList items={result.glossary} />
        </Section>
        <Section title="해야 할 일">
          <Checklist items={result.checklist} />
        </Section>
      </div>

      <aside
        className="rounded-md border-l-2 border-ink bg-surface-1 px-6 py-5 text-body-sm text-ink-muted leading-relaxed"
        role="note"
      >
        <p className="font-bold text-ink mb-1">참고용 결과 · 법적 효력 없음</p>
        본 결과는 2026 봄학기 알고리즘 팀프로젝트(고려대 세종 DCSS309-00)의 학술
        결과물이며, <strong className="text-ink">법적 효력이 없습니다</strong>. 중요한
        결정 전에는 반드시 원문과 전문가(변호사·법무사·세무사 등)의 의견을 함께
        확인해 주세요.
      </aside>
    </div>
  );
}

function splitSentences(s: string): string[] {
  return s
    .split(/(?<=[\.!?。])\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
