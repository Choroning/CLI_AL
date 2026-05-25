"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getHistory, type HistoryItem } from "@/lib/api";

const LABEL_KO: Record<string, string> = {
  grounded: "원문과 일치",
  notGrounded: "원문과 불일치",
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHistory(50)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "이력을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.original_text_preview} ${it.rewrite_preview}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <div className="mx-auto max-w-content px-6 py-12 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">기록</p>
          <h1 className="text-display-md text-ink">변환 이력</h1>
          <p className="mt-3 text-body-lg text-ink">
            최근 변환된 결과를 시간순으로 보여드립니다. 항목을 누르면 변환 페이지에서
            그때의 결과를 다시 볼 수 있어요.
          </p>
        </div>
        <Link href="/convert" className="btn-secondary">
          새로 변환하기
        </Link>
      </header>

      {/* 검색 */}
      <div className="relative">
        <label htmlFor="history-search" className="sr-only">
          이력 검색
        </label>
        <input
          id="history-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="원문 또는 재작성 내용으로 검색"
          className="input pl-10 text-body"
          autoComplete="off"
        />
        <svg
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>

      {error && (
        <div className="rounded-md bg-surface-1 ring-1 ring-hairline-strong px-4 py-3 text-body-sm text-ink">
          <span className="font-mono mr-2 text-primary">!</span>
          {error}
        </div>
      )}

      {loading && (
        <p className="text-body text-ink-muted">이력을 불러오는 중…</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-body text-ink">아직 저장된 이력이 없습니다.</p>
      )}

      {!loading && !error && items.length > 0 && filtered.length === 0 && (
        <p className="text-body text-ink-muted">
          “{query}”에 해당하는 이력이 없습니다.
        </p>
      )}

      <ul className="space-y-3">
        {filtered.map((item) => {
          const labelKo = LABEL_KO[item.groundedness_label];
          const stamp = formatStamp(item.created_at);
          return (
            <li key={item.id}>
              <Link
                href={`/convert?id=${encodeURIComponent(item.id)}`}
                className="block rounded-lg bg-surface-1 ring-1 ring-hairline p-5 transition-colors hover:bg-surface-2 hover:ring-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-caption text-ink-subtle">
                    <time dateTime={item.created_at}>{stamp.date}</time>
                    <span className="mx-1.5 text-ink-tertiary">·</span>
                    <span className="font-mono">{stamp.time}</span>
                  </p>
                  {labelKo && <span className="pill">{labelKo}</span>}
                </div>
                <p className="mt-3 text-body text-ink leading-relaxed">
                  <span className="eyebrow inline-block mr-2">원문</span>
                  {item.original_text_preview}
                </p>
                <p className="mt-2 text-body text-ink leading-relaxed">
                  <span className="eyebrow inline-block mr-2">재작성</span>
                  {item.rewrite_preview}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "2026.05.25", "14:32" 두 토막으로 분리해 한 줄에 깔끔히 배치. */
function formatStamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}
