"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Phrases cycled by the hero typewriter — each completes the lead-in
 * "공문이 어렵다고 ___". Keep them short and end-stop-able.
 */
const HERO_PHRASES = [
  "권리를 놓치지 마세요.",
  "기한을 놓치지 마세요.",
  "혼자 고민하지 마세요.",
  "당황하지 마세요.",
  "불필요한 지출하지 마세요.",
];

// Tuned for older readers — slower than a typical typewriter effect so the
// motion isn't disorienting and the held phrase has plenty of read time.
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

/**
 * Landing page with full-viewport snap sections.
 *
 * Each section is `min-h-screen` and `snap-start`. The .snap-page class on
 * <html> (toggled by useEffect below) enables `scroll-snap-type: y mandatory`
 * for the document. Snap is removed on unmount so /convert and /history
 * scroll normally.
 *
 * Sticky header height is 3.5rem; `scroll-padding-top` in globals.css
 * accounts for that so sections snap with their content visible below the
 * header rather than under it.
 */
export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add("snap-page");
    return () => document.documentElement.classList.remove("snap-page");
  }, []);

  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Trust />
      <FinalCTA />
    </>
  );
}

function Section({
  children,
  className = "",
  last = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Suppress the scroll cue on the last section (nowhere to scroll). */
  last?: boolean;
}) {
  return (
    <section
      className={`snap-section relative flex flex-col justify-center px-6 py-16 ${className}`}
    >
      <div className="mx-auto w-full max-w-content">{children}</div>
      {!last && <ScrollCue />}
    </section>
  );
}

/**
 * "스크롤" label + large down-chevron, animated together.
 *
 * Animation (per spec): fade in at top → hold visible → move top→bottom while
 * fading out. Movement only begins AFTER fade-in completes.
 *
 * Tuned for the target audience (older readers): big chevron (40px), readable
 * label, ink-muted contrast (not the dimmer ink-subtle), slower 3s loop so the
 * cue is easy to notice and follow.
 */
function ScrollCue() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
    >
      <div className="animate-scroll-cue flex flex-col items-center gap-0.5 text-ink-muted">
        <span className="text-body-sm font-medium">스크롤</span>
        <svg
          className="h-10 w-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <Section>
      <h1 className="text-display-lg md:text-display-xl text-ink max-w-4xl">
        공문이 어렵다고
        <br />
        <Typewriter />
      </h1>
      <p className="mt-8 text-body-lg text-ink leading-relaxed max-w-2xl">
        어려운 행정문서·공문·약관을 붙여넣으면 의미를 보존한 쉬운말 재작성과 핵심정보·
        액션 체크리스트를 출처 인용·신뢰도 검증과 함께 보여드립니다.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link href="/convert" className="btn-primary">
          지금 변환하기 →
        </Link>
        <Link href="/history" className="btn-secondary">
          변환 이력 보기
        </Link>
      </div>
    </Section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "붙여넣거나 업로드",
      body:
        "텍스트를 직접 붙여넣거나 PDF·TXT 파일을 드롭하세요. PDF는 표·레이아웃을 보존하면서 마크다운으로 추출합니다.",
    },
    {
      n: "02",
      title: "쉬운말로 재작성",
      body:
        "인공지능이 원문 의미를 보존하면서 초등 6학년 수준의 한국어로 변환합니다. 출처 미상의 정보는 추가하지 않습니다.",
    },
    {
      n: "03",
      title: "핵심정보·체크리스트",
      body:
        "의무·권리·기한·금액·연락처를 카드로 정리하고, 사용자가 실제 해야 할 행동을 체크리스트로 보여드립니다.",
    },
  ];
  return (
    <Section>
      <SectionHeading eyebrow="어떻게 작동하나요" title="세 단계로 끝납니다" />
      <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-lg bg-surface-1 ring-1 ring-hairline p-6 flex flex-col gap-3"
          >
            <span className="font-mono text-caption text-ink-subtle">{s.n}</span>
            <h3 className="text-card-title text-ink">{s.title}</h3>
            <p className="text-body leading-relaxed text-ink">{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Features() {
  const items = [
    {
      title: "쉬운말 재작성",
      body:
        "원문 의미는 그대로, 표현만 일상 한국어로. 인용 마커 [1] [2]가 어디서 왔는지 알려줍니다.",
    },
    {
      title: "어려운 용어 풀이",
      body: "법률·행정 용어를 사전식이 아닌 일상어로 풀어 설명합니다. 예시도 함께.",
    },
    {
      title: "핵심정보 카드",
      body: "의무·권리·기한·금액·연락처를 한눈에 볼 수 있도록 카드로 정리.",
    },
    {
      title: "액션 체크리스트",
      body: "문서를 받고 사용자가 실제로 해야 할 일을 우선순위와 함께 정리.",
    },
    {
      title: "출처 인용",
      body: "재작성 문장마다 원문의 어느 부분에서 왔는지 표시. 클릭하면 원문 위치를 강조합니다.",
    },
    {
      title: "신뢰도 검증",
      body: "AI 검증 시스템이 재작성이 원문에 얼마나 충실한지 자동으로 확인합니다.",
    },
  ];
  return (
    <Section>
      <SectionHeading
        eyebrow="결과 화면이 보여드리는 것"
        title="여섯 가지 정보를 한 번에"
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.title}
            className="rounded-lg bg-surface-1 ring-1 ring-hairline p-6"
          >
            <h3 className="text-card-title text-ink">{it.title}</h3>
            <p className="mt-3 text-body leading-relaxed text-ink">{it.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Trust() {
  return (
    <Section>
      <SectionHeading eyebrow="신뢰 가이드" title="왜 결과를 믿어도 되는가" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="rounded-lg bg-surface-1 ring-1 ring-hairline p-6">
          <h3 className="text-card-title text-ink">근거 있는 재작성</h3>
          <p className="mt-3 text-body leading-relaxed text-ink">
            모델이 원문에 없는 정보를 추가하지 못하도록 시스템 프롬프트가 강제합니다.
            모든 재작성 문장에는 그 근거가 된 원문 부분을 가리키는 인용 마커가 따라
            붙고, 결과 화면에서 클릭해 확인할 수 있습니다.
          </p>
        </article>
        <article className="rounded-lg bg-surface-1 ring-1 ring-hairline p-6">
          <h3 className="text-card-title text-ink">자동 검증 + 면책</h3>
          <p className="mt-3 text-body leading-relaxed text-ink">
            AI 검증 시스템이 재작성이 원문에 충실한지 자동으로 확인하고, 결과 화면
            우상단에 신뢰도 배지로 표시합니다. 모든 결과 하단에는 법적 효력이
            없다는 면책이 고정됩니다.
          </p>
        </article>
      </div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <Section last>
      <div className="rounded-xl bg-surface-1 ring-1 ring-hairline p-12 md:p-section flex flex-col items-start gap-6">
        <p className="eyebrow">시작하기</p>
        <h2 className="text-headline md:text-display-md text-ink max-w-2xl">
          어떤 문서부터 변환해볼까요?
        </h2>
        <p className="text-body-lg text-ink max-w-xl">
          임대차 계약 특약, 건강보험공단 안내문, 청년 정책 신청 공고… 무엇이든 좋아요.
        </p>
        <Link href="/convert" className="btn-primary mt-2">
          지금 변환하기 →
        </Link>
      </div>
    </Section>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 className="text-headline md:text-display-md text-ink">{title}</h2>
    </header>
  );
}
