import type {
  DocumentParseResponse,
  SelectionRequest,
  SelectionResponse,
  SimplifyResponse
} from "@/types/simplify";

const fallbackResponse = (request: SelectionRequest): SelectionResponse => {
  const isWord = request.selectionType === "word";

  return {
    resultText: isWord
      ? `${request.selectedText}: 문맥을 함께 확인해 쉬운 뜻을 설명해야 하는 표현입니다.`
      : request.selectedText,
    explanation: "백엔드에 연결하지 못해 임시 결과를 표시했습니다.",
    plainMeaning: isWord
      ? "선택한 단어가 행정문서 안에서 어떤 뜻인지 확인이 필요합니다."
      : "선택한 문장을 더 짧고 쉬운 말로 바꿀 수 있습니다.",
    whyChanged: "실제 변환은 FastAPI 백엔드와 NVIDIA NIM Provider가 연결되면 수행됩니다.",
    terms: [],
    relatedTerms: [],
    citations: [],
    warnings: ["백엔드 응답을 받지 못했습니다."]
  };
};

export async function simplifySelection(
  request: SelectionRequest
): Promise<SelectionResponse> {
  try {
    const response = await fetch("/api/simplify/selection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Selection API failed with ${response.status}`);
    }

    return response.json();
  } catch {
    return fallbackResponse(request);
  }
}

export async function summarizeDocument(documentText: string): Promise<SimplifyResponse> {
  const response = await fetch("/api/simplify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ documentText })
  });

  if (!response.ok) {
    throw new Error(`Summary API failed with ${response.status}`);
  }

  return response.json();
}

export async function parseDocument(file: File): Promise<DocumentParseResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/documents/parse", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Document parse failed with ${response.status}`);
  }

  return response.json();
}
