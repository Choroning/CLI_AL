"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";

/**
 * 랜딩 페이지에 한정해 viewport 단위 snap scroll 활성화.
 * 다른 페이지로 이동하면 클래스를 제거해 일반 흐름 스크롤로 복귀.
 */
function useLandingSnap() {
  useEffect(() => {
    document.documentElement.classList.add("landing-snap");
    return () => document.documentElement.classList.remove("landing-snap");
  }, []);
}

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
  "불필요한 지출하지 마세요.",
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
  useLandingSnap();
  return (
    <>
      <Hero />
      <HowItWorks />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="snap-section border-b border-hairline min-h-[calc(100dvh-5rem)] flex items-center">
      <div className="section-pad mx-auto grid max-w-content grid-cols-1 gap-12 px-6 lg:grid-cols-12 lg:items-center w-full">
        {/* 좌: 카피 + CTA */}
        <div className="lg:col-span-8">
          {/* md+ 에서 살짝만 축소(80→72px) — 가장 긴 phrase 끝에서 cursor 가
           *  다음 줄로 떨어지는 빈도 완화. mobile(display-lg 56px) 은 유지. */}
          <h1 className="text-display-lg md:text-[72px] md:leading-[1.05] md:tracking-[-0.0375em] font-semibold text-ink">
            공문이 어렵다고
            <br />
            {/* 줄바꿈이 실제로 일어날 가능성이 있는 너비(< xl)에서는 두 줄 분량의 고정 높이로
             *  hero jitter 차단. xl 이상에서는 좌측 칼럼이 충분히 넓어 wrap 이 거의 없으므로
             *  1줄 높이만 reserve — 빈 공간이 위아래로 늘어지지 않음. */}
            <span className="block min-h-[2.4em] xl:min-h-[1.2em]">
              <Typewriter />
            </span>
          </h1>
          <p className="mt-7 text-body-lg text-ink leading-relaxed max-w-2xl">
            어려운 행정문서, 공문, 약관을 붙여넣으면 <strong>누구나 한 번에
            이해되는</strong> 한국어로 풀어드립니다. 모든 문장에 원문 출처와
            인공지능 검증 신뢰도를 함께 표시합니다.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/convert" className="btn-primary">
              지금 변환하기
            </Link>
            <Link href="/history" className="btn-secondary">
              변환 이력 보기
            </Link>
          </div>
        </div>

        {/* 우: 변환 전후 미리보기 — 좌측 타이핑 텍스트가 wrap 되지 않도록 폭을 좁힘 */}
        <div className="lg:col-span-4">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  // 글자 크기 토글(size-l/size-xl) 영향 완전 차단:
  // 두 박스(원문/쉬운말) 의 폰트·패딩·간격을 전부 px 로 고정.
  // 기준은 "중간" 토글(size-l, root 19px) 정도의 effective 크기에 맞춤
  //   — 본문 22px / 라벨 17px / dl 17·14px / padding 22px.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* 원문 */}
      <article
        className="rounded-md ring-1 ring-hairline bg-surface-1"
        style={{ padding: "22px" }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: "10px" }}
        >
          <span
            className="font-bold tracking-wider text-ink-subtle"
            style={{ fontSize: "17px" }}
          >
            원문 · 행정문서
          </span>
        </div>
        <p
          className="text-ink-muted"
          style={{ fontSize: "22px", lineHeight: 1.65 }}
        >
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
      <article
        className="rounded-md ring-1 ring-primary bg-canvas"
        style={{ padding: "22px" }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: "10px" }}
        >
          <span
            className="font-bold tracking-wider text-primary"
            style={{ fontSize: "17px" }}
          >
            쉬운말
          </span>
        </div>
        <p
          className="text-ink"
          style={{ fontSize: "22px", lineHeight: 1.7 }}
        >
          계약을 맺고 <strong>7일 안에</strong> 보증금{" "}
          <strong>3,000만 원</strong>을 집주인 계좌로 보내야 해요.
          <sup className="citation-marker !static !align-baseline ml-1">1</sup>
          <br />
          늦으면 <strong>1년에 5%</strong>의 지연이자를 더 내야 합니다.
          <sup className="citation-marker !static !align-baseline ml-1">2</sup>
        </p>

        {/* 미니 핵심정보 */}
        <dl
          className="grid grid-cols-2 border-t border-hairline"
          style={{
            fontSize: "17px",
            lineHeight: 1.5,
            marginTop: "18px",
            paddingTop: "14px",
            columnGap: "18px",
            rowGap: "10px",
          }}
        >
          <div className="flex items-baseline" style={{ gap: "10px" }}>
            <dt
              className="font-bold tracking-wider text-ink-muted"
              style={{ fontSize: "14px" }}
            >
              기한
            </dt>
            <dd className="text-ink font-medium" style={{ fontSize: "17px" }}>
              계약 + 7일
            </dd>
          </div>
          <div className="flex items-baseline" style={{ gap: "10px" }}>
            <dt
              className="font-bold tracking-wider text-ink-muted"
              style={{ fontSize: "14px" }}
            >
              금액
            </dt>
            <dd className="text-ink font-medium" style={{ fontSize: "17px" }}>
              3,000만 원
            </dd>
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
        "텍스트를 붙여넣거나 PDF, TXT, DOCX, HWPX 파일을 올립니다. 표와 레이아웃은 보존됩니다.",
    },
    {
      n: "02",
      title: "인공지능 변환",
      body:
        "Upstage Solar Pro 3가 원문 의미를 보존하면서 어려운 표현만 일상 한국어로 바꿉니다.",
    },
    {
      n: "03",
      title: "결과 확인",
      body:
        "쉬운말 본문, 어려운 용어 풀이, 핵심정보, 할 일 목록을 인용 출처와 함께 받습니다.",
    },
  ];
  return (
    <section className="snap-section border-b border-hairline bg-surface-1 min-h-[calc(100dvh-5rem)] flex items-center">
      <div className="section-pad mx-auto max-w-content w-full px-6">
        <SectionHeading eyebrow="사용 방법" title="세 단계로 끝납니다" />
        <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-md bg-hairline ring-1 ring-hairline md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="bg-canvas p-8 md:p-10">
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

function FinalCTA() {
  // 한 스냅 섹션 안에 시작하기 카드(canvas) + 푸터(surface-1)를 같이 묶어
  // 한 viewport 에 통째로 보이게 한다. 색·시각적 구분은 그대로 유지.
  //   - 외곽 section: viewport 높이로 스냅 정착
  //   - 상단 영역: flex-1 로 푸터 위 남은 공간을 채워 카드를 세로 중앙 배치
  //   - 하단 영역: 푸터 컴포넌트(surface-1 + border-t)
  return (
    <section className="snap-section min-h-[calc(100dvh-5rem)] flex flex-col">
      <div className="flex-1 flex items-center">
        <div className="section-pad mx-auto max-w-content w-full px-6">
          <div className="rounded-md border border-ink bg-canvas p-8 md:p-12">
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
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/convert" className="btn-primary">
                지금 변환하기
              </Link>
              <Link href="/history" className="btn-secondary">
                변환 이력 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
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
