"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  getHistoryDetail,
  postParse,
  postRewrite,
  type RewriteResponse,
} from "@/lib/api";
import { CitationsPanel, RewriteText } from "@/components/RewriteText";
import { GlossaryList } from "@/components/GlossaryList";
import { KeyInfoCards } from "@/components/KeyInfoCards";
import { Checklist } from "@/components/Checklist";
import { Section } from "@/components/Section";
import { Dropzone } from "@/components/Dropzone";
import { ResultActions } from "@/components/ResultActions";

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
  return (
    <Suspense fallback={null}>
      <ConvertPageInner />
    </Suspense>
  );
}

function ConvertPageInner() {
  const searchParams = useSearchParams();
  const restoreId = searchParams.get("id");

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  /* 결과가 나타나면 html 에 convert-snap 클래스를 붙여 입력 페이지 ↔ 결과
   * 페이지 간 snap scroll 을 활성화하고, 결과 섹션으로 부드럽게 이동. 결과를
   * 비우거나(언마운트) 다시 입력으로 돌아오면 클래스 제거. */
  useEffect(() => {
    if (!result) {
      document.documentElement.classList.remove("convert-snap");
      return;
    }
    document.documentElement.classList.add("convert-snap");
    const t = setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => {
      clearTimeout(t);
      document.documentElement.classList.remove("convert-snap");
    };
  }, [result]);

  // 이력에서 진입(?id=) — 해당 변환 결과를 그대로 복원한다.
  useEffect(() => {
    if (!restoreId) return;
    let cancelled = false;
    setRestoring(true);
    setError(null);
    getHistoryDetail(restoreId)
      .then((d) => {
        if (cancelled) return;
        setText(d.original_text);
        setResult({
          rewrite: d.rewrite,
          citations: d.citations,
          glossary: d.glossary,
          key_info: d.key_info,
          checklist: d.checklist,
          groundedness: d.groundedness,
          preservation_ratio: null,
          summary: null,
          document_id: null,
        });
        setRestoredAt(d.created_at);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "이력을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restoreId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRestoredAt(null);
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
    <>
      <section className="snap-section min-h-[calc(100dvh-5rem)] flex flex-col">
        {/* 컨텐츠 컨테이너가 flex-col + flex-1 + min-h-0 으로 section 높이를
         *  채우고, 내부 form 이 다시 flex-1 로 잔여 공간을 점유. form 안 grid 가
         *  grid-rows-[auto_1fr_auto] 로 박스 행만 1fr 로 잡아 viewport 변화에
         *  비례 — 화면이 커지면 박스가 함께 커지고, 좁아져도 같이 줄어듦. */}
        <div className="section-pad mx-auto max-w-content w-full px-6 flex-1 flex flex-col gap-8 min-h-0">
          <header data-print="hide">
            <h1 className="text-display-md text-ink">원문 입력</h1>
            <p className="mt-3 text-body-lg text-ink-muted max-w-2xl">
              변환을 원하는 파일을 올리거나, 문장을 복사하여 붙여넣으세요.
            </p>
          </header>

          {restoring && (
            <div
              className="rounded-md bg-surface-1 ring-1 ring-hairline px-4 py-3 text-body-sm text-ink animate-pulse"
              data-print="hide"
            >
              이력에서 결과를 불러오는 중…
            </div>
          )}

          {restoredAt && !restoring && (
            <div
              className="rounded-md border-l-2 border-primary bg-surface-1 px-4 py-3 text-body-sm text-ink-muted"
              data-print="hide"
            >
              <span className="font-bold text-ink mr-2">이력 복원</span>
              {formatStamp(restoredAt)} 변환 결과를 불러왔습니다. 새로 변환하려면 원문을
              수정 후 “쉬운말로 변환하기”를 눌러 주세요.
            </div>
          )}

          <form
            id="convert-form"
            onSubmit={onSubmit}
            className="flex-1 flex flex-col min-h-0 gap-3"
            data-print="hide"
          >
            {/* 두 컬럼 wrapper(=block) 구조. lg 이상에서는 grid 가 단일 1fr row
             *  을 채워 두 컬럼이 같은 높이로 stretch, 내부 박스는 flex-1 로 자라
             *  → viewport 비례 박스. 모바일에서는 grid 가 단순 stacked 단열. */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-10 lg:grid-rows-[1fr] lg:items-stretch flex-1 min-h-0">
              {/* file column */}
              <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
                <h2 className="text-body font-medium text-ink-muted">① 파일에서 가져오기</h2>
                <Dropzone
                  onFile={onFile}
                  disabled={parsing || loading}
                  className="flex-1 min-h-0"
                />
                {/* text column 의 [개인정보 안내문] 줄과 높이를 맞추는 invisible
                 *  spacer — 박스 하단이 같은 라인에서 끝나도록.
                 *  parsing 중에는 그 자리를 안내문구가 차지. */}
                {parsing ? (
                  <div className="rounded-md bg-surface-1 ring-1 ring-hairline px-4 py-2 text-body-sm text-ink animate-pulse">
                    문서를 분석하고 있습니다…
                  </div>
                ) : (
                  <p className="text-caption text-ink-subtle invisible select-none" aria-hidden>
                    spacer
                  </p>
                )}
              </div>

              {/* text column */}
              <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
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
                  className="input flex-1 min-h-[160px] resize-none text-body leading-relaxed text-ink"
                  maxLength={20000}
                />
                <p className="text-caption text-ink-subtle text-right">
                  개인정보는 삭제 후 입력해주세요.
                </p>
              </div>
            </div>

            {/* 변환 인디케이터 + 버튼 — grid 아래 전체 너비 행.
             *  인디케이터는 파일 박스 아래 좌측 끝부터 [예시 보기] 직전까지 차지. */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {loading && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex-1 min-h-[44px] rounded-sm bg-surface-1 ring-1 ring-hairline px-5 flex items-center gap-3 text-body text-ink"
                >
                  <svg
                    aria-hidden
                    className="h-5 w-5 shrink-0 animate-spin text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeOpacity="0.25"
                      strokeWidth="3"
                    />
                    <path
                      d="M22 12a10 10 0 0 1-10 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>변환 중입니다. 잠시만 기다려 주세요.</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setText(SAMPLE)}
                disabled={loading}
                className="btn-secondary"
              >
                예시 보기
              </button>
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="btn-primary"
              >
                쉬운말로 변환하기
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

        </div>
      </section>

      {result && (
        <section
          ref={resultRef}
          className="snap-section min-h-[calc(100dvh-5rem)] flex flex-col bg-surface-1"
        >
          <div className="section-pad mx-auto max-w-content w-full px-6 flex-1 flex flex-col min-h-0">
            <ResultView result={result} original={text} />
          </div>
        </section>
      )}
    </>
  );
}

/** YYYY.MM.DD HH:mm 형태로 사람이 읽기 좋게. */
function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 쉬운말 재작성 ↔ 출처 인용 패널 스크롤 동기화.
 *
 * 방식: 본문(왼쪽) 컨테이너 상단에 *현재 보이는 첫 마커* `[N]` 을 찾아 오른쪽
 * 패널의 해당 항목 [N] 이 컨테이너 상단에 오도록 부드럽게 스크롤. 사용자가
 * 보고 있는 본문 영역의 가장 위쪽 마커가 곧 오른쪽 패널의 가장 위쪽 항목과
 * 일치 — 즉 9·10·11 이 본문에 보이면 9·10·11 이 인용 패널에도 보임.
 *
 * 경계 처리:
 *   - 본문 마지막 마커마저 위로 스쳐 지나갔으면 마지막 항목 정렬(scrollTop
 *     은 브라우저가 자동 clamp).
 *   - 본문에 마커가 없거나 오른쪽 항목이 없으면 no-op.
 *
 * 단방향(왼쪽 → 오른쪽) 동기화. 오른쪽에서 사용자가 자유 스크롤해도 본문은
 * 그대로 두고, 다음 본문 스크롤에서 다시 정합됨.
 */
function SyncedRewriteCitations({ result }: { result: RewriteResponse }) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const L = leftRef.current;
    const R = rightRef.current;
    if (!L || !R) return;

    let raf: number | null = null;
    let lastCurrent = -1;
    function update() {
      raf = null;
      if (!L || !R) return;
      const markers = Array.from(
        L.querySelectorAll<HTMLElement>("[data-citation-n]")
      );
      if (markers.length === 0) return;
      const lTop = L.getBoundingClientRect().top;
      // 컨테이너 상단 기준(아래로 8px 여유) 이하에 첫 등장하는 마커를 선택.
      // = 사용자가 본문에서 보고 있는 가장 위쪽 마커.
      let current: number | null = null;
      for (const m of markers) {
        if (m.getBoundingClientRect().top >= lTop - 8) {
          current = Number(m.dataset.citationN);
          break;
        }
      }
      // 모든 마커가 상단 위로 스쳐 지나간 상태 → 마지막 항목으로 정렬.
      if (current === null) {
        current = Number(markers[markers.length - 1].dataset.citationN);
      }
      if (current === lastCurrent) return;
      lastCurrent = current;
      const item = R.querySelector<HTMLElement>(
        `[data-citation-item="${current}"]`
      );
      if (!item) return;
      // rect-based 계산 — offsetParent 가 어디든 정확. 오른쪽 컨테이너 top 과
      // 항목 top 차이만큼 현재 scrollTop 에 가산. 끝/처음 위치도 브라우저가
      // 자동으로 clamp 하므로 추가 처리 불필요.
      const rRect = R.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const target = R.scrollTop + (itemRect.top - rRect.top);
      R.scrollTo({ top: target, behavior: "smooth" });
    }
    function onScroll() {
      if (raf != null) return;
      raf = requestAnimationFrame(update);
    }
    L.addEventListener("scroll", onScroll, { passive: true });
    // 초기 마운트 직후 한 번 동기화 — 새 결과가 떴을 때 오른쪽 패널이 잘못된
    // 이전 스크롤 위치에 머무는 것을 방지.
    update();
    return () => {
      L.removeEventListener("scroll", onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [result]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section title="쉬운말 재작성" accent>
        <div ref={leftRef} className="max-h-[32vh] overflow-y-auto pr-2">
          <RewriteText
            text={result.rewrite}
            citations={result.citations}
            glossary={result.glossary}
            hideCitations
          />
        </div>
      </Section>
      <Section title="출처 인용">
        <div ref={rightRef} className="max-h-[32vh] overflow-y-auto pr-2">
          <CitationsPanel citations={result.citations} />
        </div>
      </Section>
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
  /* snap-section 한 viewport(=100dvh-3.5rem) 안에 컨텐츠를 모두 들이는 컴팩트
   * 레이아웃. 텍스트가 길어질 수 있는 패널(원문, 쉬운말, 어려운 말 풀이, 해야
   * 할 일)에는 max-h + overflow-y-auto 로 자체 스크롤바가 보이도록 함. */
  /* 길이 비교용 — 쉬운말 본문에 박힌 인용 마커 [1] [2] 등은 사용자가 읽는
   * 실제 본문이 아니므로 길이에서 제외해야 정확한 "원문 대비 단축률" 이 나옴.
   *   delta > 0 → rewrite 가 더 짧음 (= 짧아진 비율)
   *   delta < 0 → rewrite 가 더 길어짐
   *   delta = 0 (또는 originalLength 0) → 미표시 */
  const rewriteCleanLen = result.rewrite.replace(/\[\d+\]/g, "").length;
  const delta =
    original.length > 0
      ? Math.round((1 - rewriteCleanLen / original.length) * 100)
      : 0;
  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-headline text-ink">변환 결과</h2>
          {delta !== 0 && (
            <p className="text-body-sm text-ink-muted">
              원문 대비{" "}
              <span className="font-mono tabular-nums text-ink font-semibold">
                {Math.abs(delta)}%
              </span>{" "}
              {delta > 0 ? "짧아졌어요." : "길어졌어요."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3" data-print="hide">
          <ResultActions result={result} />
        </div>
      </div>

      {/* 원문 패널은 제거 — 입력 페이지에서 위로 스크롤하면 보임. 대신 쉬운말
       *  재작성을 왼쪽으로 옮기고, 출처 인용을 오른쪽 독립 패널로 분리. 두 패널은
       *  SyncedRewriteCitations 가 progress 기반으로 스크롤 동기화. */}
      <SyncedRewriteCitations result={result} />

      <Section title="꼭 알아야 할 정보">
        <div className="max-h-[18vh] overflow-y-auto pr-2">
          <KeyInfoCards items={result.key_info} />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="어려운 말 풀이">
          <div className="max-h-[22vh] overflow-y-auto pr-2">
            <GlossaryList items={result.glossary} />
          </div>
        </Section>
        <Section title="해야 할 일">
          <div className="max-h-[22vh] overflow-y-auto pr-2">
            <Checklist items={result.checklist} />
          </div>
        </Section>
      </div>
    </div>
  );
}
