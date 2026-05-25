// API client for the FastAPI backend.

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Translate raw HTTP / network errors into user-language Korean. */
function friendlyError(status: number, raw: string): string {
  if (status === 0) return "서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.";
  if (status === 413) return "파일이 너무 커요. 10MB보다 작은 파일을 올려 주세요.";
  if (status === 415) return "지원하지 않는 파일 형식이에요. PDF · TXT · DOCX · HWPX만 가능합니다.";
  if (status === 429) return "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.";
  if (status === 502) return "변환 결과를 받지 못했어요. 한 번 더 시도해 주세요.";
  if (status === 503) return "서버가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.";
  if (status >= 500) return "서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  if (status === 400) return "입력값을 확인해 주세요.";
  // Try to surface a readable message if the API sent JSON {detail: "..."}
  try {
    const j = JSON.parse(raw);
    if (j && typeof j.detail === "string") return j.detail;
  } catch {
    /* not json */
  }
  return raw || "알 수 없는 오류가 발생했어요.";
}

export type GroundednessLabel = "grounded" | "notGrounded" | "notSure";
export type GroundednessBadge = "high" | "medium" | "low";

export interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string | null;
}

export interface KeyInfoItem {
  type: "의무" | "권리" | "기한" | "금액" | "연락처";
  content: string;
  deadline?: string | null;
  amount?: string | null;
  contact?: string | null;
}

export interface ChecklistItem {
  text: string;
  priority: "high" | "medium" | "low";
}

export interface RewriteResponse {
  rewrite: string;
  citations: string[];
  glossary: GlossaryTerm[];
  key_info: KeyInfoItem[];
  checklist: ChecklistItem[];
  groundedness: {
    label: GroundednessLabel;
    score: number | null;
    badge: GroundednessBadge;
  };
  document_id: string | null;
}

export interface ParseResponse {
  text: string;
  char_count: number;
}

export async function postParse(file: File): Promise<ParseResponse> {
  const fd = new FormData();
  fd.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${BASE}/parse`, { method: "POST", body: fd });
  } catch {
    throw new Error(friendlyError(0, ""));
  }
  if (!res.ok) {
    throw new Error(friendlyError(res.status, await res.text()));
  }
  return (await res.json()) as ParseResponse;
}

export async function postRewrite(text: string): Promise<RewriteResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, save_history: true }),
    });
  } catch {
    throw new Error(friendlyError(0, ""));
  }
  if (!res.ok) {
    throw new Error(friendlyError(res.status, await res.text()));
  }
  return (await res.json()) as RewriteResponse;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  original_text_preview: string;
  rewrite_preview: string;
  groundedness_label: string;
}

export async function getHistory(limit = 20): Promise<HistoryItem[]> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/history?limit=${limit}`, { cache: "no-store" });
  } catch {
    throw new Error(friendlyError(0, ""));
  }
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text()));
  const data = (await res.json()) as { items: HistoryItem[] };
  return data.items;
}

export interface HistoryDetail {
  id: string;
  created_at: string;
  original_text: string;
  rewrite: string;
  citations: string[];
  glossary: GlossaryTerm[];
  key_info: KeyInfoItem[];
  checklist: ChecklistItem[];
  groundedness: {
    label: GroundednessLabel;
    score: number | null;
    badge: GroundednessBadge;
  };
}

export async function getHistoryDetail(id: string): Promise<HistoryDetail> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/history/${encodeURIComponent(id)}`, { cache: "no-store" });
  } catch {
    throw new Error(friendlyError(0, ""));
  }
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text()));
  return (await res.json()) as HistoryDetail;
}

export async function deleteHistory(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/history/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
    });
  } catch {
    throw new Error(friendlyError(0, ""));
  }
  if (!res.ok && res.status !== 204) {
    throw new Error(friendlyError(res.status, await res.text()));
  }
}
