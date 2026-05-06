from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    llm_provider: str = "mock"
    nvidia_nim_api_key: str | None = None
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_nim_model: str = "meta/llama-3.1-70b-instruct"
    llm_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
    )


settings = Settings()
