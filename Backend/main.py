from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SOLAR_API_KEY = os.getenv("SOLAR_API_KEY")
SOLAR_API_URL = "https://api.upstage.ai/v1/chat/completions"


class ConvertRequest(BaseModel):
    text: str


@app.get("/")
def root():
    return {"message": "EasyDocTemp API is running"}


@app.post("/convert")
async def convert(request: ConvertRequest):
    if not SOLAR_API_KEY:
        raise HTTPException(status_code=500, detail="SOLAR_API_KEY가 설정되지 않았습니다.")

    headers = {
        "Authorization": f"Bearer {SOLAR_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "solar-pro",
        "messages": [
            {
                "role": "system",
                "content": (
                    "당신은 행정문서를 쉬운 말로 변환해주는 전문가입니다. "
                    "어려운 행정 용어나 법률 용어를 일반인도 쉽게 이해할 수 있는 말로 바꿔주세요. "
                    "원문의 의미는 그대로 유지하면서 간결하고 명확하게 설명해주세요."
                ),
            },
            {
                "role": "user",
                "content": f"다음 행정문서를 쉬운 말로 변환해주세요:\n\n{request.text}",
            },
        ],
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(SOLAR_API_URL, headers=headers, json=payload, timeout=30)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Solar API 호출에 실패했습니다.")

    result = response.json()
    converted_text = result["choices"][0]["message"]["content"]

    return {"result": converted_text}