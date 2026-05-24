"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 접근성 도구 — 우측 하단 fixed 플로팅 패널.
 *
 * 글자 크기 3단계 + Bionic Reading + 줄 포커스.
 * 스크롤·페이지 이동과 무관하게 항상 같은 위치(우측 하단)에 떠 있다.
 * 본문을 가리지 않도록 compact + 살짝 투명 hover 패턴.
 */

type Size = "" | "size-l" | "size-xl";
const SIZE_KEY = "cli_al_font_size";
const BIONIC_KEY = "cli_al_bionic";
const LINE_FOCUS_KEY = "cli_al_line_focus";

export function AccessibilityBar() {
  const [size, setSize] = useState<Size>("");
  const [bionic, setBionic] = useState(false);
  const [lineFocus, setLineFocus] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = (localStorage.getItem(SIZE_KEY) as Size) || "";
      const b = localStorage.getItem(BIONIC_KEY) === "1";
      const l = localStorage.getItem(LINE_FOCUS_KEY) === "1";
      setSize(s);
      setBionic(b);
      setLineFocus(l);
    } catch {
      /* private mode */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.classList.remove("size-l", "size-xl");
    if (size) root.classList.add(size);
    root.classList.toggle("bionic", bionic);
    root.classList.toggle("line-focus", lineFocus);
    try {
      localStorage.setItem(SIZE_KEY, size);
      localStorage.setItem(BIONIC_KEY, bionic ? "1" : "0");
      localStorage.setItem(LINE_FOCUS_KEY, lineFocus ? "1" : "0");
    } catch {
      /* private mode */
    }
  }, [size, bionic, lineFocus, ready]);

  return (
    <div
      // fixed: 화면 스크롤·페이지 이동과 무관하게 같은 자리. 인쇄 시 숨김.
      data-print="hide"
      className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] rounded-md border border-hairline-strong bg-canvas shadow-lg"
      role="region"
      aria-label="접근성 도구"
    >
      <div className="border-b border-hairline px-3 py-1.5 text-caption font-bold tracking-wider text-ink-muted">
        접근성
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-caption text-ink-muted">
        <span className="font-medium">글자 크기</span>
        <SizeBtn label="가" active={size === ""}        onClick={() => setSize("")} base />
        <SizeBtn label="가" active={size === "size-l"}  onClick={() => setSize("size-l")} bigger />
        <SizeBtn label="가" active={size === "size-xl"} onClick={() => setSize("size-xl")} biggest />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-3 py-2 text-caption">
        <Toggle
          label="Bionic"
          title="단어 앞부분 굵게 — 가독성 향상"
          active={bionic}
          onClick={() => setBionic((v) => !v)}
        />
        <Toggle
          label="줄 포커스"
          title="마우스를 올린 줄만 선명하게"
          active={lineFocus}
          onClick={() => setLineFocus((v) => !v)}
        />
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

function Toggle({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-on"
          : "border-hairline-strong bg-canvas text-ink-muted hover:border-ink hover:text-ink"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-sm",
          active ? "bg-primary-on" : "bg-ink-tertiary"
        )}
        aria-hidden
      />
      {label}
    </button>
  );
}
