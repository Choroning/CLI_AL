"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteHistory, getHistory, type HistoryItem } from "@/lib/api";

const LABEL_KO: Record<string, string> = {
  grounded: "원문과 일치",
  notGrounded: "원문과 불일치",
};

const PAGE_SIZE = 8;

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isFirstPageRender = useRef(true);

  // 페이지 이동 시 리스트 상단으로 부드럽게 스크롤 — 사용자가 다시 스크롤
  // 내려가서 첫 항목을 찾을 필요 없도록. 첫 마운트에서는 동작 안 함.
  useEffect(() => {
    if (isFirstPageRender.current) {
      isFirstPageRender.current = false;
      return;
    }
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHistory(100)
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // 필터 결과로 페이지가 줄어들면 마지막 유효 페이지로 보정
  useEffect(() => {
    setPage((p) => Math.min(Math.max(p, 1), totalPages));
  }, [totalPages]);

  // 검색어 바뀌면 항상 1페이지로
  useEffect(() => {
    setPage(1);
    setConfirmingId(null);
  }, [query]);

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  async function handleDelete(id: string) {
    // 옵티미스틱: UI 에서 먼저 빼고 API 호출은 백그라운드. 백엔드 DELETE 가 아직
    // 배포 안 된 환경에서는 405 가 나도 배너로 노출하지 않는다 — UX 안정 우선.
    setDeletingId(id);
    setConfirmingId(null);
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await deleteHistory(id);
    } catch {
      /* 의도적으로 silent — 다음 새로고침에 서버 상태로 자동 복원됨 */
    } finally {
      setDeletingId(null);
    }
  }

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

      <ul ref={listRef} className="space-y-3 scroll-mt-20">
        {pageItems.map((item) => {
          const labelKo = LABEL_KO[item.groundedness_label];
          const stamp = formatStamp(item.created_at);
          const isConfirming = confirmingId === item.id;
          const isDeleting = deletingId === item.id;
          return (
            <li key={item.id} className="relative">
              <Link
                href={`/convert?id=${encodeURIComponent(item.id)}`}
                className="block rounded-lg bg-surface-1 ring-1 ring-hairline p-5 pb-14 transition-colors hover:bg-surface-2 hover:ring-hairline-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
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

              {/* 삭제 영역 — Link 바깥 absolute. 카드 클릭과 분리됨 */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {isConfirming ? (
                  <>
                    <span className="text-caption text-ink-muted">정말 삭제할까요?</span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center min-h-[32px] rounded-sm px-3 py-1 text-caption font-medium bg-primary text-primary-on hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? "삭제 중…" : "삭제"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={isDeleting}
                      className="inline-flex items-center min-h-[32px] rounded-sm px-3 py-1 text-caption font-medium text-ink-muted hover:text-ink hover:bg-canvas ring-1 ring-hairline transition-colors disabled:opacity-50"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(item.id)}
                    className="inline-flex items-center min-h-[32px] rounded-sm px-3 py-1 text-caption font-medium text-ink-subtle hover:text-ink hover:bg-canvas ring-1 ring-transparent hover:ring-hairline transition-colors"
                    aria-label={`${stamp.date} ${stamp.time} 이력 삭제`}
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* 페이지네이션 — 결과가 PAGE_SIZE 보다 많을 때만 노출 */}
      {!loading && filtered.length > PAGE_SIZE && (
        <nav
          aria-label="이력 페이지 이동"
          className="flex items-center justify-center gap-3 border-t border-hairline pt-6"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center min-h-[40px] rounded-sm px-4 py-2 text-body-sm font-medium text-ink ring-1 ring-hairline-strong bg-canvas hover:bg-surface-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="text-body-sm text-ink-muted font-mono tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center min-h-[40px] rounded-sm px-4 py-2 text-body-sm font-medium text-ink ring-1 ring-hairline-strong bg-canvas hover:bg-surface-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </nav>
      )}
    </div>
  );
}

function formatStamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}
