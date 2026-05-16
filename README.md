# PURI.

어려운 행정문서를 누구나 쉽게 — AI 행정문서 도우미.  
공문서·계약서·약관을 쉬운 말로 변환하고, 복지 혜택 매칭·민원 작성·계약서 작성·행정 절차 안내·권리 상담까지 한 곳에서 제공합니다.

> 어르신·장애인·외국인 모두를 위한 문서 접근성 서비스

---

## 주요 서비스 (6가지)

### 1. 문서 변환기 (`/converter`)
- **쉬운말 변환** — 행정·법률 용어를 쉬운 한국어로 재작성 (스트리밍)
- **핵심 요약** — 의무·권리·기한 등 핵심 내용 추출
- **위험 조항 탐지** — 계약서 독소조항 자동 탐지 (높음·중간·낮음 3단계)
- **액션 체크리스트** — 사용자가 해야 할 일 목록 자동 생성
- **단어 풀이** — 어려운 단어 클릭 시 즉각 설명 팝업 (85개 사전 내장)
- **법제처 RAG** — 관련 법령 자동 조회로 정확도 향상
- **Q&A 챗** — 분석 문서에 대해 자유롭게 질문
- **다국어 출력** — 한국어 / English / 中文 / Tiếng Việt / 日本語
- **원문 비교** — 원문과 변환 결과 나란히 비교 (Diff 뷰)
- **파일 업로드** — `.txt` / `.pdf` / `.docx` / `.hwp` / `.hwpx` 지원
- **최근 기록** — 최근 분석 5건 localStorage 저장

### 2. 복지 혜택 매칭 (`/welfare`)
- 나이·가구 유형·소득·장애 여부·지역 입력
- 정부 복지 프로그램 최대 8개 AI 추천
- 자격 요건·지원 내용·신청 방법·문의처 안내

### 3. 민원 작성 도우미 (`/civil`)
- 상황을 쉬운 말로 설명하면 공식 민원 문서 자동 생성
- 신고 / 건의 / 불만·고충 / 정보공개청구 유형 선택
- 수신 기관·담당 부서·본문·첨부서류·제출 방법 안내
- 유형별 예시 자동 채우기 버튼

### 4. 계약서 작성 도우미 (`/contract`)
- 계약 유형 선택 (방·집 임대차 / 알바·고용 / 프리랜서 / 물품 거래 / 기타)
- 상황 설명 → 공정한 계약서 자동 생성
- 을(약자) 보호 조항 자동 포함
- 유형별 예시 자동 채우기 버튼

### 5. 행정 절차 안내 (`/procedure`)
- 절차 유형 선택 (주거·이사 / 가족관계 / 복지·의료 / 취업·퇴직 / 법률·분쟁 / 사업·창업)
- 상황 설명 → 단계별 절차 안내
- 필요 서류·방문 기관·소요 시간·온라인 신청 여부 안내

### 6. 권리 상담 (`/rights`)
- 임차인 / 근로자 / 소비자 / 노인·장애인 / 학생·청소년 빠른 선택
- 상황 설명 → 관련 법령·나의 권리·즉시 행동 요령 안내
- 도움받을 기관 연락처 포함

---

## 전 페이지 공통 부가 기능

| 기능 | 설명 |
|------|------|
| 🔊 음성 읽기 (TTS) | 결과를 한국어 음성으로 재생·중지 |
| 📄 저장 (.txt) | 결과를 텍스트 파일로 다운로드 |
| 📋 복사 | 결과를 클립보드에 복사 |
| 🖨 PDF 출력 | 브라우저 인쇄 기능으로 PDF 저장 |
| 🌙 다크 모드 | 우하단 위젯으로 라이트/다크 전환 (localStorage 저장) |
| A- / A / A+ | 글자 크기 3단계 조절 (전 페이지 공통) |
| Ctrl+Enter | 모든 입력창에서 Ctrl+Enter로 즉시 제출 |

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Backend | Python 3.9+, Flask 3.0, flask-limiter |
| Frontend | HTML / CSS / Vanilla JavaScript (모바일 반응형) |
| LLM | Groq (`llama-3.3-70b-versatile`) — Gemini, Ollama 교체 가능 |
| RAG | 법제처 국가법령정보 Open API |
| 파일 파싱 | pdfplumber (PDF), python-docx (DOCX), pyhwp (HWP), zipfile+ElementTree (HWPX) |
| 배포 | Render (Gunicorn) |

## UI 디자인

- **모노크롬 시스템** — `#111111` (블랙) / `#fafafa` (배경) / 그레이 스케일 기반
- **다크 모드** — CSS 변수 기반 완전한 다크 테마, 토글 버튼으로 전환
- **랜딩 히어로** — 타이핑 애니메이션 + 스탯 카운터 + AI 변환 데모 카드
- **오픈 컬럼 레이아웃** — INPUT / RESULT 두 컬럼이 화면을 채우는 구조
- **반응형** — 900px 이하 단일 컬럼, 600px 이하 폰 최적화
- **스크롤 리빌** — IntersectionObserver 기반 카드 순차 등장
- **폰트** — Pretendard (CDN)

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
1. http://localhost:5000/converter 접속
2. 문서 **붙여넣기** 또는 **파일 업로드** (.txt / .pdf / .docx / .hwp / .hwpx)
3. 언어·요약 수준 선택 후 **쉬운말로 변환하기** (또는 Ctrl+Enter)
4. 결과: 쉬운말 변환 · 위험 조항 · 핵심 요약 · 체크리스트 · 단어 풀이
5. 분석 후 하단 채팅창에서 문서에 대해 추가 질문 가능

### 복지 혜택 매칭
1. http://localhost:5000/welfare 접속
2. 나이·가구 유형·소득 수준 등 입력 → **혜택 찾기** 클릭

### 민원 작성 도우미
1. http://localhost:5000/civil 접속
2. 민원 유형 선택 → 상황 설명 (또는 **예시 불러오기**)
3. **민원 작성하기** (또는 Ctrl+Enter) → 결과 복사·저장·PDF

### 계약서 작성 도우미
1. http://localhost:5000/contract 접속
2. 계약 유형 선택 → 상황 설명 (또는 **예시 불러오기**)
3. **계약서 만들기** (또는 Ctrl+Enter) → 결과 복사·저장·PDF

### 행정 절차 안내
1. http://localhost:5000/procedure 접속
2. 절차 유형 선택 → 상황 설명 (또는 Ctrl+Enter)
3. 단계별 절차·필요 서류·소요 시간 확인

### 권리 상담
1. http://localhost:5000/rights 접속
2. 빠른 선택 버튼 또는 상황 직접 입력 (또는 Ctrl+Enter)
3. 관련 법령·권리·즉시 행동 요령·도움 기관 확인

---

## 프로젝트 구조

```
PURI/
├── app.py                  # Flask 서버 (라우트 및 API 엔드포인트)
├── llm_service.py          # LLM 연동 (Groq / Gemini / Ollama)
├── prompts.py              # 한국어 프롬프트 템플릿
├── rag_service.py          # 법제처 법령 RAG
├── requirements.txt
├── templates/
│   ├── base.html           # 공통 레이아웃 (네비, 다크모드, 폰트위젯)
│   ├── landing.html        # 랜딩 페이지 (히어로 + 서비스 카드)
│   ├── index.html          # 문서 변환기
│   ├── welfare.html        # 복지 혜택 매칭
│   ├── civil.html          # 민원 작성 도우미
│   ├── contract.html       # 계약서 작성 도우미
│   ├── procedure.html      # 행정 절차 안내
│   └── rights.html         # 권리 상담
└── static/
    ├── css/style.css       # 전체 스타일 (라이트·다크 모드 포함)
    ├── js/
    │   ├── main.js         # 문서 변환기 JS
    │   ├── landing.js      # 랜딩 애니메이션 (타이핑, 카운터)
    │   ├── welfare.js      # 복지 매칭 JS
    │   ├── civil.js        # 민원 도우미 JS
    │   ├── contract.js     # 계약서 작성 JS
    │   ├── procedure.js    # 행정 절차 JS
    │   └── rights.js       # 권리 상담 JS
    └── data/
        └── term_dict.json  # 행정·법률 용어 사전 (85개)
```
