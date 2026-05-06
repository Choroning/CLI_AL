from typing import Literal

from pydantic import BaseModel, Field


SelectionType = Literal["sentence", "word", "phrase"]
SelectionMode = Literal["explain", "fillExample", "summarize"]


class TermExplanation(BaseModel):
    term: str
    meaning: str
    easyExpression: str | None = None


class SelectionRequest(BaseModel):
    documentText: str = Field(min_length=1)
    selectedText: str = Field(min_length=1, max_length=1200)
    selectionType: SelectionType
    surroundingContext: str = Field(min_length=1, max_length=3000)
    mode: SelectionMode


class SelectionResponse(BaseModel):
    resultText: str
    explanation: str
    plainMeaning: str
    whyChanged: str
    terms: list[TermExplanation] = Field(default_factory=list)
    relatedTerms: list[TermExplanation] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class SimplifyRequest(BaseModel):
    documentText: str = Field(min_length=1)


class SimplifyResponse(BaseModel):
    simplifiedText: str
    summary: str
    terms: list[TermExplanation] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class DocumentTableCell(BaseModel):
    text: str
    colSpan: int = 1
    rowSpan: int = 1


class DocumentBlock(BaseModel):
    type: Literal["heading", "paragraph", "list", "table", "pageBreak"]
    text: str
    rows: list[list[DocumentTableCell]] = Field(default_factory=list)
    pageBreakBefore: bool = False


class DocumentParseResponse(BaseModel):
    filename: str
    extension: str
    text: str
    blocks: list[DocumentBlock] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
