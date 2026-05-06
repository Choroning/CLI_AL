from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Literal


Role = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class ChatMessage:
    role: Role
    content: str


@dataclass(frozen=True)
class LLMResponse:
    content: str
    raw: dict[str, Any] | None = None


class LLMProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1200,
    ) -> LLMResponse:
        """Generate a chat response using the configured model."""
