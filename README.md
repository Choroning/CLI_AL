# FOLIO.

장애인·고령자를 위한 행정문서 이해 지원 플랫폼.  
정부 공문, 계약서, 약관, 의료 안내문 등을 누구나 이해할 수 있는 쉬운 한국어로 변환하고,
복지 혜택 매칭·민원 작성까지 한 곳에서 제공합니다.

> 흑백 모노크롬 디자인 · 풀스크린 히어로 영상 · 스트리밍 AI 분석 · 모바일 반응형

---

## 주요 서비스

### 문서 변환기 (`/`)
- **쉬운말 변환** — 어려운 행정·법률 용어를 쉬운 한국어로 재작성 (스트리밍)
- **핵심 요약** — 의무·권리·기한 등 핵심 내용 추출
- **위험 조항 탐지** — 계약서의 독소조항 자동 탐지 (높음·중간·낮음 3단계)
- **액션 체크리스트** — 사용자가 해야 할 일 목록 자동 생성
- **단어 풀이** — 어려운 단어 클릭 시 즉각 설명 팝업 (85개 사전 내장, LLM 폴백)
- **문서 유형 감지** — 임대차·근로·계약서·공문서 등 8가지 유형 자동 분류
- **법제처 RAG** — 관련 법령 자동 조회 후 정확도 향상
- **Q&A 챗** — 분석한 문서에 대해 자유롭게 질문
- **음성 읽기 (TTS)** — 쉬운말 변환 결과를 음성으로 재생
- **파일 업로드** — `.txt` / `.pdf` / `.hwp` / `.hwpx` 지원
- **요약 수준 선택** — 간단히 / 기본 / 자세히
- **결과 복사·저장** — 클립보드 복사 및 .txt 다운로드
- **최근 기록** — 최근 분석 5개 localStorage 저장
- **글자 크기 조절** — 우하단 플로팅 위젯으로 A- / A / A+ 조절 (전 페이지 공통)

### 복지 혜택 매칭 (`/welfare`)
- 나이, 가구 유형, 소득 수준, 장애 여부, 지역 등 입력
- 받을 수 있는 정부 복지 프로그램 최대 8개 추천
- 자격 요건, 지원 내용, 신청 방법, 문의처까지 안내

### 민원 작성 도우미 (`/civil`)
- 상황을 쉬운 말로 설명하면 공식 민원 문서 자동 생성
- 신고 / 건의 / 불만·고충 / 정보공개청구 유형 선택
- 수신 기관, 담당 부서, 본문, 첨부서류, 국민신문고 제출 방법 안내
- 작성된 문서 복사·저장

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Backend | Python 3.10+, Flask |
| Frontend | HTML / CSS / Vanilla JavaScript (모바일 반응형) |
| LLM | Groq (`llama-3.3-70b-versatile`) — Gemini, Ollama 교체 가능 |
| RAG | 법제처 국가법령정보 Open API |
| 파일 파싱 | pdfplumber (PDF), pyhwp (HWP), zipfile+ElementTree (HWPX) |

## UI 디자인

- **모노크롬 시스템** — `#111111` (블랙) / `#fafafa` (배경) / 그레이 스케일로만 구성
- **풀스크린 히어로** — 첫 화면 전체를 영상 슬롯으로 채움, 다크 오버레이에 브랜딩 배치
- **오픈 컬럼 레이아웃** — 패널 박스 없이 INPUT / RESULT 두 컬럼이 화면을 채움
- **반응형** — 900px 이하 단일 컬럼, 600px 이하 폰 최적화 (네비 가로 스크롤 등)
- **모션** — fadeUp, sectionIn, tagPop, checkSlide, bubbleIn 키프레임 + IntersectionObserver 스크롤 리빌

---

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

# 법제처 RAG (선택 사항 — 없으면 RAG 비활성화)
LAW_API_KEY=발급받은_법제처_API_키
```

> **Groq API 키 무료 발급:** https://console.groq.com  
> **법제처 API 키 발급:** https://www.law.go.kr/LSO/openApi/apiKeyApplLst.do

### 3. 서버 실행

```bash
python app.py
```

브라우저에서 http://localhost:5000 접속

---

## LLM 교체 방법

`.env` 파일의 `LLM_PROVIDER` 값만 바꾸면 됩니다.

**Gemini** (무료 1,500 req/일)
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=발급받은_Gemini_API_키
```
> Gemini API 키 무료 발급: https://aistudio.google.com/app/apikey

**Ollama** (완전 로컬, API 키 불필요)
```bash
ollama pull gemma2:9b
```
```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=gemma2:9b
```
> Ollama 설치: https://ollama.ai

---

## 사용 방법

### 문서 변환기
1. http://localhost:5000 접속
2. 왼쪽 입력창에 문서 **붙여넣기** 또는 **파일 업로드** (.txt / .pdf / .hwp / .hwpx)
3. 요약 수준 선택 (간단히 / 기본 / 자세히)
4. **쉬운말로 변환하기** 클릭
5. 결과 확인: 쉬운말 변환 · 위험 조항 · 핵심 요약 · 체크리스트 · 단어 풀이
6. 분석 후 하단 채팅창에서 문서에 대해 질문 가능

### 복지 혜택 매칭
1. http://localhost:5000/welfare 접속
2. 나이, 가구 유형, 소득 수준 등 입력
3. **혜택 찾기** 클릭 → 맞춤 복지 프로그램 목록 확인

### 민원 작성 도우미
1. http://localhost:5000/civil 접속
2. 민원 유형 선택 (신고 / 건의 / 불만·고충 / 정보공개청구)
3. 상황을 자유롭게 설명
4. **민원 작성하기** 클릭 → 공식 문서 확인 후 복사·저장

---

## 프로젝트 구조

```
FOLIO/
├── app.py                  # Flask 서버 (API 엔드포인트)
├── llm_service.py          # LLM 연동 (Groq / Gemini / Ollama)
├── prompts.py              # 한국어 프롬프트 템플릿
├── rag_service.py          # 법제처 법령 RAG
├── requirements.txt
├── templates/
│   ├── base.html           # 공통 레이아웃 (네비게이션 포함)
│   ├── index.html          # 문서 변환기
│   ├── welfare.html        # 복지 혜택 매칭
│   └── civil.html          # 민원 작성 도우미
└── static/
    ├── css/style.css
    ├── js/
    │   ├── main.js         # 문서 변환기 JS
    │   ├── welfare.js      # 복지 매칭 JS
    │   └── civil.js        # 민원 도우미 JS
    └── data/
        └── term_dict.json  # 행정·법률 용어 사전 (85개)
```
