import httpx

from app.llm.base import ChatMessage, LLMProvider, LLMResponse
from app.settings import Settings


class NimLLMProvider(LLMProvider):
    def __init__(self, settings: Settings):
        if not settings.nvidia_nim_api_key:
            raise ValueError("NVIDIA_NIM_API_KEY is required when LLM_PROVIDER=nim")

        self.settings = settings

    async def generate(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1200,
    ) -> LLMResponse:
        payload = {
            "model": self.settings.nvidia_nim_model,
            "messages": [{"role": message.role, "content": message.content} for message in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.nvidia_nim_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.settings.nvidia_nim_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return LLMResponse(content=content, raw=data)
