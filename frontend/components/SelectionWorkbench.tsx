"use client";

import { BookOpenText, FileInput, FileText, Loader2, PencilLine, Sparkles, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseDocument, simplifySelection, summarizeDocument } from "@/lib/api";
import type {
  DocumentParseResponse,
  SelectionMode,
  SelectionRequest,
  SelectionResponse,
  SelectionType,
  SimplifyResponse
} from "@/types/simplify";

type Props = {
  initialDocument: string;
};

type DocumentBlock = DocumentParseResponse["blocks"][number];
type TableCell = {
  text: string;
  colSpan: number;
  rowSpan: number;
};

type SelectedRange = {
  text: string;
  type: SelectionType;
  menuX: number;
  menuY: number;
};

const selectionModes: SelectionMode[] = ["explain", "fillExample"];

const modeLabels: Record<SelectionMode, string> = {
  explain: "설명하기",
  fillExample: "빈 칸이 있다면 예시 채우기",
  summarize: "전체 요약"
};

const modeIcons = {
  explain: BookOpenText,
  fillExample: PencilLine,
  summarize: FileText
};

const defaultBlocks = (text: string): DocumentBlock[] =>
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: line.length <= 32 && !/[.!?。！？]$/.test(line) ? "heading" : "paragraph",
      text: line
    }));

const normalizeRows = (rows: DocumentBlock["rows"] | undefined): TableCell[][] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row) => Array.isArray(row))
    .map((row) =>
      row.map((cell) => {
        if (typeof cell === "string") {
          return { text: cell, colSpan: 1, rowSpan: 1 };
        }

        return {
          text: cell.text ?? "",
          colSpan: Math.max(1, Number(cell.colSpan ?? 1)),
          rowSpan: Math.max(1, Number(cell.rowSpan ?? 1))
        };
      })
    )
    .filter((row) => row.some((cell) => cell.text.trim()));
};

const groupPages = (blocks: DocumentBlock[]) => {
  const pages: DocumentBlock[][] = [[]];

  for (const block of blocks) {
    if (block.type === "pageBreak") {
      if (pages[pages.length - 1].length > 0) {
        pages.push([]);
      }
      continue;
    }

    if (block.pageBreakBefore && pages[pages.length - 1].length > 0) {
      pages.push([]);
    }

    pages[pages.length - 1].push(block);
  }

  return pages.filter((page) => page.length > 0);
};

function renderDocumentBlock(block: DocumentBlock, index: number) {
  if (block.type === "heading") {
    return <h2 key={`${block.text}-${index}`}>{block.text}</h2>;
  }

  if (block.type === "list") {
    return (
      <p className="document-list-line" key={`${block.text}-${index}`}>
        {block.text}
      </p>
    );
  }

  if (block.type === "table") {
    const rows = normalizeRows(block.rows);

    return (
      <div className="document-table-wrap" key={`${block.text}-${index}`}>
        <table className="document-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${block.text}-${index}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${block.text}-${index}-${rowIndex}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                  >
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p key={`${block.text}-${index}`}>{block.text}</p>;
}

const getSelectionType = (text: string): SelectionType => {
  const trimmed = text.trim();

  if (!trimmed.includes(" ")) {
    return "word";
  }

  if (/[.!?。！？]$/.test(trimmed) || trimmed.length > 30) {
    return "sentence";
  }

  return "phrase";
};

const getExpandedContext = (documentText: string, selectedText: string) => {
  const normalizedSelection = selectedText.trim();
  const index = documentText.indexOf(normalizedSelection);

  if (index < 0 || normalizedSelection.length <= 4) {
    return documentText.slice(0, 3000);
  }

  const start = Math.max(0, index - 900);
  const end = Math.min(documentText.length, index + normalizedSelection.length + 900);
  return documentText.slice(start, end);
};

export function SelectionWorkbench({ initialDocument }: Props) {
  const [documentText, setDocumentText] = useState(initialDocument);
  const [documentBlocks, setDocumentBlocks] = useState<DocumentBlock[]>(() => defaultBlocks(initialDocument));
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectionResult, setSelectionResult] = useState<SelectionResponse | null>(null);
  const [summaryResult, setSummaryResult] = useState<SimplifyResponse | null>(null);
  const [selectionStatus, setSelectionStatus] = useState<"idle" | "loading" | "error">("idle");
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [highContrast, setHighContrast] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const resultRegionRef = useRef<HTMLDivElement>(null);

  const selectedDescription = useMemo(() => {
    if (!selectedRange) {
      return "";
    }
    if (selectedRange.type === "word") {
      return "선택 단어";
    }
    if (selectedRange.type === "phrase") {
      return "선택 구절";
    }
    return "선택 문장";
  }, [selectedRange]);

  const documentPages = useMemo(() => groupPages(documentBlocks), [documentBlocks]);

  const resetDocumentDerivedState = () => {
    setSelectedRange(null);
    setActionMenuVisible(false);
    setSelectionResult(null);
    setSummaryResult(null);
    setUploadMessage("");
    window.getSelection()?.removeAllRanges();
  };

  const applyParsedDocument = (parsed: DocumentParseResponse) => {
    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : defaultBlocks(parsed.text);

    setDocumentText(parsed.text);
    setDocumentBlocks(blocks.length > 0 ? blocks : defaultBlocks(parsed.text));
    resetDocumentDerivedState();
    setUploadMessage(`${parsed.filename} 파일을 불러왔습니다.`);
    if (Array.isArray(parsed.warnings) && parsed.warnings.length > 0) {
      setUploadMessage(`${parsed.filename} 파일을 불러왔습니다. ${parsed.warnings.join(" ")}`);
    }
  };

  const handleFileUpload = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploadStatus("loading");
    setUploadMessage("");

    try {
      const parsed = await parseDocument(file);
      applyParsedDocument(parsed);
      setUploadStatus("idle");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "문서 파일을 읽지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
    };

    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) {
        setDragActive(false);
      }
    };

    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      void handleFileUpload(event.dataTransfer?.files?.[0] ?? null);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFileUpload]);

  useEffect(() => {
    const hideMenu = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && actionMenuRef.current?.contains(target)) {
        return;
      }

      setActionMenuVisible(false);
    };

    window.addEventListener("pointerdown", hideMenu);
    return () => window.removeEventListener("pointerdown", hideMenu);
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selection || !selectedText) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedRange({
      text: selectedText,
      type: getSelectionType(selectedText),
      menuX: Math.min(Math.max(rect.left, 16), window.innerWidth - 320),
      menuY: Math.max(rect.top - 14, 88)
    });
    setActionMenuVisible(true);
    setSelectionResult(null);
  }, []);

  const runSelectionAction = async (mode: SelectionMode) => {
    if (!selectedRange) {
      return;
    }

    const request: SelectionRequest = {
      documentText,
      selectedText: selectedRange.text,
      selectionType: selectedRange.type,
      surroundingContext: getExpandedContext(documentText, selectedRange.text),
      mode
    };

    setSelectionStatus("loading");
    setSelectionResult(null);
    setActionMenuVisible(false);

    const response = await simplifySelection(request);
    setSelectionResult(response);
    setSelectionStatus("idle");
    window.setTimeout(() => resultRegionRef.current?.focus(), 80);
  };

  const runSummary = async () => {
    setSummaryStatus("loading");

    try {
      const response = await summarizeDocument(documentText);
      setSummaryResult(response);
      setSummaryStatus("idle");
    } catch {
      setSummaryStatus("error");
    }
  };

  return (
    <section className={highContrast ? "workspace high-contrast" : "workspace"}>
      {dragActive && (
        <div className="drop-overlay" aria-live="assertive">
          <UploadCloud size={46} aria-hidden="true" />
          <strong>문서를 여기에 놓으세요</strong>
          <span>TXT, MD, HWPX, DOCX 파일을 지원합니다.</span>
        </div>
      )}

      <div className="toolbar" aria-label="문서 보기 설정">
        <label className="file-picker">
          <FileInput size={18} aria-hidden="true" />
          문서 업로드
          <input
            type="file"
            accept=".txt,.md,.hwpx,.docx"
            onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(event) => setHighContrast(event.target.checked)}
          />
          고대비
        </label>
      </div>

      {uploadStatus === "loading" && <p className="status-line">문서 파일을 읽는 중입니다.</p>}
      {uploadMessage && <p className={uploadStatus === "error" ? "status-line warning" : "status-line"}>{uploadMessage}</p>}

      <div className="work-grid document-view-layout">
        <div className="document-panel">
          <div className="panel-label">
            <FileText size={18} aria-hidden="true" />
            원문 문서
          </div>

          <div className="document-scroll">
            {documentPages.map((page, pageIndex) => (
              <article
                className="document-page"
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
                aria-label={`드래그해 선택할 수 있는 원문 문서 ${pageIndex + 1}쪽`}
                key={`page-${pageIndex}`}
              >
                <div className="page-number">{pageIndex + 1}</div>
                {page.map((block, blockIndex) => renderDocumentBlock(block, pageIndex * 1000 + blockIndex))}
              </article>
            ))}
          </div>

          {selectedRange && actionMenuVisible && (
            <div
              ref={actionMenuRef}
              className="selection-menu floating"
              style={{ left: selectedRange.menuX, top: selectedRange.menuY }}
              role="menu"
              aria-label="선택 영역 작업"
            >
              {selectionModes.map((mode) => {
                const Icon = modeIcons[mode];

                return (
                  <button
                    type="button"
                    key={mode}
                    role="menuitem"
                    onClick={() => runSelectionAction(mode)}
                    disabled={selectionStatus === "loading"}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {modeLabels[mode]}
                  </button>
                );
              })}
            </div>
          )}

          <section className="summary-panel" aria-live="polite">
            <div className="summary-header">
              <h2>원문 전체 요약</h2>
              <button type="button" className="tool-button" onClick={runSummary} disabled={summaryStatus === "loading"}>
                {summaryStatus === "loading" ? <Loader2 size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                요약하기
              </button>
            </div>
            {!summaryResult && summaryStatus !== "error" && <p className="empty">현재 문서 전체를 짧게 요약합니다.</p>}
            {summaryStatus === "error" && <p className="warning">원문 요약 요청을 처리하지 못했습니다.</p>}
            {summaryResult && (
              <>
                <p>{summaryResult.summary}</p>
                {summaryResult.warnings.map((warning) => (
                  <p className="warning" key={warning}>
                    {warning}
                  </p>
                ))}
              </>
            )}
          </section>
        </div>

        <aside className="result-panel" aria-live="polite">
          <div className="panel-label">
            <Sparkles size={18} aria-hidden="true" />
            선택 결과
          </div>

          {!selectedRange && <p className="empty">원문에서 필요한 글을 드래그하면 설명과 예시 채우기를 요청할 수 있습니다.</p>}

          {selectedRange && (
            <div className="selected-box">
              <span>{selectedDescription}</span>
              <strong>{selectedRange.text}</strong>
            </div>
          )}

          {selectionStatus === "loading" && (
            <div className="loading">
              <Loader2 size={20} aria-hidden="true" />
              선택한 글과 주변 문맥을 함께 확인하는 중입니다.
            </div>
          )}

          {selectionStatus === "error" && <p className="warning">선택 요청을 처리하지 못했습니다.</p>}

          {selectionResult && (
            <div className="result-stack" ref={resultRegionRef} tabIndex={-1}>
              <section>
                <h2>결과</h2>
                <p>{selectionResult.resultText}</p>
              </section>
              <section>
                <h2>쉬운 뜻</h2>
                <p>{selectionResult.plainMeaning || selectionResult.explanation}</p>
              </section>
              <section>
                <h2>처리 이유</h2>
                <p>{selectionResult.whyChanged || selectionResult.explanation}</p>
              </section>
              {(selectionResult.terms.length > 0 || selectionResult.relatedTerms.length > 0) && (
                <section>
                  <h2>참고 용어</h2>
                  {[...selectionResult.terms, ...selectionResult.relatedTerms].map((term) => (
                    <p key={`${term.term}-${term.meaning}`}>
                      <strong>{term.term}</strong>: {term.meaning}
                      {term.easyExpression ? ` (${term.easyExpression})` : ""}
                    </p>
                  ))}
                </section>
              )}
              {selectionResult.citations.length > 0 && (
                <section>
                  <h2>근거</h2>
                  <p>{selectionResult.citations.join(", ")}</p>
                </section>
              )}
              {selectionResult.warnings.length > 0 && (
                <section>
                  <h2>확인 필요</h2>
                  {selectionResult.warnings.map((warning) => (
                    <p className="warning" key={warning}>
                      {warning}
                    </p>
                  ))}
                </section>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
