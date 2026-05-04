# 행정문서 쉬운말 변환기 — 프로젝트 계획서

> 어려운 행정문서·공문·약관을 붙여넣으면 (1) 쉬운 한국어 재작성, (2) 핵심 의무·권리·기한 추출, (3) 어려운 용어 풀이, (4) 액션 체크리스트를 **출처 인용**과 함께 제공하는 웹 서비스.

> **이 문서는 살아있는 메모리 파일이다.** 구현 진행 시 [§ Build status](#0-build-status)와 5장 체크박스를 함께 갱신한다.

---

## 0. Build status

> 마지막 업데이트: 2026-05-04 (Auto-mode MVP scaffold)

### 0.1. 스택 변경 사항 (계획서 → 실제 구현)

| 항목 | 원래 계획 | 실제 구현 | 사유 |
|---|---|---|---|
| 관계형 DB | SQLite → PostgreSQL | **Supabase (Postgres cloud)** | 사용자 요청. RLS·Auth·실시간 확장성 + 로컬 설치 부담 제거 |
| 벡터 DB | Chroma (로컬) | **MVP에선 미사용** (RAG 코퍼스 1차 미포함) | 코퍼스 큐레이션 = 별도 워크. 인용은 입력 원문 발췌로 1차 구현 |
| 배포 | Vercel + Render (선택) | **로컬만** (`http://localhost:3000` + `:8000`) | 사용자 요청 |
| 모델 ID | `solar-pro3` | `solar-pro2` 기본값 (env로 교체 가능) | 2026-05 시점 공개 모델. 출시 후 env 변경만으로 전환 |

### 0.2. 디렉터리 구조 (실제)

```
CLI_AL/
├── README.md                  ← 팀 메타 (수정 안 함)
├── PROJECT_PLAN.md            ← 이 파일 (살아있는 메모리)
├── LICENSE
├── .env.example               ← 전체 스택 env 레퍼런스
├── .gitignore
├── backend/                   ← FastAPI
│   ├── pyproject.toml
│   ├── .env.example
│   ├── app/
│   │   ├── main.py            ← FastAPI app + CORS
│   │   ├── config.py          ← pydantic-settings
│   │   ├── routers/           ← /health, /rewrite, /history
│   │   ├── services/          ← upstage_client, supabase_client, rewrite_service, prompt_loader, history_service
│   │   └── models/schemas.py
│   └── tests/                 ← pytest
├── frontend/                  ← Next.js 15 (App Router)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── .env.example
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx           ← 입력 + 결과 표시
│   │   └── history/page.tsx
│   ├── components/            ← GroundednessBadge, RewriteText, GlossaryList, KeyInfoCards, Checklist, Section
│   └── lib/                   ← api.ts, cn.ts
├── llm/
│   ├── prompts/
│   │   ├── rewrite_v1.md      ← 1-call 통합 프롬프트 (현재 사용 중)
│   │   ├── extract_terms_v1.md
│   │   └── extract_keyinfo_v1.md
│   ├── eval/                  ← (예정) 골든셋·평가 스크립트
│   └── corpus/                ← (예정) RAG 코퍼스 원본·정제본
├── supabase/
│   ├── README.md
│   └── migrations/
│       └── 0001_init.sql      ← documents, rewrites, glossary_cache + RLS
├── infra/
│   ├── Makefile               ← make dev / install / test / typecheck
│   └── dev.ps1                ← Windows 동등물
└── docs/
    ├── SETUP.md               ← 로컬 실행 절차 (필독)
    └── adr/                   ← (예정)
```

### 0.3. MVP 완료 (2026-05-04, Round 1)

- [x] 디렉터리 스캐폴드 + .gitignore + .env.example
- [x] Backend FastAPI (`/health`, `/rewrite`, `/history`)
- [x] Upstage 클라이언트 wrapper (Solar Chat + Groundedness Check)
- [x] Supabase 클라이언트 (secret key, fail-soft)
- [x] Supabase 스키마 마이그레이션 (`documents`, `rewrites`, `glossary_cache` + RLS) — **실제 적용 완료**
- [x] 통합 LLM 프롬프트 v1 (`rewrite_v1.md`) — 단일 호출로 재작성·인용·용어·핵심정보·체크리스트 반환
- [x] Frontend Next.js 15 + Tailwind 스캐폴드, 다크모드 대응
- [x] 입력 페이지 + 결과 페이지 (좌우 분할, 인용 마커 클릭, 핵심정보 카드, 체크리스트, 신뢰도 배지)
- [x] 이력 페이지 (Supabase에서 직접 조회)
- [x] 로컬 실행: `make dev` (Linux/Mac) 또는 `pwsh ./infra/dev.ps1` (Windows)
- [x] 면책 고지를 푸터에 고정 노출
- [x] **End-to-end 동작 검증 — 사용자 환경에서 변환 1건 성공, Supabase 저장 확인 (2026-05-04)**

### 0.3.1. Round 2 추가분 (2026-05-04)

- [x] **PDF 업로드 + `/parse` (Upstage Document Parse 연동)** — multipart, 10MB 제한, MIME 화이트리스트
- [x] **Frontend Dropzone** — drag&drop + 클릭, .pdf/.txt 검증, 파싱 후 textarea 자동 채움
- [x] **첫 방문 면책 모달** (`DisclaimerModal`) — localStorage flag, ESC 막힘, 포커스 트랩
- [x] **레이트 리미팅** — IP+엔드포인트 단위 in-memory 슬라이딩 윈도우. `/rewrite` 분당 10회, `/parse` 분당 5회
- [x] **입력 검증 보강** — UTF-8/CP949 인코딩 fallback, 파일 크기·MIME 검증

### 0.3.2. Round 3 — 디자인 시스템 (2026-05-04)

`DESIGN.md` (Linear-style 다크 캔버스 + 라벤더-블루 단일 강조)를 디자인 가이드로 채택. 사용자 요청에 따라 **라이트 모드도 함께 지원** (스펙은 다크 전용이지만 inverse-* 토큰을 확장).

- [x] **CSS 변수 기반 듀얼 테마** — `:root` (light) + `.dark` 변수 스왑. 단일 클래스 셋(`bg-canvas`, `text-ink`, ...)으로 양쪽 모두 동작
- [x] **Tailwind 토큰** — DESIGN.md 컬러/타이포(`display-xl`/`headline`/`body`/`eyebrow`)/라운드(8/12/16) 그대로 매핑
- [x] **폰트** — Pretendard Variable (한국어) + Inter (Latin/숫자) CDN @import. JetBrains Mono 폴백
- [x] **테마 토글** (`ThemeToggle`) — localStorage 저장, `prefers-color-scheme` 폴백, 첫 페인트 전 인라인 스크립트로 플래시 방지
- [x] **layout 갱신** — top-nav 56px 캔버스 바 + 라벤더 브랜드 마크, footer 면책 캡션
- [x] **컴포넌트 단색화** — `KeyInfoCards`/`Checklist`/`GroundednessBadge`에서 rose/emerald/amber/sky/violet 모두 제거. Eyebrow 라벨 + 위계 ink로 구분. 라벤더는 high 우선순위(`Checklist`) 또는 활성 인용 마커에서만
- [x] `globals.css` 컴포넌트 클래스 — `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.eyebrow`, `.pill`, `.citation-marker`
- [x] 전역 포커스 링 — 라벤더 #5e69d1 2px

이후 모든 UI 변경은 `DESIGN.md`를 다시 읽고 토큰 기반으로 진행.

### 0.3.3. Round 4 — 페이지 분리 (2026-05-04)

랜딩과 서비스 화면을 분리.

- [x] **`/` (랜딩)** — 서버 컴포넌트. Hero(display-lg + 라벤더 강조 + 주 CTA "지금 변환하기"), 3-step "어떻게 작동하나요", 6-card "결과 화면이 보여드리는 것", "왜 결과를 믿어도 되는가" 2-card, 마지막 CTA 배너 (cta-banner 토큰 sized — surface-1 padding 96px)
- [x] **`/convert`** — 기존 입력·결과 UI를 그대로 이전. 헤더는 가벼운 "원문 입력" 한 줄로 축소
- [x] **`/history`** — 기존 그대로 (스타일은 디자인 시스템 적용 완료)
- [x] **Top-nav** — `변환` / `이력` / 테마 토글 순서. 브랜드 마크는 `/`로 복귀

라우트 표:

| 경로 | 역할 |
|---|---|
| `/` | 랜딩 (소개 · CTA) |
| `/convert` | 변환 도구 (붙여넣기 · 업로드 · 결과) |
| `/history` | 변환 이력 |

### 0.3.4. Round 5 — 가독성 + 레이아웃 재구성 (2026-05-04)

타겟 사용자(부모님 세대 포함, 행정용어 비전문가)를 고려해 **하한 글자 크기**, **사용자 조절 가능한 글자 크기**, **좌우 2열 입력 레이아웃**, **인용 hover 미리보기**, **인쇄/복사 액션** 적용.

- [x] **하한 폰트 크기 보강** — `caption` 12→14, `body-sm` 14→15, `eyebrow` 13→14, `button` 14→15. 본문 줄간격 1.50→1.65~1.70 (한국어 가독성). 자간 px → em으로 일원화. 디스플레이 사이즈는 그대로
- [x] **읽기 텍스트 토큰 rem 화** — 본문군(`caption`~`subhead`, `card-title`)은 rem, 디스플레이군은 px 유지
- [x] ~~글자 크기 토글 (A·A·A)~~ → **단일 큼직 사이즈** (2026-05-04 결정). `<html>` 베이스 16 → **18px** 고정. 본문(rem)과 spacing 모두 한 단계 큼. 토글 인프라(`TextSizeToggle`, data-size 룰, localStorage 키) 제거
- [x] **읽기 텍스트 floor을 `body-lg`(≈20.25px)로 격상** (2026-05-04, 사용자 지적) — `body`/`body-sm`/`caption`/`button`/`eyebrow` 토큰 모두 `1.125rem`로 통일. `subhead`(≈24.8px)·`card-title`(≈29.3px)·`headline`(36px) 한 단계씩 위로 끌어올려 위계 유지. 디스플레이는 그대로. 토큰 이름은 API 호환성 위해 유지하되 시각적으론 별칭화. 인라인 `text-[10px/11px]`은 브랜드 모노그램·인용 마커 칩에 한해 예외 (reading content 아님)
- [x] **`/convert` 좌우 2열 입력** — `lg:grid-cols-5` 위에 `2/3` 분할 (파일 / 텍스트). textarea가 너무 넓어지지 않게. < lg에서는 자동 stack
- [x] **`word-break: keep-all`** — 한국어 단어 단위 줄바꿈 (영문 단어처럼 음절 단위로 깨지지 않도록)
- [x] **인용 마커 hover 미리보기** — 클릭 안 해도 마우스/포커스 올리면 원문 발췌가 별도 박스에 미리 표시. 부모님이 "1번 누르세요" 단계를 몰라도 보임
- [x] **결과 액션 바** — `결과 복사` (clipboard, 평문 포맷), `인쇄` (window.print)
- [x] **인쇄용 CSS** (`@media print`) — header/footer/dropzone/액션바 숨김, 강제 흰 배경 검정 글자, 카드 페이지 break 보호, 인용 마커 평문 첨자화
- [x] **친절한 에러 매핑** — HTTP 상태코드(413/415/429/502/503/5xx/network)를 사용자 언어 한국어로 변환 (`lib/api.ts#friendlyError`)
- [x] **textarea 접근성** — `aria-labelledby`로 이븐브로 헤딩 연결

### 0.3.5. Round 5 Hotfix — 컨트라스트·균형 (2026-05-04)

사용자 피드백: 본문 글자가 흐리고, 좌우 입력 박스 사이즈가 안 맞음.

- [x] **본문 컨트라스트 일괄 보정** — 사용자가 *읽으려고 온* 텍스트(재작성 본문, 용어 정의, 인용 발췌, 핵심정보 카드 본문, 체크리스트 항목, 원문 패널, 면책 모달, 이력 미리보기, 랜딩의 설명 단락)는 모두 `text-ink-muted` → `text-ink`로 격상. `text-ink-muted`/`subtle`은 메타정보·캡션·placeholder·우선순위 도트 라벨 등 진짜 보조적인 곳에만
- [x] **footer 면책** caption→body-sm, ink-subtle→ink (작더라도 컨트라스트는 확보)
- [x] **`/convert` 좌우 균형** — `lg:grid-cols-5` 2/3 분할 → `lg:grid-cols-2 lg:items-stretch` 50/50, 양쪽 `flex flex-col` + Dropzone에 `flex-1 min-h-[260px]`로 textarea 높이와 자동 매칭. 빈 공간 사라짐
- [x] **Dropzone 시각 보강** — 업로드 아이콘 + 큼지막한 안내 문구. 호버 시 라벤더 강조
- [x] **메모리 영구 규칙 추가** — `contrast_and_layout.md`에 "본문은 muted 금지", "사이드 바이 사이드 입력은 시각 균형 필수" 명시. 향후 모든 UI 변경에 적용

### 0.4. 다음 작업 (Round 3+)

- [ ] **SSE 스트리밍** — 현재 JSON-mode 응답이라 토큰 스트리밍이 부분 JSON을 만들어 활용도 낮음. 다중 호출 아키텍처로 분리하거나 status-event SSE만 보내는 식으로 재검토
- [ ] **RAG 코퍼스** — 국립국어원 자료 + 법령 용어 수집·정제, Chroma 적재, `/glossary/{term}` 정밀화
- [ ] **사용자 인증** (Supabase Auth) — `/history`를 사용자별로
- [ ] **골든셋 v0 (10건)** → eval 스크립트 → 30건 확장
- [ ] **자동 eval** — 용어 추출 P/R, BERTScore, Groundedness 분포, 인용 정확도
- [ ] **프롬프트 인젝션·자문성 가드 회귀 테스트** — 현재 프롬프트엔 명시되어 있으나 테스트 없음
- [ ] **Lighthouse 90+ 튜닝** — 이미지 최적화, 폰트, 번들 사이즈
- [ ] **모바일 반응형 정밀 튜닝** + 접근성 회귀
- [ ] **README 업데이트** — TBD 채우기, 데모 스크린샷, 영상 링크
- [ ] **발표 산출물** — 영상 2분, 슬라이드 영문, 모델 카드

### 0.5. 환경변수 키 매핑 (한눈에)

| Key | Backend | Frontend | 비고 |
|---|:-:|:-:|---|
| `UPSTAGE_API_KEY` | ✓ | | Solar Chat + Groundedness |
| `SUPABASE_URL` | ✓ | (NEXT_PUBLIC_) | |
| `SUPABASE_PUBLISHABLE_KEY` | | (NEXT_PUBLIC_) | 브라우저용. RLS 적용 (legacy: `anon`) |
| `SUPABASE_SECRET_KEY` | ✓ | ✗ 절대 노출 금지 | RLS 우회 (legacy: `service_role`) |
| `NEXT_PUBLIC_API_BASE_URL` | | ✓ | FE → BE 호출 주소 |
| `SOLAR_MODEL` | ✓ | | 기본 `solar-pro2` |
| `GROUNDEDNESS_THRESHOLD` | ✓ | | 0.7 (현재 미사용 — 스코어 노출 시 사용) |

상세 절차: [docs/SETUP.md](docs/SETUP.md).

---

## 1. 프로젝트 정의

### 한 줄 요약
어려운 행정문서를 붙여넣으면 출처 인용이 달린 쉬운말 재작성·용어 풀이·핵심정보 카드·체크리스트를 만들어주는 웹 애플리케이션.

### 문제 정의
법령 용어, 행정 표현, 약관 문장은 일반인이 읽고 자기 권리·의무·기한을 정확히 파악하기 어렵다. 이 정보 격차는 실제 권리 행사 누락, 신청 기한 미준수, 부당한 계약 동의로 이어진다. 한국어 LLM(Solar)과 RAG를 결합해 "원문 의미 보존 + 출처 인용 + 신뢰도 검증"을 모두 만족하는 변환 도구를 만든다.

### 타겟 사용자 (MVP)
한국어가 모국어이지만 법률·행정 용어에 익숙하지 않은 일반 성인.
예: 사회초년생이 받은 임대차 계약 특약사항, 부모님이 받은 건강보험공단 안내문, 청년 정책 신청 공고문.

### 스코프

**포함 (Must)**
- 입력: 텍스트 붙여넣기 + PDF 업로드 (Upstage Document Parse)
- 출력: 쉬운말 재작성, 어려운 용어 풀이, 핵심정보 카드(의무/권리/기한/금액), 액션 체크리스트
- 출처 인용 표시, Groundedness Check 신뢰도 배지
- 모든 결과에 "최종 확인은 공식 자료/전문가" 면책 고정

**제외 (Out of scope)**
- 음성 입력/출력, 손글씨 OCR
- 다국어 지원 (영어/중국어 등)
- 모바일 네이티브 앱
- 실시간 협업 편집
- "법률 자문" 역할 — 자문성 질문은 거부

---

## 2. 기술 스택

| 레이어 | 선택 | 비고 |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui | AI 도구로 컴포넌트 초안 생성 후 정리 |
| Backend | FastAPI (Python 3.11+), Uvicorn | LangChain Upstage 통합 매끄러움 |
| LLM | Upstage **Solar Pro 3** (`solar-pro3` 최신 버전) | 한국어 SOTA, 128K 컨텍스트, AI Initiative 무료 |
| 임베딩 | `solar-embedding-1-large` (query/passage 분리) | Solar 생태계 일관성 |
| 문서 파싱 | Upstage **Document Parse** | PDF 표·레이아웃 보존 |
| 출력 검증 | Upstage **Groundedness Check** | 할루시네이션 방지 |
| Vector DB | Chroma (로컬 파일 기반) | 학부 규모에 적합, deps 가벼움 |
| RDB | ~~SQLite → PostgreSQL~~ → **Supabase (Postgres cloud)** | 사용자/히스토리 저장. RLS 사용 |
| 협업 | GitHub, GitHub Projects, Discord/Slack | PR 리뷰, GitHub Actions 자동 배포 |
| 배포 (선택) | Vercel (FE) + Render/Fly.io (BE) | 무료 티어 |
| 보조 도구 | Claude Code (1개월 라이선스 활용), Google AI Studio·v0 (UI 초안) | 운영 환경엔 직접 검수 후 반영 |

### 데이터 소스 (RAG 코퍼스)
1. 국립국어원 「한눈에 알아보는 공공언어 바로 쓰기(개정판, 2024)」
2. 국립국어원 「쉬운 공문서 쓰기 길잡이」
3. 국립국어원 「행정문서 표현 개선 및 쉬운 공공언어 쓰기 지침」(2021)
4. 법제처 국가법령정보센터 — 법령용어 데이터셋(공공데이터포털)
5. (선택) 국가법령정보 OPEN API — 조문 실시간 fetch

> **라이선스 주의**: 국립국어원 자료는 공공누리 4유형(출처표시 + 상업적 이용금지 + 변경금지). 학부 비상업 프로젝트라 사용 가능하나 결과 화면에 출처 표시 의무가 있으므로 **인용 UI는 필수 기능**.

---

## 3. 시스템 아키텍처

```
[브라우저]
    │
    │ 텍스트 / PDF
    ▼
[Next.js Frontend]
    │
    │ REST + SSE
    ▼
[FastAPI Backend]
    │
    ├─→ [Upstage Document Parse]   PDF → Markdown
    │
    ├─→ [용어 추출 LLM]   Solar Pro 3, JSON 강제 출력
    │       ↓ 어려운 용어 리스트
    │   [Chroma Vector Search]   ← solar-embedding-1-large
    │       ↓ 정의·예시 컨텍스트
    │
    ├─→ [재작성 LLM]   Solar Pro 3, 인용 마커 강제
    │
    ├─→ [핵심정보 추출 LLM]   구조화 출력 (의무/권리/기한/금액)
    │
    └─→ [Groundedness Check]   재작성 결과 ↔ 원문 검증
            ↓
    [최종 응답: 재작성 + 인용 + 체크리스트 + 신뢰도]
```

### 사전 적재 코퍼스 빌드 파이프라인
```
원본 PDF/HTML
    → 텍스트 추출 + 정제 (불필요한 헤더/푸터 제거)
    → 청킹 (전략 A/B 테스트: 문단 단위 vs 슬라이딩 윈도우 512토큰)
    → solar-embedding-1-large-passage 임베딩
    → Chroma 적재 (메타데이터: 출처, 페이지, 절 번호)
```
인덱스 빌드는 **명령 한 줄(`make build-index`)로 재현 가능**해야 함.

---

## 4. 사전 준비 (가장 먼저 해야 할 일)

이 단계가 **블로킹 요소**이므로 프로젝트 시작과 동시에 진행한다.

- [ ] **AI Initiative 프로그램 신청** (Upstage) — 승인까지 며칠 소요. Solar Pro 및 Document Parse 무료 사용 자격 확보. **0순위 작업**.
- [ ] GitHub Organization 또는 공용 Repo 생성, 팀원 권한 부여
- [ ] 브랜치 전략 합의: `main`(보호) / `develop` / `feat/*` / `fix/*`
- [ ] PR 템플릿, 커밋 메시지 컨벤션(Conventional Commits 권장), 코드 리뷰 정책
- [ ] 팀원 전원 Upstage Console 가입 → Playground에서 Solar Pro 3 30분 체험
- [ ] Claude Code 1개월 라이선스 분배 및 활용 가이드 공유
- [ ] 주간 정기 회의 시간 고정, 노션/깃헙 프로젝트 보드 생성
- [ ] (선택) NVIDIA NIM 가입 — 보조 임베딩이나 멀티모달 폴백용

---

## 5. 작업 항목 (전체)

### 5.1 기획·설계
- [ ] 사용자 페르소나 1명 확정, 유스케이스 시나리오 5개 작성
- [ ] 와이어프레임 (Figma 또는 Excalidraw): 입력 화면, 결과 화면, 용어 풀이 모달, 히스토리, 면책 고지
- [ ] OpenAPI 명세 v1 작성: `/parse`, `/rewrite`, `/glossary/{term}`, `/extract`, `/history`
- [ ] DB 스키마 설계: `users`, `documents`, `rewrites`, `glossary_cache`
- [ ] 평가용 **골든셋 v0** — 실제 공문 10건을 직접 쉬운말로 변환한 정답 세트 (이게 이후 모든 평가의 기준)
- [ ] 위험 목록·면책 정책 문서화

### 5.2 Frontend
- [x] Next.js 15 프로젝트 부트스트랩, Tailwind 설치 (shadcn/ui는 추후 도입 검토)
- [x] 글로벌 레이아웃, 다크모드 대응, 라우팅
- [x] 입력 페이지: 텍스트 영역 + 글자수 카운터 + 예시 채우기 + **PDF 드롭존**
- [x] 결과 페이지: 원문/재작성 좌우 분할, 인용 마커 클릭 인터랙션
- [ ] 용어 풀이 사이드 모달 (현재는 인라인 카드 형태 — 클릭 시 모달 확장은 추후)
- [x] 핵심정보 카드 컴포넌트 (의무/권리/기한/금액/연락처)
- [x] 액션 체크리스트 컴포넌트 (체크박스 + 우선순위 도트)
- [x] Groundedness 신뢰도 배지 (높음/보통/낮음)
- [x] **면책 고지 모달 (첫 방문 강제 노출, localStorage)**
- [x] 기본 로딩·에러 상태
- [ ] 빈 상태 일러스트, 모바일 정밀 튜닝, 접근성 회귀 테스트
- [ ] Lighthouse 90점 이상 목표

### 5.3 Backend
- [x] FastAPI 프로젝트 부트스트랩, env 관리(pydantic-settings), CORS (Docker는 추후)
- [x] Upstage API 클라이언트 wrapping — Chat (OpenAI 호환) + Groundedness Check + **Document Parse**
- [x] `/parse` — PDF/TXT 업로드 → Markdown 반환 (Document Parse 또는 인코딩 자동 감지)
- [x] `/rewrite` — 재작성 + 인용 + 핵심정보 + 체크리스트 + Groundedness (단일 응답, SSE는 추후)
- [ ] `/glossary/{term}` — 용어 풀이 (RAG 도입 시. 현재는 `rewrite_v1` 응답에 인라인 포함)
- [x] `/extract` 기능은 `/rewrite` 응답에 통합 (별도 엔드포인트 분리는 평가 결과 보고 결정)
- [x] `/history` — 변환 이력 (Supabase 직접 조회, 인증 없음)
- [x] **입력 검증** — 파일 크기 10MB 제한, MIME 화이트리스트(pdf/txt), UTF-8/CP949 인코딩 fallback
- [x] **레이트 리미팅** — IP+엔드포인트 슬라이딩 윈도우 (`/rewrite` 10/분, `/parse` 5/분)
- [ ] 로깅·모니터링 강화 (현재는 stdlib logging만)
- [x] Smoke 테스트 (`/health`, prompt loader). 통합 테스트는 추후

### 5.4 LLM / 프롬프트 엔지니어링
- [ ] 코퍼스 수집·정제 (2차)
- [ ] 청킹 전략 A/B 테스트 (2차)
- [ ] Chroma 적재 스크립트 (2차)
- [x] **재작성 프롬프트 v1** — 원문 의미 보존 / 초등 6학년 수준 / 인용 마커 강제 / 출처 미상 정보 추가 금지. Few-shot은 향후 골든셋과 함께 추가 예정. (`llm/prompts/rewrite_v1.md`)
- [x] **용어/핵심정보 추출** — 단독 프롬프트 파일은 작성됨 (`extract_terms_v1.md`, `extract_keyinfo_v1.md`)이지만 현재는 `rewrite_v1`이 통합 처리
- [x] **프롬프트 인젝션 방어 / 자문성 질문 거부** — `rewrite_v1.md`에 명시. 회귀 테스트는 2차
- [x] Groundedness Check 통합 (label만 사용. 점수 노출은 2차)
- [ ] 골든셋 v0 (10건) → 30건 확장 (2차)
- [ ] 자동 eval 스크립트 (2차)
- [x] 프롬프트 버전 히스토리 관리 시작 (`v1.md` 컨벤션)

### 5.5 통합·QA
- [ ] 엔드투엔드 데모 시나리오 — 실제 공문 1건으로 입력→결과까지 끊김 없이
- [ ] 사용자 테스트 5명 모집 (학과 후배·가족), 인터뷰 스크립트 + 노트
- [ ] 사용자 테스트 결과 우선순위(Must/Should/Could) 결정 후 반영
- [ ] 성능 측정 — 평균/95p 응답 시간, 동시 요청 처리

### 5.6 배포·문서화·발표
- [x] **로컬 배포** — `make dev` / `pwsh ./infra/dev.ps1` (사용자 요청에 따라 클라우드 배포는 제외)
- [x] **docs/SETUP.md** — Upstage·Supabase 키 발급, 환경변수, 실행, 트러블슈팅 (실질적 README 역할)
- [ ] README 업데이트 (TBD 채우기) — 2차
- [ ] 데모 영상 2분, 발표 슬라이드(영문), 모델 카드, 발표 리허설 — 2차

---

## 6. 팀원 역할 분담 (4인)

| 역할 | 핵심 책임 | 평가 받기 좋은 산출물 |
|---|---|---|
| **PM** | 일정·스코프·리스크 관리, 회의 운영, 사용자 인터뷰, 문서화, 발표 총괄 | 회의록, 의사결정 로그(ADR), 위험 관리 표, 발표 슬라이드, 데모 영상 |
| **Frontend** | UI/UX, 접근성, 상태 관리, API 연동, 성능 최적화 | Lighthouse 점수, 반응형/접근성 데모, 컴포넌트 라이브러리 |
| **Backend** | API 설계, DB, Document Parse 통합, 인증, 배포, 모니터링 | OpenAPI 문서, 시퀀스 다이어그램, 응답 시간 그래프, 테스트 커버리지 |
| **LLM / 프롬프트** | 코퍼스 큐레이션, 청킹/임베딩 전략, 프롬프트 설계, RAG 검색 품질, 평가 | 평가 리포트(정량 지표 포함), 프롬프트 버전 히스토리, 골든셋 |

> PM도 가능하면 **데이터 정제 스크립트**나 **eval 자동화** 같은 비-크리티컬한 코드 작업 한두 개를 직접 PR로 기여하기 — 발표 때 "PM도 손을 댔다" 한 줄이 평가에 유리.

---

## 7. 주요 리스크와 대응

| 리스크 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| AI Initiative 승인 지연 | 중 | 높음 | 프로젝트 시작과 동시에 신청. 승인 전엔 Upstage 무료 $10 크레딧으로 진행. |
| Solar Pro 무료 기간(2026-03-31) 종료 후 비용 발생 | 중 | 중 | 이후 시점에 데모할 일이 있으면 Solar Mini + 자체 크레딧으로 fallback 가능하게 모델 추상화. |
| RAG 검색 품질 낮음 | 높음 | 높음 | 청킹 전략 2~3개 A/B 테스트 일찍 끝내기, Reranking(Cross-encoder) 검토. |
| 잘못된 변환이 실제 피해 유발 | 낮음 | 매우 높음 | 면책 고정, Groundedness 임계값, 자문성 질문 거부 가드. |
| 4명 일정 어긋남 | 높음 | 중 | 매주 정기 데모 + 블로커 24시간 내 PM 해소 정책. |
| 코퍼스 라이선스 위반 | 낮음 | 높음 | 공공누리 4유형 출처 표시 의무 준수, 원문 재배포 금지 (검색·인용으로만 활용). |
| 프롬프트 인젝션 / 시스템 프롬프트 누출 | 중 | 중 | 입력 sanitization, 시스템 프롬프트 분리, 누출 시도 패턴 차단. |

---

## 8. 평가 지표 (발표용)

학부 LLM 프로젝트 대부분이 정성 평가로 끝나므로 정량 지표는 그 자체로 차별화 포인트.

| 지표 | 측정 방법 | 목표 |
|---|---|---|
| 용어 추출 정확도 | 골든셋 30개 기반 recall/precision | F1 ≥ 0.75 |
| 재작성 의미 보존 | BERTScore (원문 vs 재작성) | ≥ 0.85 |
| 재작성 가독성 | 사람 평가 3인 5점 척도 합의 | 평균 ≥ 4.0 |
| 인용 정확도 | 인용 마커 100건 수동 검증 | ≥ 90% |
| Groundedness 점수 분포 | Upstage Groundedness Check API | 평균 ≥ 0.8 |
| 사용자 테스트 만족도 | 5명 인터뷰 후 5점 척도 | 평균 ≥ 4.0 |
| 응답 시간 (P95) | API 부하 측정 | ≤ 10초 |

---

## 9. 차별화 포인트 (발표 슬라이드 한 장 분량)

1. **사회적 임팩트가 분명한 문제 정의** — 행정문서 이해 격차는 권리 행사 누락으로 이어짐. 국립국어원 인식조사 결과 인용 가능.
2. **출처 인용 + Groundedness 이중 안전장치** — 대부분의 학부 LLM 프로젝트가 닿지 못하는 신뢰성 영역.
3. **정량 평가 기반 개선 사이클** — 30개 골든셋, 4가지 자동 지표, 5명 사용자 테스트.
4. **Solar 생태계 풀스택 활용** — Document Parse + Embedding + Chat + Groundedness Check 4개 API를 한 워크플로우로 통합. "왜 Solar인가"에 명확한 답.

---

## 10. 디렉터리 구조 (제안)

```
admin-doc-translator/
├── README.md
├── docs/
│   ├── PROJECT_PLAN.md           ← 이 문서
│   ├── ARCHITECTURE.md
│   ├── API.md                     ← OpenAPI 기반 자동 생성
│   ├── PROMPTS.md
│   ├── EVAL_REPORT.md
│   └── adr/                       ← Architecture Decision Records
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── services/
│   │   └── models/
│   ├── tests/
│   └── pyproject.toml
├── llm/
│   ├── corpus/                    ← 원본 PDF/텍스트 (gitignore, 빌드 스크립트로 재현)
│   ├── prompts/
│   │   ├── extract_terms_v1.md
│   │   ├── rewrite_v1.md
│   │   └── extract_keyinfo_v1.md
│   ├── eval/
│   │   ├── golden_set.jsonl
│   │   ├── run_eval.py
│   │   └── reports/
│   └── scripts/
│       └── build_index.py
├── infra/
│   ├── docker-compose.yml
│   └── Makefile
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

---

## 11. 면책 고지 (필수, 모든 결과 화면 하단 고정)

> 본 서비스가 제공하는 변환 결과는 **참고용**이며 법적 효력이 없습니다. 실제 권리·의무·기한 등에 관한 최종 확인은 반드시 **원문 또는 발급 기관·전문가**를 통해 진행해 주세요. 본 서비스는 변환 과정에서 발생할 수 있는 오역·누락·해석 오류에 대해 책임지지 않습니다.

---

*이 문서는 살아있는 문서다. 결정이 바뀌면 PR로 수정하고 ADR에 사유를 남긴다.*
