from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.document_parser import parse_upload
from app.models import DocumentParseResponse, SelectionRequest, SelectionResponse, SimplifyRequest, SimplifyResponse
from app.services import simplify_selection, summarize_document

app = FastAPI(title="Easy Administrative Document Simplifier", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/documents/parse", response_model=DocumentParseResponse)
async def parse_document_endpoint(file: UploadFile = File(...)) -> DocumentParseResponse:
    return await parse_upload(file)


@app.post("/api/simplify/selection", response_model=SelectionResponse)
async def simplify_selection_endpoint(request: SelectionRequest) -> SelectionResponse:
    return await simplify_selection(request)


@app.post("/api/simplify", response_model=SimplifyResponse)
async def simplify_document_endpoint(request: SimplifyRequest) -> SimplifyResponse:
    return await summarize_document(request)
