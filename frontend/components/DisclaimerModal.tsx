"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cli_al_disclaimer_acknowledged_v1";

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const acked = window.localStorage.getItem(STORAGE_KEY);
    if (!acked) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    acceptRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      // Disclaimer is *required* — Escape does not dismiss it.
      if (e.key === "Escape") e.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="max-w-xl w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg bg-surface-1 ring-1 ring-hairline p-5 sm:p-6 md:p-8">
        <p className="eyebrow mb-3">이용 약관</p>
        <h2 id="disclaimer-title" className="text-card-title text-ink">
          이용 전 꼭 확인해주세요
        </h2>
        {/* 전역으로 word-break: keep-all 이 걸려 있어 한글이 띄어쓰기에서만
         *  끊긴다. justify 와 만나면 공백이 과하게 늘어나 보기 어색하므로 모달
         *  본문에서만 word-break 를 normal 로 풀어 자모/글자 사이 자연스러운
         *  줄바꿈을 허용. */}
        <div className="mt-5 space-y-4 text-body leading-relaxed text-ink text-justify [word-break:normal]">
          <p>
            본 서비스는 행정문서, 공문, 약관을 더 쉽게 읽도록 도와주는{" "}
            <strong className="font-semibold">참고용 도구</strong>입니다. 결과물은
            법적 효력이 없으며, 실제 권리, 의무, 기한은 반드시{" "}
            <strong className="font-semibold">원문, 발급 기관, 또는 전문가</strong>를 통해
            확인해 주세요.
          </p>
          <p>
            인공지능이 원문에 없는 정보를 추가하거나, 의미를 다르게 해석할 가능성이
            있습니다. 결과 화면의 신뢰도 및 인용 표시를 함께 살펴봐 주세요.
          </p>
          <p>
            세부 자문(예: "이 계약을 해야 할까요?")은 제공하지 않습니다.
          </p>
        </div>
        <div className="mt-7 flex justify-stretch sm:justify-end">
          <button
            ref={acceptRef}
            type="button"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
              setOpen(false);
            }}
            className="btn-primary w-full sm:w-auto"
          >
            확인했습니다, 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
