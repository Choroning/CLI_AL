"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function ScrollCue() {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
      <div className="animate-scroll-cue flex flex-col items-center gap-0.5 text-ink-muted">
        <span className="text-body-sm font-medium">스크롤</span>
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <Section>
      <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
        행정문서가 어려운 모든 분께
      </span>
      <h1 className="mt-6 text-display-lg md:text-display-xl text-ink max-w-4xl">
        공문이 어렵다고
        <br />
        <Typewriter />
      </h1>
      <p className="mt-8 text-body-lg text-ink leading-relaxed max-w-2xl">
        어려운 행정문서·공문·약관을 붙여넣으면 <strong>초등 6학년 수준</strong>의
        한국어로 바꿔드립니다. 모든 문장에 원문 출처와 AI 검증 신뢰도를 함께 보여드려요.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link href="/convert" className="btn-primary">
          지금 변환하기 →
        </Link>
        <Link href="/history" className="btn-secondary">
          변환 이력 보기
        </Link>
      </div>

      <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value="초6" label="수준 한국어" />
        <Stat value="100%" label="출처 인용" />
        <Stat value="5종" label="파일 형식" />
        <Stat value="A+" label="접근성" />
      </ul>
    </Section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="rounded-2xl bg-surface-1 ring-1 ring-hairline p-5 text-center">
      <p className="text-3xl font-extrabold text-primary">{value}</p>
      <p className="mt-1 text-body-sm font-medium text-ink-muted">{label}</p>
    </li>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "붙여넣거나 올리기",
      body:
        "텍스트를 그대로 붙여넣거나 PDF · TXT · DOCX · HWPX 파일을 끌어다 놓으세요. 표·레이아웃은 그대로 보존됩니다.",
    },
    {
      n: "2",
      title: "변환 버튼 누르기",
      body:
        "AI가 의미를 보존하면서 표현만 쉽게 바꿔드려요. 원문에 없는 정보는 절대 추가하지 않습니다.",
    },
    {
      n: "3",
      title: "필요한 정보만 한눈에",
      body:
        "의무·권리·기한·금액·연락처가 카드로, 해야 할 일은 우선순위와 함께 체크리스트로 정리됩니다.",
    },
  ];
  return (
    <Section>
      <SectionHeading eyebrow="사용 방법" title="세 단계로 끝나요" />
      <ol className="space-y-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex items-start gap-5 rounded-xl bg-surface-1 ring-1 ring-hairline p-6 md:p-7"
          >
            <span className="num-badge" aria-hidden>
              {s.n}
            </span>
            <div>
              <h3 className="text-card-title text-ink">{s.title}</h3>
              <p className="mt-2 text-body leading-relaxed text-ink">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Features() {
  const items = [
    { icon: "✍️", title: "쉬운말 재작성", body: "원문 의미는 그대로, 표현만 일상 한국어로." },
    { icon: "📖", title: "어려운 용어 풀이", body: "법률·행정 용어를 사전식이 아닌 일상어로." },
    { icon: "📌", title: "핵심정보 카드", body: "의무·권리·기한·금액·연락처를 한 눈에." },
    { icon: "✅", title: "할 일 체크리스트", body: "실제 해야 할 일을 우선순위와 함께 정리." },
    { icon: "🔗", title: "출처 인용", body: "재작성 문장마다 어디서 왔는지 클릭으로 확인." },
    { icon: "🎯", title: "신뢰도 검증", body: "AI 검증으로 원문 충실도를 자동 확인." },
    { icon: "👵", title: "페르소나 모드", body: "65세 · 외국인 · 대학생 · 공무원 — 같은 문서, 4가지 모습." },
    { icon: "🔍", title: "요약 줌", body: "한 줄 / 핵심 5문장 / 전체 / 원문 — 슬라이더 하나로 조절." },
    { icon: "🟢", title: "신뢰도 그라데이션", body: "AI가 자신 없는 부분은 빨강으로 — 원문 확인 권장." },
  ];
  return (
    <Section>
      <SectionHeading eyebrow="결과 화면이 보여드리는 것" title="아홉 가지 정보를 한 번에" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.title}
            className="rounded-xl bg-surface-1 ring-1 ring-hairline p-6 transition-colors hover:ring-primary/40"
          >
            <p className="text-2xl" aria-hidden>{it.icon}</p>
            <h3 className="mt-3 text-card-title text-ink">{it.title}</h3>
            <p className="mt-2 text-body leading-relaxed text-ink">{it.body}</p>
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
        <article className="rounded-xl bg-surface-1 ring-1 ring-hairline p-7">
          <h3 className="text-card-title text-ink">근거 있는 재작성</h3>
          <p className="mt-3 text-body leading-relaxed text-ink">
            모델이 원문에 없는 정보를 추가하지 못하도록 시스템 프롬프트가 강제합니다.
            모든 재작성 문장에는 그 근거가 된 원문 부분을 가리키는 인용 마커가 따라
            붙고, 결과 화면에서 클릭해 확인할 수 있습니다.
          </p>
        </article>
        <article className="rounded-xl bg-surface-1 ring-1 ring-hairline p-7">
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
      <div className="rounded-2xl bg-primary-soft ring-1 ring-primary/30 p-12 md:p-section flex flex-col items-start gap-6">
        <p className="text-body font-medium text-primary">시작하기</p>
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

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="eyebrow !text-primary mb-3">{eyebrow}</p>
      <h2 className="text-headline md:text-display-md text-ink">{title}</h2>
    </header>
  );
}
