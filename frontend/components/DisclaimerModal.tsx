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
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="max-w-xl w-full rounded-lg bg-surface-1 ring-1 ring-hairline p-8">
        <p className="eyebrow mb-3">이용 약관</p>
        <h2 id="disclaimer-title" className="text-card-title text-ink">
          이용 전 꼭 확인해주세요
        </h2>
        <div className="mt-5 space-y-4 text-body leading-relaxed text-ink">
          <p>
            본 서비스는 행정문서·공문·약관을 더 쉽게 읽도록 돕는{" "}
            <strong className="font-semibold">참고용 도구</strong>입니다. 변환 결과는
            법적 효력이 없으며, 실제 권리·의무·기한은 반드시{" "}
            <strong className="font-semibold">원문 또는 발급 기관·전문가</strong>를 통해
            확인해 주세요.
          </p>
          <p>
            인공지능 모델이 원문에 없는 정보를 추가하거나, 의미를 다르게 해석할 가능성이
            있습니다. 결과 화면의 신뢰도 배지와 인용 마커를 함께 살펴봐 주세요.
          </p>
          <p>
            법률·의료·세무 자문(예: "이 계약을 해야 할까요?")은 제공하지 않습니다. 자문이
            필요한 경우 해당 분야 전문가에게 문의해 주세요.
          </p>
        </div>
        <div className="mt-7 flex justify-end">
          <button
            ref={acceptRef}
            type="button"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
              setOpen(false);
            }}
            className="btn-primary"
          >
            확인했습니다, 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
