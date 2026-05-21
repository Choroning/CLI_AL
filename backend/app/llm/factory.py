from functools import lru_cache

from app.llm.base import LLMProvider
from app.llm.mock import MockLLMProvider
from app.llm.nim import NimLLMProvider
from app.settings import settings


@lru_cache
def get_llm_provider() -> LLMProvider:
    print(settings.llm_provider)
    provider = settings.llm_provider.lower()

    if provider == "nim":
        return NimLLMProvider(settings)

    if provider == "mock":
        return MockLLMProvider()

    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")
