# Easy Administrative Document Simplifier MVP

This implementation adds a split frontend/backend MVP for uploading Korean administrative documents by file picker or page-wide drag and drop, selecting text directly from a document-like viewer, and requesting an easy-language conversion.

## Structure

- `frontend/`: Next.js + TypeScript UI.
- `backend/`: FastAPI API server.
- `backend/app/llm/`: swappable LLM provider interface with `mock` and NVIDIA NIM implementations.
- `backend/app/rag/`: MVP keyword retriever that can later be replaced by Chroma, Qdrant, FAISS, or pgvector.
- `backend/app/prompts/`: prompt templates separated from service code.
- `backend/app/document_parser.py`: TXT, MD, HWPX, and DOCX text extraction with paragraph-like blocks for the frontend viewer.

## Run

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Frontend:

```powershell
npm install
npm --prefix frontend run dev
```

Open `http://localhost:3000`.

Or run everything from the repository root:

```powershell
.\run-dev.bat
```

## NVIDIA NIM

Set these variables before running the backend:

```powershell
$env:LLM_PROVIDER="nim"
$env:NVIDIA_NIM_API_KEY="your-api-key"
$env:NVIDIA_NIM_BASE_URL="https://integrate.api.nvidia.com/v1"
$env:NVIDIA_NIM_MODEL="meta/llama-3.1-70b-instruct"
```

Without these values, use `LLM_PROVIDER=mock` for local UI development.
