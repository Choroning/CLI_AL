# 📋 쉬운말 변환기

장애인·고령자를 위한 행정문서 쉬운말 변환 서비스.
정부 공문, 계약서, 약관, 의료 안내문 등을 누구나 이해할 수 있는 쉬운 한국어로 변환합니다.

## 주요 기능

- **쉬운말 변환** — 어려운 행정·법률 용어를 쉬운 한국어로 재작성
- **핵심 요약** — 의무·권리·기한 등 핵심 내용 추출
- **액션 체크리스트** — 사용자가 해야 할 일 목록 자동 생성
- **단어 풀이** — 어려운 단어 클릭 시 쉬운 설명 팝업

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Backend | Python 3.10+, Flask |
| Frontend | HTML / CSS / JavaScript |
| LLM | Groq (llama-3.3-70b) — Gemini, Ollama 교체 가능 |

## 설치 및 실행

### 1. 패키지 설치

```bash
pip install -r requirements.txt
```

### 2. 환경변수 설정

프로젝트 폴더에 `.env` 파일 생성:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=발급받은_Groq_API_키
```

> Groq API 키 무료 발급: https://console.groq.com

### 3. 서버 실행

```bash
python app.py
```

브라우저에서 http://localhost:5000 접속

## LLM 교체 방법

`.env` 파일에서 `LLM_PROVIDER` 값만 바꾸면 됩니다.

**Gemini** (무료 1,500 req/일)
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=발급받은_Gemini_API_키
```
> Gemini API 키 무료 발급: https://aistudio.google.com/app/apikey

**Ollama** (완전 로컬, API 키 불필요)
```bash
# 모델 다운로드
ollama pull gemma2:9b
```
```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=gemma2:9b
```
> Ollama 설치: https://ollama.ai

## 사용 방법

1. 브라우저에서 http://localhost:5000 접속
2. 왼쪽 입력창에 문서 **붙여넣기** 또는 **파일 업로드** (.txt / .pdf)
3. **쉬운말로 변환하기** 버튼 클릭
4. 오른쪽 결과창에서 확인
   - 쉬운말로 바꾼 전체 내용
   - 핵심 의무·권리·기한
   - 해야 할 일 체크리스트 (클릭으로 완료 표시)
   - 어려운 단어 태그 (클릭 시 풀이 팝업)

## 프로젝트 구조

```
쉬운말변환기/
├── app.py              # Flask 서버 (API 엔드포인트)
├── llm_service.py      # LLM 연동 (Groq / Gemini / Ollama)
├── prompts.py          # 한국어 프롬프트 템플릿
├── requirements.txt
├── templates/
│   └── index.html      # 메인 UI
└── static/
    ├── css/style.css
    └── js/main.js
```
