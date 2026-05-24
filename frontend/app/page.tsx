"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * 랜딩 페이지 — 행정 신뢰형 톤 (정부24·복지로·GOV.UK 참고).
 *
 * 결정 사항:
 *   - snap scroll / scroll cue 전면 제거 — 일반 흐름 스크롤
 *   - hero stat 4칸·feature 9칸 카드 제거 — 핵심 4개로 압축
 *   - 카테고리별 색구분·풀컬러 CTA 폐기 — primary 1색 + ink 회색
 *   - 둥근 라운드 줄이고(rounded-md/sm), 그림자 제거, 1px hairline
 *   - 출처·근거·면책 정보를 hero·footer에 명시
 */

const HERO_PHRASES = [
  "권리를 놓치지 마세요.",
  "기한을 놓치지 마세요.",
  "혼자 고민하지 마세요.",
  "당황하지 마세요.",
  "불필요한 지출 하지 마세요.",
];
const TYPE_MS = 140;
const DELETE_MS = 75;
const HOLD_MS = 2600;
const PAUSE_MS = 700;

type Phase = "typing" | "holding" | "deleting" | "pausing";

function Typewriter() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    const phrase = HERO_PHRASES[idx];
    let timer: ReturnType<typeof setTimeout>;
    switch (phase) {
      case "typing":
        timer =
          text.length < phrase.length
            ? setTimeout(() => setText(phrase.slice(0, text.length + 1)), TYPE_MS)
            : setTimeout(() => setPhase("holding"), 0);
        break;
      case "holding":
        timer = setTimeout(() => setPhase("deleting"), HOLD_MS);
        break;
      case "deleting":
        timer =
          text.length > 0
            ? setTimeout(() => setText(phrase.slice(0, text.length - 1)), DELETE_MS)
            : setTimeout(() => setPhase("pausing"), 0);
        break;
      case "pausing":
        timer = setTimeout(() => {
          setIdx((i) => (i + 1) % HERO_PHRASES.length);
          setPhase("typing");
        }, PAUSE_MS);
        break;
    }
    return () => clearTimeout(timer);
  }, [text, phase, idx]);

  return (
    <span aria-hidden>
      <span className="text-primary">{text}</span>
      <span
        className="inline-block ml-1 align-[-0.1em] bg-primary animate-cursor-blink"
        style={{ width: "0.06em", height: "0.85em" }}
      />
    </span>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Trust />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-12 px-6 py-20 md:py-24 lg:grid-cols-12 lg:items-center">
        {/* 좌: 카피 + CTA */}
        <div className="lg:col-span-7">
          {/* 행정 사이트 톤의 사각 배지 */}
          <p className="inline-flex items-center gap-2 border-l-2 border-primary pl-3 text-caption font-bold tracking-wider text-primary">
            행정문서 쉬운말 변환기
          </p>
          <h1 className="mt-5 text-display-lg md:text-display-xl text-ink">
            공문이 어렵다고
            <br />
            <Typewriter />
          </h1>
          <p className="mt-7 text-body-lg text-ink leading-relaxed max-w-2xl">
            어려운 행정문서·공문·약관을 붙여넣으면 <strong>누구나 한 번에
            이해되는</strong> 한국어로 풀어드립니다. 모든 문장에 원문 출처와 AI
            검증 신뢰도를 함께 표시합니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/convert" className="btn-primary">
              지금 변환하기
            </Link>
            <Link href="/history" className="btn-secondary">
              변환 이력 보기
            </Link>
          </div>

          {/* 신뢰 라벨 — stat 카드 대신 1줄 텍스트 */}
          <dl className="mt-10 grid grid-cols-1 gap-3 border-t border-hairline pt-6 text-body-sm sm:grid-cols-3">
            <TrustLabel term="출처" detail="모든 문장에 원문 인용 마커 표시" />
            <TrustLabel term="검증" detail="Upstage Groundedness Check 자동 평가" />
            <TrustLabel term="면책" detail="참고용 결과 — 법적 효력 없음" />
          </dl>
        </div>

        {/* 우: 변환 전후 미리보기 — 카드 1쌍, 단색 톤 */}
        <div className="lg:col-span-5">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function TrustLabel({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-caption font-bold tracking-wider text-ink-muted shrink-0">
        {term}
      </dt>
      <dd className="text-ink-muted leading-snug">{detail}</dd>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="space-y-3">
      {/* 원문 */}
      <article className="rounded-md ring-1 ring-hairline bg-surface-1 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption font-bold tracking-wider text-ink-subtle">
            원문 · 행정문서
          </span>
        </div>
        <p className="text-body-sm leading-relaxed text-ink-muted">
          임차인은 본 계약체결일로부터 <strong className="text-ink">7일 이내</strong>에
          임차보증금 30,000,000원을 임대인이 지정한 계좌로 입금하여야 하며, 입금이{" "}
          <strong className="text-ink">지연될 경우 연 5%의 지연이자</strong>를 부담한다.
        </p>
      </article>

      {/* 화살표 — 색·그림자 제거, 단순 글리프 */}
      <div className="flex items-center justify-center text-ink-subtle" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* 변환 결과 — primary 1px 보더로만 강조 */}
      <article className="rounded-md ring-1 ring-primary bg-canvas p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption font-bold tracking-wider text-primary">
            쉬운말
          </span>
          <span className="text-caption text-ink-subtle">신뢰도 높음</span>
        </div>
        <p className="text-body leading-relaxed text-ink">
          계약을 맺고 <strong>7일 안에</strong> 보증금{" "}
          <strong>3,000만 원</strong>을 집주인 계좌로 보내야 해요.
          <sup className="citation-marker !static !align-baseline ml-1">1</sup>
          <br />
          늦으면 <strong>1년에 5%</strong>의 지연이자를 더 내야 합니다.
          <sup className="citation-marker !static !align-baseline ml-1">2</sup>
        </p>

        {/* 미니 핵심정보 — 카테고리 색 제거, ink 톤 사각 라벨 */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 text-body-sm">
          <div className="flex items-baseline gap-2">
            <dt className="text-caption font-bold tracking-wider text-ink-muted">기한</dt>
            <dd className="text-ink font-medium">계약 + 7일</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-caption font-bold tracking-wider text-ink-muted">금액</dt>
            <dd className="text-ink font-medium">3,000만 원</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "원문 입력",
      body:
        "텍스트를 붙여넣거나 PDF · TXT · DOCX · HWPX 파일을 올립니다. 표·레이아웃은 보존됩니다.",
    },
    {
      n: "02",
      title: "AI 변환",
      body:
        "Upstage Solar Pro 2가 원문 의미를 보존하면서 어려운 표현만 일상 한국어로 바꿉니다.",
    },
    {
      n: "03",
      title: "결과 확인",
      body:
        "쉬운말 본문, 어려운 용어 풀이, 핵심정보, 할 일 목록을 인용 출처와 함께 받습니다.",
    },
  ];
  return (
    <section className="border-b border-hairline bg-surface-1">
      <div className="mx-auto max-w-content px-6 py-20 md:py-24">
        <SectionHeading eyebrow="사용 방법" title="세 단계로 끝납니다" />
        <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-md bg-hairline ring-1 ring-hairline md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="bg-canvas p-7">
              <p className="font-mono text-caption font-bold text-primary">{s.n}</p>
              <h3 className="mt-3 text-card-title text-ink">{s.title}</h3>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    {
      title: "근거 있는 재작성",
      body:
        "모델이 원문에 없는 정보를 추가하지 못하도록 시스템 프롬프트가 강제합니다. 모든 재작성 문장에는 근거가 된 원문 부분을 가리키는 인용 마커가 따라붙어 클릭으로 확인할 수 있습니다.",
    },
    {
      title: "자동 검증 + 면책",
      body:
        "Upstage Groundedness Check가 재작성이 원문에 충실한지 자동 평가하고, 결과 화면 상단에 신뢰도를 표시합니다. 모든 결과 하단에는 학술 결과물로 법적 효력이 없다는 면책이 고정됩니다.",
    },
  ];
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-content px-6 py-20 md:py-24">
        <SectionHeading eyebrow="신뢰 가이드" title="왜 결과를 믿어도 되는가" />
        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-md bg-hairline ring-1 ring-hairline md:grid-cols-2">
          {items.map((it) => (
            <article key={it.title} className="bg-canvas p-7">
              <h3 className="text-card-title text-ink">{it.title}</h3>
              <p className="mt-3 text-body leading-relaxed text-ink-muted">{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section>
      <div className="mx-auto max-w-content px-6 py-20 md:py-24">
        <div className="rounded-md border border-ink bg-canvas p-10 md:p-14">
          <p className="text-caption font-bold tracking-wider text-primary">
            시작하기
          </p>
          <h2 className="mt-3 text-headline md:text-display-md text-ink max-w-2xl">
            어떤 문서부터 변환해볼까요?
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted max-w-xl leading-relaxed">
            임대차 계약 특약, 건강보험공단 안내문, 청년 정책 신청 공고 등 어떤
            행정문서든 붙여넣어 보세요.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/convert" className="btn-primary">
              지금 변환하기
            </Link>
            <Link href="/history" className="btn-secondary">
              변환 이력 보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="max-w-3xl">
      <p className="border-l-2 border-primary pl-3 text-caption font-bold tracking-wider text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-headline md:text-display-md text-ink">{title}</h2>
    </header>
  );
}
