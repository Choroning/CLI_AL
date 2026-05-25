"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 우측 하단 fixed 도구 패널 — 글자 크기 3단계 + 다크모드 토글.
 *
 * Bionic Reading 과 줄 포커스는 v2에서 상시 작동으로 전환 — 사용자가 켜고 끌
 * 필요 없이 기본 가독성 보조로 항상 동작.
 */

type Size = "" | "size-l" | "size-xl";
const SIZE_KEY = "cli_al_font_size";
const THEME_KEY = "cli_al_theme";

export function AccessibilityBar() {
  const [size, setSize] = useState<Size>("");
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const s = (localStorage.getItem(SIZE_KEY) as Size) || "";
      setSize(s);
    } catch {
      /* private mode */
    }
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (size === null) return;
    const root = document.documentElement;
    root.classList.remove("size-l", "size-xl");
    if (size) root.classList.add(size);
    try {
      localStorage.setItem(SIZE_KEY, size);
    } catch {
      /* private mode */
    }
  }, [size]);

  function toggleDark() {
    if (dark === null) return;
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* private mode */
    }
  }

  return (
    <div
      data-print="hide"
      className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] rounded-md border border-hairline-strong bg-canvas shadow-lg"
      role="region"
      aria-label="화면 표시 옵션"
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-caption text-ink-muted">
        <span className="font-medium">글자 크기</span>
        <SizeBtn label="가" active={size === ""}        onClick={() => setSize("")} base />
        <SizeBtn label="가" active={size === "size-l"}  onClick={() => setSize("size-l")} bigger />
        <SizeBtn label="가" active={size === "size-xl"} onClick={() => setSize("size-xl")} biggest />

        <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />

        {dark !== null && (
          <button
            type="button"
            onClick={toggleDark}
            aria-pressed={dark}
            title={dark ? "라이트 모드로" : "다크 모드로"}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-sm border transition-colors",
              dark
                ? "border-primary bg-primary text-primary-on"
                : "border-hairline-strong bg-canvas text-ink hover:border-ink"
            )}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

function SizeBtn({
  label,
  active,
  onClick,
  base,
  bigger,
  biggest,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  base?: boolean;
  bigger?: boolean;
  biggest?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm border font-bold transition-colors",
        active
          ? "border-primary bg-primary text-primary-on"
          : "border-hairline-strong bg-canvas text-ink hover:border-ink",
        base && "text-xs",
        bigger && "text-sm",
        biggest && "text-base"
      )}
    >
      {label}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
