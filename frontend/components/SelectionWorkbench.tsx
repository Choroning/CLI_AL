"use client";

import { BookOpenText, FileInput, FileText, Loader2, Minus, PencilLine, Plus, Sparkles, Type, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseDocument, parseText, simplifySelection, summarizeDocument } from "@/lib/api";
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

type SelectedParagraph = {
  index: number;
  text: string;
};

type InputMode = "upload" | "text";

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

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_STEP = 2;
const FONT_SIZE_DEFAULT = 16;
const MAX_FILE_MB = 10;
const MAX_TEXT_CHARS = 200_000;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const initialHtml = (text: string) =>
  text
    .split(/\n+/)
    .filter(Boolean)
    .reduce(
      (acc, line, i) =>
        acc +
        `<p class="para-selectable" data-para-index="${i}" tabindex="0" role="button" aria-pressed="false">${escapeHtml(line)}</p>`,
      '<section class="rendered-page" data-page="1">'
    ) + '<div class="page-no">1</div></section>';

const getSelectionType = (text: string): SelectionType => {
  const trimmed = text.trim();
  if (!trimmed.includes(" ")) return "word";
  if (/[.!?\u3002\uff01\uff1f]$/.test(trimmed) || trimmed.length > 30) return "sentence";
  return "phrase";
};

const getExpandedContext = (source: string, selectedText: string) => {
  const normalizedSelection = selectedText.trim();
  const index = source.indexOf(normalizedSelection);
  if (index < 0 || normalizedSelection.length <= 4) return source.slice(0, 3000);
  const start = Math.max(0, index - 900);
  const end = Math.min(source.length, index + normalizedSelection.length + 900);
  return source.slice(start, end);
};

export function SelectionWorkbench({ initialDocument }: Props) {
  const [documentText, setDocumentText] = useState(initialDocument);
  const [renderedHtml, setRenderedHtml] = useState(initialHtml(initialDocument));
  const [sourceName, setSourceName] = useState("예시 원문");
  const [selectedParagraphs, setSelectedParagraphs] = useState<SelectedParagraph[]>([]);
  const [selectionResult, setSelectionResult] = useState<SelectionResponse | null>(null);
  const [summaryResult, setSummaryResult] = useState<SimplifyResponse | null>(null);
  const [selectionStatus, setSelectionStatus] = useState<"idle" | "loading" | "error">("idle");
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [highContrast, setHighContrast] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [directText, setDirectText] = useState("");
  const dragDepth = useRef(0);
  const resultRegionRef = useRef<HTMLDivElement>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = (message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = "";
      setTimeout(() => {
        if (liveRegionRef.current) liveRegionRef.current.textContent = message;
      }, 50);
    }
  };

  const resetDocumentDerivedState = () => {
    setSelectedParagraphs([]);
    setSelectionResult(null);
    setSummaryResult(null);
    setUploadMessage("");
  };

  const applyParsedDocument = (parsed: DocumentParseResponse) => {
    setDocumentText(parsed.text);
    setRenderedHtml(parsed.renderedHtml || initialHtml(parsed.text));
    setSourceName(parsed.filename);
    resetDocumentDerivedState();
    const msg = `${parsed.filename} 파일을 불러왔습니다.`;
    setUploadMessage(
      Array.isArray(parsed.warnings) && parsed.warnings.length > 0
        ? `${msg} ${parsed.warnings.join(" ")}`
        : msg
    );
    announce(msg);
  };

  const handleFileUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadStatus("error");
      setUploadMessage(`파일 크기가 ${MAX_FILE_MB}MB를 초과합니다. 더 작은 파일을 선택해 주세요.`);
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

  const handleDirectTextSubmit = async () => {
    if (!directText.trim()) return;
    if (directText.length > MAX_TEXT_CHARS) {
      setUploadStatus("error");
      setUploadMessage(`텍스트가 너무 깁니다. 최대 ${MAX_TEXT_CHARS.toLocaleString()}자까지 입력할 수 있습니다.`);
      return;
    }
    setUploadStatus("loading");
    setUploadMessage("");
    try {
      const parsed = await parseText(directText);
      applyParsedDocument(parsed);
      setUploadStatus("idle");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(error instanceof Error ? error.message : "텍스트를 처리하지 못했습니다.");
    }
  };

  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragActive(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
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

  const handleDocumentClick = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const paraEl = target.closest("[data-para-index]") as HTMLElement | null;
    if (!paraEl) return;
    const idx = parseInt(paraEl.dataset.paraIndex ?? "-1", 10);
    if (idx < 0) return;
    const text = paraEl.textContent?.trim() || "(빈 칸)";

    setSelectedParagraphs(prev => {
      const exists = prev.some(p => p.index === idx);
      if (exists) {
        paraEl.setAttribute("aria-pressed", "false");
        paraEl.classList.remove("selected-paragraph");
        const next = prev.filter(p => p.index !== idx);
        announce(next.length > 0 ? `선택 해제. 현재 ${next.length}개 단락 선택됨.` : "선택이 해제되었습니다.");
        return next;
      } else {
        paraEl.setAttribute("aria-pressed", "true");
        paraEl.classList.add("selected-paragraph");
        announce(text === "(빈 칸)" ? `빈 칸 선택됨.` : `단락 선택됨. 현재 ${prev.length + 1}개 단락 선택됨.`);
        return [...prev, { index: idx, text }];
      }
    });
    setSelectionResult(null);
  }, []);

  const handleDocumentKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleDocumentClick(event);
    }
  }, [handleDocumentClick]);

  const clearSelection = () => {
    setSelectedParagraphs([]);
    setSelectionResult(null);
    if (docScrollRef.current) {
      docScrollRef.current.querySelectorAll(".selected-paragraph").forEach(el => {
        el.classList.remove("selected-paragraph");
        el.setAttribute("aria-pressed", "false");
      });
    }
    announce("선택이 모두 해제되었습니다.");
  };

  const deselectOne = (idx: number) => {
    if (docScrollRef.current) {
      const el = docScrollRef.current.querySelector(`[data-para-index="${idx}"]`);
      if (el) {
        el.classList.remove("selected-paragraph");
        el.setAttribute("aria-pressed", "false");
      }
    }
    setSelectedParagraphs(prev => {
      const next = prev.filter(p => p.index !== idx);
      announce(next.length > 0 ? `선택 해제. 현재 ${next.length}개 선택됨.` : "선택이 모두 해제되었습니다.");
      if (next.length === 0) setSelectionResult(null);
      return next;
    });
  };

  const runSelectionAction = async (mode: SelectionMode) => {
    if (selectedParagraphs.length === 0) return;
    const combinedText = selectedParagraphs
      .sort((a, b) => a.index - b.index)
      .map(p => p.text)
      .join(" ");
    const request: SelectionRequest = {
      documentText,
      selectedText: combinedText.slice(0, 1200),
      selectionType: getSelectionType(combinedText),
      surroundingContext: getExpandedContext(documentText, combinedText),
      mode
    };
    setSelectionStatus("loading");
    setSelectionResult(null);
    announce("분석 중입니다. 잠시 기다려 주세요.");
    try {
      const response = await simplifySelection(request);
      setSelectionResult(response);
      setSelectionStatus("idle");
      announce("분석이 완료되었습니다. 결과 패널을 확인하세요.");
      window.setTimeout(() => resultRegionRef.current?.focus(), 80);
    } catch {
      setSelectionStatus("error");
      announce("분석 요청에 실패했습니다.");
    }
  };

  const runSummary = async () => {
    setSummaryStatus("loading");
    announce("전체 요약 중입니다.");
    try {
      const response = await summarizeDocument(documentText);
      setSummaryResult(response);
      setSummaryStatus("idle");
      announce("전체 요약이 완료되었습니다.");
    } catch {
      setSummaryStatus("error");
      announce("요약 요청에 실패했습니다.");
    }
  };

  const decreaseFontSize = () => setFontSize(s => Math.max(FONT_SIZE_MIN, s - FONT_SIZE_STEP));
  const increaseFontSize = () => setFontSize(s => Math.min(FONT_SIZE_MAX, s + FONT_SIZE_STEP));
  const hasSelection = selectedParagraphs.length > 0;

  return (
    <section
      className={highContrast ? "workspace high-contrast" : "workspace"}
      style={{ fontSize: fontSize + "px" }}
      aria-label="문서 분석 작업 공간"
    >
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {dragActive && (
        <div className="drop-overlay" aria-live="assertive" role="alert">
          <UploadCloud size={46} aria-hidden="true" />
          <strong>문서를 여기에 놓으세요</strong>
          <span>TXT, MD, HWPX, DOCX, PDF 파일을 지원합니다.</span>
        </div>
      )}

      <div className="toolbar" role="toolbar" aria-label="문서 입력 및 보기 설정">
        <div className="input-mode-tabs" role="tablist" aria-label="입력 방식">
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === "upload"}
            aria-controls="upload-panel"
            className={inputMode === "upload" ? "tab-button tab-active" : "tab-button"}
            onClick={() => setInputMode("upload")}
          >
            <FileInput size={16} aria-hidden="true" />
            파일 업로드
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === "text"}
            aria-controls="text-panel"
            className={inputMode === "text" ? "tab-button tab-active" : "tab-button"}
            onClick={() => setInputMode("text")}
          >
            <Type size={16} aria-hidden="true" />
            직접 입력
          </button>
        </div>

        <div className="font-size-controls" aria-label="문서 글자 크기 조절">
          <button
            type="button"
            className="icon-button"
            onClick={decreaseFontSize}
            disabled={fontSize <= FONT_SIZE_MIN}
            aria-label={"글자 크기 줄이기 (현재 " + fontSize + "px)"}
            title="글자 크기 줄이기"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <span className="font-size-display" aria-label={"현재 글자 크기: " + fontSize + "px"}>
            {fontSize}px
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={increaseFontSize}
            disabled={fontSize >= FONT_SIZE_MAX}
            aria-label={"글자 크기 늘리기 (현재 " + fontSize + "px)"}
            title="글자 크기 늘리기"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(event) => setHighContrast(event.target.checked)}
            aria-label="고대비 모드 켜기/끄기"
          />
          고대비
        </label>
      </div>

      {inputMode === "upload" && (
        <div id="upload-panel" role="tabpanel" aria-label="파일 업로드" className="input-panel">
          <div className="upload-row">
            <label className="file-picker">
              <FileInput size={18} aria-hidden="true" />
              문서 파일 선택
              <input
                type="file"
                accept=".txt,.md,.hwpx,.docx,.pdf"
                aria-label="문서 파일 선택 (TXT, MD, HWPX, DOCX, PDF, 최대 10MB)"
                onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            <span className="file-limit-hint">
              TXT &middot; MD &middot; HWPX &middot; DOCX &middot; PDF &nbsp;&middot;&nbsp; 최대 {MAX_FILE_MB}MB
            </span>
          </div>
        </div>
      )}

      {inputMode === "text" && (
        <div id="text-panel" role="tabpanel" aria-label="텍스트 직접 입력" className="input-panel">
          <textarea
            className="direct-text-input"
            placeholder="분석할 행정문서 텍스트를 여기에 붙여넣으세요..."
            value={directText}
            onChange={e => setDirectText(e.target.value)}
            aria-label={"텍스트 직접 입력 (최대 " + MAX_TEXT_CHARS.toLocaleString() + "자)"}
            rows={6}
          />
          <div className="direct-text-footer">
            <span className={directText.length > MAX_TEXT_CHARS ? "char-count char-count-over" : "char-count"}>
              {directText.length.toLocaleString()} / {MAX_TEXT_CHARS.toLocaleString()}자
            </span>
            <button
              type="button"
              className="tool-button"
              onClick={handleDirectTextSubmit}
              disabled={uploadStatus === "loading" || !directText.trim()}
              aria-label="입력한 텍스트 분석 시작"
            >
              {uploadStatus === "loading"
                ? <Loader2 size={18} aria-hidden="true" />
                : <Sparkles size={18} aria-hidden="true" />}
              분석 시작
            </button>
          </div>
        </div>
      )}

      {uploadStatus === "loading" && (
        <p className="status-line" role="status" aria-live="polite">
          문서를 처리하는 중입니다...
        </p>
      )}
      {uploadMessage && (
        <p
          className={uploadStatus === "error" ? "status-line warning" : "status-line"}
          role={uploadStatus === "error" ? "alert" : "status"}
        >
          {uploadMessage}
        </p>
      )}

      <div className="work-grid document-view-layout">
        <div className="document-panel">
          <div className="panel-label">
            <FileText size={18} aria-hidden="true" />
            원문 문서
            <span className="source-name">{sourceName}</span>
          </div>

          <div
            ref={docScrollRef}
            className="rendered-document-scroll"
            onClick={handleDocumentClick}
            onKeyDown={handleDocumentKeyDown}
            aria-label="원문 문서 — 단락을 클릭하거나 Enter·Space 키로 선택하세요"
            role="region"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          <p className="selection-hint" aria-hidden="true">
            단락을 클릭하면 선택됩니다. 여러 단락을 선택할 수 있습니다.
          </p>
          <section className="summary-panel" aria-label="원문 전체 요약">
            <div className="summary-header">
              <h2>원문 전체 요약</h2>
              <button
                type="button"
                className="tool-button"
                onClick={runSummary}
                disabled={summaryStatus === "loading"}
                aria-label="원문 전체 요약 실행"
              >
                {summaryStatus === "loading"
                  ? <Loader2 size={18} aria-hidden="true" />
                  : <Sparkles size={18} aria-hidden="true" />}
                요약하기
              </button>
            </div>
            <div aria-live="polite" aria-atomic="false">
              {!summaryResult && summaryStatus !== "error" && (
                <p className="empty">현재 문서 전체를 짧게 요약합니다.</p>
              )}
              {summaryStatus === "error" && (
                <p className="warning" role="alert">원문 요약 요청을 처리하지 못했습니다.</p>
              )}
              {summaryResult && (
                <>
                  <p>{summaryResult.summary}</p>
                  {summaryResult.warnings.map((warning) => (
                    <p className="warning" key={warning} role="alert">{warning}</p>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="result-panel" aria-label="선택 분석 결과">
          <div className="panel-label">
            <Sparkles size={18} aria-hidden="true" />
            선택 결과
          </div>

          <div aria-live="polite" aria-atomic="false">
            {!hasSelection && (
              <p className="empty">
                원문에서 단락을 클릭하면 설명과 예시 채우기를 요청할 수 있습니다.
              </p>
            )}

            {hasSelection && (
              <div className="selected-box" aria-label="선택된 단락 목록">
                <span>선택한 단락 ({selectedParagraphs.length}개)</span>
                <ul className="selected-chips" aria-label="선택된 항목">
                  {[...selectedParagraphs]
                    .sort((a, b) => a.index - b.index)
                    .map(p => (
                      <li key={p.index} className="selected-chip">
                        <span className="chip-text">
                          {p.text.length > 40 ? p.text.slice(0, 40) + "…" : p.text}
                        </span>
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => deselectOne(p.index)}
                          aria-label={`"${p.text.slice(0, 20)}" 선택 해제`}
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {selectionStatus === "loading" && (
              <div className="loading" role="status" aria-live="polite">
                <Loader2 size={20} aria-hidden="true" />
                선택한 내용을 분석하는 중입니다.
              </div>
            )}

            {selectionStatus === "error" && (
              <p className="warning" role="alert">선택 요청을 처리하지 못했습니다.</p>
            )}

            {selectionResult && (
              <div className="result-stack" ref={resultRegionRef} tabIndex={-1} aria-label="분석 결과">
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
                {selectionResult.warnings.length > 0 && (
                  <section>
                    <h2>확인 필요</h2>
                    {selectionResult.warnings.map((warning) => (
                      <p className="warning" key={warning} role="alert">{warning}</p>
                    ))}
                  </section>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {hasSelection && (
        <div
          className="sticky-action-bar"
          role="region"
          aria-label="선택 단락 작업 바"
        >
          <span className="action-bar-info">
            {selectedParagraphs.length}개 단락 선택됨
          </span>
          <div className="action-bar-buttons">
            {selectionModes.map((mode) => {
              const Icon = modeIcons[mode];
              return (
                <button
                  type="button"
                  key={mode}
                  className="tool-button"
                  onClick={() => runSelectionAction(mode)}
                  disabled={selectionStatus === "loading"}
                  aria-label={"선택 단락: " + modeLabels[mode]}
                >
                  <Icon size={16} aria-hidden="true" />
                  {modeLabels[mode]}
                </button>
              );
            })}
            <button
              type="button"
              className="tool-button clear-button"
              onClick={clearSelection}
              aria-label="선택 모두 해제"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}
    </section>
  );
}