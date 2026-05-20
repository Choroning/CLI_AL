import { getHistory } from "@/lib/api";

export const dynamic = "force-dynamic";

const RAW_KO: Record<string, string> = {
  grounded: "원문과 일치",
  notGrounded: "원문과 불일치",
  notSure: "확신할 수 없음",
};

export default async function HistoryPage() {
  let items: Awaited<ReturnType<typeof getHistory>> = [];
  let error: string | null = null;
  try {
    items = await getHistory(50);
  } catch (e) {
    error = e instanceof Error ? e.message : "이력을 불러오지 못했습니다.";
  }

  return (
    <div className="mx-auto max-w-content px-6 py-12 space-y-8">
      <header>
        <p className="eyebrow mb-3">기록</p>
        <h1 className="text-display-md text-ink">변환 이력</h1>
        <p className="mt-3 text-body-lg text-ink">
          최근 변환된 결과를 시간순으로 보여드립니다.
        </p>
      </header>

      {error && (
        <div className="rounded-md bg-surface-1 ring-1 ring-hairline-strong px-4 py-3 text-body-sm text-ink">
          <span className="font-mono mr-2 text-primary">!</span>
          {error}
        </div>
      )}

      {!error && items.length === 0 && (
        <p className="text-body text-ink">아직 저장된 이력이 없습니다.</p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg bg-surface-1 ring-1 ring-hairline p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-caption text-ink-subtle font-mono">
                {item.created_at}
              </p>
              <span className="pill">
                {RAW_KO[item.groundedness_label] ?? item.groundedness_label}
              </span>
            </div>
            <p className="mt-3 text-body text-ink leading-relaxed">
              <span className="eyebrow inline-block mr-2">원문</span>
              {item.original_text_preview}
            </p>
            <p className="mt-2 text-body text-ink leading-relaxed">
              <span className="eyebrow inline-block mr-2">재작성</span>
              {item.rewrite_preview}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
