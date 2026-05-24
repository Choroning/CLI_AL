"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

// UX 시안 06 — 사용자 ★ 확정. 글자 크기 3단계 + Bionic Reading + 줄 포커스.
// 모든 페이지 상단에 노출되어 노안·난독증·외국인 가독성 동시 해결.

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
    <div className="border-b border-hairline bg-surface-1">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-end gap-2 px-4 py-1.5 text-caption text-ink-muted">
        <span className="font-medium mr-1">글자 크기</span>
        <SizeBtn label="가" active={size === ""}     base onClick={() => setSize("")} />
        <SizeBtn label="가" active={size === "size-l"}     onClick={() => setSize("size-l")} bigger />
        <SizeBtn label="가" active={size === "size-xl"}    onClick={() => setSize("size-xl")} biggest />
        <span className="mx-2 h-3.5 w-px bg-hairline" aria-hidden />
        <Toggle
          label="Bionic"
          title="단어 앞부분 굵게 — 노안·난독증 가독성 향상"
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
        "inline-flex items-center justify-center rounded-md border px-2.5 py-1 font-bold transition-colors",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-hairline-strong bg-canvas text-ink hover:border-primary",
        base && "text-sm",
        bigger && "text-base",
        biggest && "text-lg"
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-hairline-strong bg-canvas text-ink-muted hover:border-primary hover:text-ink"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-primary" : "bg-ink-tertiary"
        )}
        aria-hidden
      />
      {label}
    </button>
  );
}
