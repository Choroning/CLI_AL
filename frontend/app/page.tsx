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
  tall = false,
}: {
  children: React.ReactNode;
  className?: string;
  last?: boolean;
  /** Hero 처럼 화면에 꽉 차야 하는 섹션은 tall — 나머지는 콘텐츠 따라 자연 높이. */
  tall?: boolean;
}) {
  return (
    <section
      className={`snap-section ${tall ? "snap-section-tall" : ""} relative flex flex-col justify-center px-6 py-20 md:py-24 ${className}`}
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
    <Section tall>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
        {/* 왼쪽: 카피 + CTA + 통계 */}
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            행정문서가 어려운 모든 분께
          </span>
          <h1 className="mt-6 text-display-lg md:text-display-xl text-ink">
            공문이 어렵다고
            <br />
            <Typewriter />
          </h1>
          <p className="mt-8 text-body-lg text-ink leading-relaxed max-w-2xl">
            어려운 행정문서·공문·약관을 붙여넣으면 <strong>누구나 한 번에
            이해되는</strong> 한국어로 풀어드립니다. 모든 문장에 <strong>원문 출처</strong>와{" "}
            <strong>AI 검증 신뢰도</strong>를 함께 보여드려요.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/convert" className="btn-primary">
              지금 변환하기 →
            </Link>
            <Link href="/history" className="btn-secondary">
              변환 이력 보기
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value="누구나" label="이해되는 글" />
            <Stat value="100%" label="출처 인용" />
            <Stat value="5종" label="파일 형식" />
            <Stat value="A+" label="접근성" />
          </ul>
        </div>

        {/* 오른쪽: 변환 전후 미리보기 — 페이지에 들어오자마자 결과 감각을 준다 */}
        <div className="lg:col-span-5">
          <HeroPreview />
        </div>
      </div>
    </Section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      {/* 배경 발광 — 흰 캔버스에 깊이 한 겹 */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-3xl bg-primary-soft opacity-60 blur-2xl"
      />
      <div className="relative space-y-3">
        {/* 원문 카드 */}
        <article className="rounded-2xl bg-surface-1 ring-1 ring-hairline p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-md bg-surface-3 px-2 py-0.5 text-caption font-mono text-ink-muted">
              원문
            </span>
            <span className="text-caption text-ink-tertiary">행정문서</span>
          </div>
          <p className="text-body-sm leading-relaxed text-ink-muted">
            임차인은 본 계약체결일로부터 <strong className="text-ink">7일 이내</strong>에 임차보증금
            30,000,000원을 임대인이 지정한 계좌로 입금하여야 하며, 입금이{" "}
            <strong className="text-ink">지연될 경우 연 5%의 지연이자</strong>를 부담한다.
          </p>
        </article>

        {/* 화살표 */}
        <div className="flex items-center justify-center" aria-hidden>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-on shadow-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* 변환 결과 카드 — 강조 */}
        <article className="rounded-2xl bg-canvas ring-2 ring-primary p-5 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-0.5 text-caption font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              쉬운말
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-caption font-bold text-success">
              ● 신뢰도 높음
            </span>
          </div>
          <p className="text-body leading-relaxed text-ink">
            계약을 맺고 <strong>7일 안에</strong> 보증금{" "}
            <strong>3,000만 원</strong>을 집주인 계좌로 보내야 해요.
            <sup className="citation-marker !static !align-baseline ml-1">1</sup>
            <br />
            늦으면 <strong>1년에 5%</strong>의 지연이자를 더 내야 합니다.
            <sup className="citation-marker !static !align-baseline ml-1">2</sup>
          </p>

          {/* 미니 인포카드 */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-danger/5 border-l-4 border-l-danger p-2.5">
              <p className="text-caption font-bold text-danger">📅 기한</p>
              <p className="text-body-sm font-bold text-ink">계약 + 7일</p>
            </div>
            <div className="rounded-lg bg-success/5 border-l-4 border-l-success p-2.5">
              <p className="text-caption font-bold text-success">💰 금액</p>
              <p className="text-body-sm font-bold text-ink">3,000만 원</p>
            </div>
          </div>
        </article>
      </div>
    </div>
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
      icon: "📄",
      title: "붙여넣거나 올리기",
      body:
        "텍스트를 그대로 붙여넣거나 PDF · TXT · DOCX · HWPX 파일을 끌어다 놓으세요. 표·레이아웃은 그대로 보존됩니다.",
    },
    {
      n: "2",
      icon: "✨",
      title: "변환 버튼 누르기",
      body:
        "AI가 의미를 보존하면서 표현만 쉽게 바꿔드려요. 원문에 없는 정보는 절대 추가하지 않습니다.",
    },
    {
      n: "3",
      icon: "✅",
      title: "필요한 정보만 한눈에",
      body:
        "의무·권리·기한·금액·연락처가 카드로, 해야 할 일은 우선순위와 함께 체크리스트로 정리됩니다.",
    },
  ];
  return (
    <Section className="bg-surface-1">
      <SectionHeading eyebrow="사용 방법" title="세 단계로 끝나요" />
      <ol className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-4">
        {steps.map((s, i) => (
          <li key={s.n} className="relative">
            <div className="flex h-full flex-col gap-4 rounded-2xl bg-canvas ring-1 ring-hairline p-6 md:p-7 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <span className="num-badge" aria-hidden>
                  {s.n}
                </span>
                <span className="text-3xl" aria-hidden>{s.icon}</span>
              </div>
              <div>
                <h3 className="text-card-title text-ink">{s.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-ink-muted">{s.body}</p>
              </div>
            </div>
            {/* 데스크탑에서만 스텝 사이 화살표 */}
            {i < steps.length - 1 && (
              <div
                aria-hidden
                className="hidden md:flex absolute top-1/2 -right-3 z-10 h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-on shadow"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}
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
        <article className="rounded-2xl bg-surface-1 ring-1 ring-hairline p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-2xl" aria-hidden>
              🔗
            </div>
            <h3 className="text-card-title text-ink">근거 있는 재작성</h3>
          </div>
          <p className="mt-4 text-body leading-relaxed text-ink-muted">
            모델이 원문에 없는 정보를 추가하지 못하도록 시스템 프롬프트가 강제합니다.
            모든 재작성 문장에는 근거가 된 원문 부분을 가리키는 인용 마커가 따라
            붙어 클릭으로 확인할 수 있습니다.
          </p>
          {/* 미니 인용 마커 미리보기 */}
          <div className="mt-5 rounded-lg bg-canvas ring-1 ring-hairline p-3 text-body-sm text-ink leading-relaxed">
            계약 후 <strong>7일 안</strong>에 보증금을 보내야 해요.
            <sup className="citation-marker !static !align-baseline ml-1">1</sup>
          </div>
        </article>
        <article className="rounded-2xl bg-surface-1 ring-1 ring-hairline p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-success/15 text-2xl" aria-hidden>
              🎯
            </div>
            <h3 className="text-card-title text-ink">자동 검증 + 면책</h3>
          </div>
          <p className="mt-4 text-body leading-relaxed text-ink-muted">
            AI 검증 시스템이 재작성이 원문에 충실한지 자동으로 확인하고, 결과
            화면 우상단에 신뢰도 배지로 표시합니다. 결과 하단에는 법적 효력이
            없다는 면책이 항상 따라붙습니다.
          </p>
          {/* 미니 신뢰도 배지 미리보기 */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-caption font-bold text-success">
              ● 신뢰도 높음
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-caption font-bold text-warning">
              ● 신뢰도 보통
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-3 py-1 text-caption font-bold text-danger">
              ● 원문 확인 권장
            </span>
          </div>
        </article>
      </div>
    </Section>
  );
}

function FinalCTA() {
  const examples = [
    { icon: "🏠", title: "임대차 계약 특약", desc: "보증금·월세·해지 조건" },
    { icon: "🏥", title: "건강보험 안내문", desc: "보험료·자격·신청 방법" },
    { icon: "🎓", title: "청년 정책 공고", desc: "지원금·신청 기한·서류" },
  ];
  return (
    <Section last>
      <div className="relative overflow-hidden rounded-3xl bg-primary p-10 md:p-14 text-primary-on">
        {/* 배경 패턴 */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -left-10 -bottom-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

        <p className="relative text-body font-semibold text-white/80">시작하기</p>
        <h2 className="relative mt-3 text-headline md:text-display-md max-w-2xl">
          어떤 문서부터 변환해볼까요?
        </h2>
        <p className="relative mt-4 text-body-lg max-w-xl text-white/90">
          예시 문서로 바로 시작하거나, 갖고 계신 문서를 붙여넣어 보세요.
        </p>

        <ul className="relative mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {examples.map((e) => (
            <li
              key={e.title}
              className="rounded-xl bg-white/10 ring-1 ring-white/20 p-4 backdrop-blur-sm"
            >
              <p className="text-2xl" aria-hidden>{e.icon}</p>
              <p className="mt-2 font-bold">{e.title}</p>
              <p className="text-body-sm text-white/80">{e.desc}</p>
            </li>
          ))}
        </ul>

        <div className="relative mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/convert"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-white px-5 py-2.5 text-button font-bold text-primary hover:bg-white/90 transition-colors"
          >
            지금 변환하기 →
          </Link>
          <Link
            href="/history"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md ring-1 ring-white/40 px-5 py-2.5 text-button font-bold text-white hover:bg-white/10 transition-colors"
          >
            변환 이력 보기
          </Link>
        </div>
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
