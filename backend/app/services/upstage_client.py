"""Upstage Solar API wrapper.

Upstage's chat and embedding endpoints are OpenAI-compatible, so we reuse the
official OpenAI SDK with a custom base_url. Document Parse and Groundedness
Check have their own endpoints — Groundedness Check is exposed as a chat model,
Document Parse takes multipart form upload.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from openai import OpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)

UPSTAGE_BASE_URL = "https://api.upstage.ai/v1"
DOCUMENT_PARSE_ENDPOINT = f"{UPSTAGE_BASE_URL}/document-digitization"
GROUNDEDNESS_MODEL = "groundedness-check"
DOCUMENT_PARSE_MODEL = "document-parse"
EMBEDDING_QUERY_MODEL = "solar-embedding-1-large-query"
EMBEDDING_PASSAGE_MODEL = "solar-embedding-1-large-passage"


class UpstageClient:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self._api_key = api_key or settings.upstage_api_key
        self._model = model or settings.solar_model
        self._temperature = settings.solar_temperature
        if not self._api_key:
            logger.warning(
                "UPSTAGE_API_KEY is empty — Upstage calls will fail until configured."
            )
        self._oa = OpenAI(api_key=self._api_key or "missing", base_url=UPSTAGE_BASE_URL, timeout=settings.solar_llm_timeout)

    def chat_json(
        self,
        system: str,
        user: str,
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Run a chat completion that must return JSON.

        Returns the parsed JSON object. Raises ValueError if the response is not
        valid JSON.
        """
        resp = self._oa.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=self._temperature if temperature is None else temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or ""
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error("Solar returned non-JSON content: %s", content[:500])
            raise ValueError(f"Solar response was not valid JSON: {e}") from e

    def chat_text(
        self,
        system: str,
        user: str,
        *,
        temperature: float | None = None,
    ) -> str:
        resp = self._oa.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=self._temperature if temperature is None else temperature,
        )
        return resp.choices[0].message.content or ""

    def parse_document(
        self,
        *,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> str:
        """Call Upstage Document Parse and return Markdown string.

        Endpoint: POST /v1/document-digitization with multipart form.
        Response shape (relevant): {"content": {"markdown": "..."}, ...}.
        """
        files = {"document": (filename, content, content_type)}
        data = {"model": DOCUMENT_PARSE_MODEL, "output_formats": '["markdown"]'}
        with httpx.Client(timeout=120) as client:
            r = client.post(
                DOCUMENT_PARSE_ENDPOINT,
                headers={"Authorization": f"Bearer {self._api_key}"},
                files=files,
                data=data,
            )
            r.raise_for_status()
            payload = r.json()
        # Newer API returns {"content": {"markdown": ...}}; older versions may
        # nest differently. Try a few shapes.
        content_field = payload.get("content")
        if isinstance(content_field, dict):
            md = content_field.get("markdown") or content_field.get("text") or ""
        elif isinstance(content_field, str):
            md = content_field
        else:
            md = payload.get("text") or payload.get("markdown") or ""
        if not md:
            logger.warning("Document Parse returned empty text. Raw keys: %s", list(payload))
        return md.strip()

    def embed(self, text: str, *, passage: bool = False) -> list[float]:
        """Return an embedding vector for *text*.

        Uses the query model by default (passage=False).
        Pass passage=True when indexing corpus documents.
        Upstage embedding endpoints are OpenAI-compatible.
        """
        model = EMBEDDING_PASSAGE_MODEL if passage else EMBEDDING_QUERY_MODEL
        resp = self._oa.embeddings.create(model=model, input=text)
        return resp.data[0].embedding

    def groundedness_check(self, context: str, answer: str) -> dict[str, Any]:
        """Run Upstage Groundedness Check.

        Returns dict with keys:
            label: "grounded" | "notGrounded" | "notSure"
            raw:   raw API response (debugging)
        """
        payload = {
            "model": GROUNDEDNESS_MODEL,
            "messages": [
                {"role": "user", "content": context},
                {"role": "assistant", "content": answer},
            ],
        }
        with httpx.Client(timeout=60) as client:
            r = client.post(
                f"{UPSTAGE_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
        try:
            label_raw = (data["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError):
            label_raw = ""
        # Normalize to one of the three expected labels
        if "notGrounded" in label_raw or "notgrounded" in label_raw.lower():
            label = "notGrounded"
        elif "notSure" in label_raw or "notsure" in label_raw.lower():
            label = "notSure"
        elif "grounded" in label_raw.lower():
            label = "grounded"
        else:
            label = "notSure"
        return {"label": label, "raw": data}


_client: UpstageClient | None = None


def get_upstage() -> UpstageClient:
    global _client
    if _client is None:
        _client = UpstageClient()
    return _client
