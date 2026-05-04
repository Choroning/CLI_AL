"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ACCEPT = ".pdf,.txt,application/pdf,text/plain";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The clickable surface uses `flex-1` so it can grow to fill its container —
 * letting the parent layout match the height of a sibling input (e.g. the
 * textarea in /convert). Falls back to a sensible min-height when the parent
 * doesn't constrain it.
 */
export function Dropzone({
  onFile,
  disabled,
  className,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handle(file: File | null) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("파일이 10MB를 초과합니다.");
      return;
    }
    const ok =
      file.type === "application/pdf" ||
      file.type === "text/plain" ||
      /\.(pdf|txt)$/i.test(file.name);
    if (!ok) {
      setError("PDF 또는 TXT 파일만 업로드할 수 있습니다.");
      return;
    }
    onFile(file);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          handle(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="PDF 또는 TXT 파일 업로드"
        className={cn(
          "flex-1 min-h-[260px] grid place-items-center text-center cursor-pointer select-none transition-colors",
          "rounded-lg p-8 ring-1 ring-dashed",
          over
            ? "ring-primary bg-surface-2"
            : "ring-hairline-strong bg-surface-1 hover:ring-primary hover:bg-surface-2",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden
            className="grid h-12 w-12 place-items-center rounded-md bg-surface-2 ring-1 ring-hairline text-ink"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-body text-ink font-medium">
            파일을 끌어오거나 클릭해서 선택
          </p>
          <p className="text-body-sm text-ink">
            PDF · TXT · 최대 10MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && (
        <p role="alert" className="text-body-sm text-ink">
          <span className="text-primary mr-1.5">●</span>
          {error}
        </p>
      )}
    </div>
  );
}
