from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# CWD에 상관없이 이 파일 기준으로 backend/.env를 찾는다
_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    llm_provider: str = "mock"
    nvidia_nim_api_key: str | None = None
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_nim_model: str = "meta/llama-3.1-70b-instruct"
    llm_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_prefix="",
        extra="ignore",
    )


settings = Settings()

print(f"[settings] env_file : {_ENV_FILE}")
print(f"[settings] exists   : {_ENV_FILE.exists()}")
print(f"[settings] provider : {settings.llm_provider}")
print(f"[settings] key_set  : {bool(settings.nvidia_nim_api_key)}")
