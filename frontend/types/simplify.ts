export type SelectionType = "sentence" | "word" | "phrase";
export type SelectionMode = "explain" | "fillExample" | "summarize";

export type SelectionRequest = {
  documentText: string;
  selectedText: string;
  selectionType: SelectionType;
  surroundingContext: string;
  mode: SelectionMode;
};

export type TermExplanation = {
  term: string;
  meaning: string;
  easyExpression?: string;
};

export type SelectionResponse = {
  resultText: string;
  explanation: string;
  plainMeaning: string;
  whyChanged: string;
  terms: TermExplanation[];
  relatedTerms: TermExplanation[];
  citations: string[];
  warnings: string[];
};

export type SimplifyResponse = {
  simplifiedText: string;
  summary: string;
  terms: TermExplanation[];
  citations: string[];
  warnings: string[];
};

export type DocumentParseResponse = {
  filename: string;
  extension: string;
  text: string;
  xmlSource?: string | null;
  xmlSourceName?: string | null;
  renderedHtml?: string | null;
  blocks: Array<{
    type: "heading" | "paragraph" | "list" | "table" | "pageBreak";
    text: string;
    rows?: Array<Array<string | {
      text: string;
      colSpan?: number;
      rowSpan?: number;
    }>>;
    pageBreakBefore?: boolean;
  }>;
  warnings: string[];
};

export type PlainTextRequest = {
  text: string;
};