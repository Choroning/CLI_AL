"use client";

import { cn } from "@/lib/cn";

// UX 시안 11 — 페르소나 모드 (사회적 가치 시그니처).
// 같은 결과 데이터를 4가지 모드로 보여준다.
// 65세 어르신 / 외국인 학습자 / 대학생 / 공무원.
// data-persona 속성이 본문 컨테이너에 걸리면 글꼴·행간·영어 병기 여부가 자동 적용.

export type Persona = "senior" | "foreigner" | "student" | "official";

export const PERSONAS: { id: Persona; label: string; emoji: string; desc: string }[] = [
  { id: "senior",    label: "65세 어르신", emoji: "👵", desc: "큰 글씨 · 천천히 · 행 간 넓게" },
  { id: "foreigner", label: "외국인 학습자", emoji: "🌏", desc: "쉬운 한국어 · 영어 병기" },
  { id: "student",   label: "대학생 / MZ",   emoji: "🎓", desc: "요점 위주 · 캐주얼" },
  { id: "official",  label: "공무원 가족",   emoji: "⚖️", desc: "법령 출처 · 정확도 우선" },
];

export function PersonaSelector({
  value,
  onChange,
}: {
  value: Persona;
  onChange: (p: Persona) => void;
}) {
  return (
    <div
      className="rounded-xl bg-surface-1 ring-1 ring-hairline p-3 sm:p-4"
      role="radiogroup"
      aria-label="페르소나 선택"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow !text-primary">
          페르소나 — 누가 읽나요?
        </p>
        <span className="text-caption text-ink-subtle hidden sm:inline">
          같은 문서, 4가지 모습
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {PERSONAS.map((p) => {
          const active = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(p.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 transition-colors",
                active
                  ? "border-primary bg-primary-soft"
                  : "border-hairline bg-canvas hover:border-primary"
              )}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {p.emoji}
              </span>
              <span className={cn("text-sm font-bold", active ? "text-primary" : "text-ink")}>
                {p.label}
              </span>
              <span className="text-caption text-ink-subtle">{p.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
