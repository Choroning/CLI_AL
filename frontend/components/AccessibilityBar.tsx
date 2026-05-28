"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  enableDyslexiaBionic,
  disableDyslexiaBionic,
} from "@/lib/dyslexiaBionic";

/**
 * 우측 하단 fixed 도구 패널 — 글자 크기 3단계 + 다크모드 토글.
 *
 * 모바일: 화면을 가리지 않도록 기본 닫힘. 아이콘 버튼 → 탭하면 패널이
 *   bottom-right 기준으로 scale + fade 로 펼쳐짐. 패널 내부 ✕ 로 다시 접음.
 * PC(sm 이상): 항상 펼친 상태로 유지 — 기존 동작 그대로.
 *
 * Bionic Reading 과 줄 포커스는 v2에서 상시 작동으로 전환 — 사용자가 켜고 끌
 * 필요 없이 기본 가독성 보조로 항상 동작.
 */

type Size = "" | "size-l" | "size-xl";
const SIZE_KEY = "cli_al_font_size";
const THEME_KEY = "cli_al_theme";
const DYSLEXIA_KEY = "cli_al_dyslexia";

export function AccessibilityBar() {
  const [size, setSize] = useState<Size>("");
  const [dark, setDark] = useState<boolean | null>(null);
  const [dyslexia, setDyslexia] = useState<boolean | null>(null);
  const [open, setOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const s = (localStorage.getItem(SIZE_KEY) as Size) || "";
      setSize(s);
    } catch {
      /* private mode */
    }
    setDark(document.documentElement.classList.contains("dark"));
    setDyslexia(document.documentElement.classList.contains("dyslexia-mode"));
  }, []);

  // 난독 모드 — 사이트 전역 텍스트에 어절 머리 강조(Bionic) 를 적용/해제.
  // dyslexia state 가 결정될 때마다 동기화. layout 의 themeBootstrap 으로
  // dyslexia-mode 클래스는 이미 붙어 있어도, JS walker 는 React 마운트 후에야
  // 가능하므로 이 effect 에서 첫 활성화가 일어난다.
  useEffect(() => {
    if (dyslexia === null) return;
    if (dyslexia) enableDyslexiaBionic();
    else disableDyslexiaBionic();
  }, [dyslexia]);

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

  function toggleDyslexia() {
    if (dyslexia === null) return;
    const next = !dyslexia;
    setDyslexia(next);
    document.documentElement.classList.toggle("dyslexia-mode", next);
    try {
      localStorage.setItem(DYSLEXIA_KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
  }

  // 모바일에서 패널 펼침 상태일 때, 패널·아이콘 버튼 바깥을 누르면 닫힘.
  // PC 는 어차피 항상 펼침이라 영향 없음.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div data-print="hide" className="fixed bottom-[16px] right-[16px] z-40">
      {/* 모바일 토글 아이콘 — 닫혔을 때 보임. sm 이상에서는 영구 hidden.
       *   글자 크기 옵션(size-l/size-xl)에 영향받지 않도록 모든 치수를 px arbitrary
       *   값으로 고정 — root font-size 변화에도 패널이 부풀지 않음. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="화면 표시 옵션 열기"
        aria-expanded={open}
        className={cn(
          "sm:hidden inline-flex h-[44px] w-[44px] items-center justify-center",
          "rounded-md border border-hairline-strong bg-canvas text-ink shadow-lg",
          "transition-all duration-200 ease-out origin-bottom-right",
          "hover:bg-surface-1 hover:border-ink",
          // 펼쳐졌으면 아이콘은 사라지면서 살짝 축소 — 패널이 같은 위치에서 나타나는 듯한 모션
          open && "scale-75 opacity-0 pointer-events-none"
        )}
      >
        <AccessibilityIcon />
      </button>

      {/* 패널 — 아이콘 버튼과 동일한 fixed wrapper 안에서 absolute 로 bottom-right 앵커.
       *   wrapper 자체가 bottom-4 right-4 이므로 패널은 거기에 정렬된 상태로 펼침/접힘.
       *   PC: scale-100 opacity-100 강제로 항상 보임. */}
      <div
        ref={panelRef}
        className={cn(
          "absolute bottom-0 right-0",
          "rounded-md border border-hairline-strong bg-canvas shadow-lg",
          "origin-bottom-right transition-all duration-200 ease-out",
          // 모바일 기본: 닫힘 → 축소 + 투명 + 클릭 불가
          "scale-90 opacity-0 pointer-events-none",
          // 모바일 펼침
          open && "scale-100 opacity-100 pointer-events-auto",
          // PC: 항상 펼침 (above 모바일 closed 클래스 override)
          "sm:scale-100 sm:opacity-100 sm:pointer-events-auto"
        )}
        role="region"
        aria-label="화면 표시 옵션"
        aria-hidden={!open ? true : undefined}
      >
        <div className="flex flex-nowrap items-center gap-[8px] px-[12px] py-[8px] text-[14px] text-ink-muted whitespace-nowrap">
          {/* 모바일 전용 닫기 — sm 이상에서는 hidden */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="옵션 닫기"
            className="sm:hidden inline-flex h-[28px] w-[28px] items-center justify-center rounded-sm border border-hairline-strong bg-canvas text-ink hover:border-ink transition-colors"
          >
            <CloseIcon />
          </button>

          <span className="font-medium">글자 크기</span>
          <SizeBtn label="가" active={size === ""}        onClick={() => setSize("")} base />
          <SizeBtn label="가" active={size === "size-l"}  onClick={() => setSize("size-l")} bigger />
          <SizeBtn label="가" active={size === "size-xl"} onClick={() => setSize("size-xl")} biggest />

          <span className="mx-[4px] h-[20px] w-px bg-hairline" aria-hidden />

          {dark !== null && (
            <button
              type="button"
              onClick={toggleDark}
              aria-pressed={dark}
              title={dark ? "라이트 모드로" : "다크 모드로"}
              className={cn(
                "inline-flex h-[28px] w-[28px] items-center justify-center rounded-sm border transition-colors",
                dark
                  ? "border-primary bg-primary text-primary-on"
                  : "border-hairline-strong bg-canvas text-ink hover:border-ink"
              )}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          )}

          {dyslexia !== null && (
            <button
              type="button"
              onClick={toggleDyslexia}
              aria-pressed={dyslexia}
              title={
                dyslexia
                  ? "난독증 서체 끄기"
                  : "난독증 서체 — OpenDyslexic + 어절 머리 강조"
              }
              aria-label="난독증 서체"
              className={cn(
                "inline-flex h-[28px] min-w-[28px] items-center justify-center rounded-sm border px-[6px] text-[12px] font-bold transition-colors",
                dyslexia
                  ? "border-primary bg-primary text-primary-on"
                  : "border-hairline-strong bg-canvas text-ink hover:border-ink"
              )}
            >
              난독
            </button>
          )}
        </div>
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
        "inline-flex h-[28px] w-[28px] items-center justify-center rounded-sm border font-bold transition-colors",
        active
          ? "border-primary bg-primary text-primary-on"
          : "border-hairline-strong bg-canvas text-ink hover:border-ink",
        base && "text-[12px]",
        bigger && "text-[14px]",
        biggest && "text-[16px]"
      )}
    >
      {label}
    </button>
  );
}

/** 접근성 옵션을 상징하는 사람 모양 아이콘 (universal a11y symbol 변형). */
function AccessibilityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M5 9h14" />
      <path d="M12 9v6" />
      <path d="M7 21l5-6 5 6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
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
