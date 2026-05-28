# [Spring 2026] Algorithms — Term-Project: Team CLI

![Last Commit](https://img.shields.io/github/last-commit/Choroning/CLI_AL)
![Languages](https://img.shields.io/github/languages/top/Choroning/CLI_AL)

This repository hosts **Team CLI**'s term-project for the Spring 2026 Algorithms course at Korea University Sejong — a web-based LLM application powered by **Upstage Solar**, with a **Frontend + Backend** architecture, that intentionally applies algorithm concepts learned in the course.

*Team CLI — Korea University Sejong, Department of Computer Science and Software Engineering — Spring 2026*
<br><br>

## 📑 Table of Contents

- [About This Repository](#about-this-repository)
- [Course Information](#course-information)
- [Team](#team)
- [Project Overview](#project-overview)
- [Algorithm Concepts Applied](#algorithm-concepts-applied)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Roadmap](#roadmap)
- [License](#license)

---


<br><a name="about-this-repository"></a>
## 📝 About This Repository

This repository organizes the source code, documentation, and deliverables for Team CLI's term-project in the Spring 2026 Algorithms course.

> **🤖 AI-Assisted Development**
> This course encourages the use of AI agents.
> A team [Claude Code](https://claude.ai/download) license is provided by the course, and is used actively for coding, refactoring, debugging, testing, and documentation throughout the project.

<br><a name="course-information"></a>
## 📚 Course Information

- **Semester:** Spring 2026 (March – June)
- **Affiliation:** Korea University Sejong

| Course&nbsp;Code| Course            | Type          | Instructor      | Department                              |
|:----------:|:------------------|:-------------:|:---------------:|:----------------------------------------|
|`DCSS309-00`|ALGORITHM|Major Required|Prof. Unggi&nbsp;Lee|Department of Computer Science and Software Engineering|

- **📖 References**

| Type | Contents |
|:----:|:---------|
|Textbook|"Introduction to Algorithms, 3rd Edition" by Cormen, Leiserson, Rivest, and Stein (CLRS)|
|Lecture Notes|[Instructor's Markdown notes and slides (GitHub)](https://github.com/codingchild2424/2026-lecture-algorithm)|
|LLM API|[Upstage Solar — AI Initiative 2025](https://www.upstage.ai/events/ai-initiative-2025-ko)|
|Auxiliary API|NVIDIA NIM (NVIDIA Inference Microservices)|

<br><a name="team"></a>
## 👥 Team

**Team name:** CLI

| Role | Name |
|:-----|:-----|
| Project Manager | Park Cheolwon |
| Backend | Kang Seonguk |
| Frontend | Song Minseong |
| LLM / Prompt Engineering | Kwak Jun |

<br><a name="project-overview"></a>
## 🎯 Project Overview

**행정문서 쉬운말 변환기** — paste or upload an administrative document (lease clause, public notice, government form, contract, etc.) and the service returns a plain-Korean rewrite with citation markers, a glossary of difficult terms, key-info cards (obligations, rights, deadlines), and an action checklist.

### Core Features

1. **Plain-Korean rewriting** of administrative documents with `[1]` `[2]` citation markers tying each claim back to the source.
2. **Structured extraction** — glossary, key-info cards, and action checklist generated alongside the rewrite.
3. **Groundedness check** — every response is scored by Upstage's Groundedness API and surfaced as a coloured badge so users know when to double-check the original.

### Demo

- Live: https://cli-al.vercel.app
- API: https://cli-al-backend.onrender.com/health

<br><a name="algorithm-concepts-applied"></a>
## 🧠 Algorithm Concepts Applied

All five concepts are implemented in [`Backend/app/services/algorithms.py`](Backend/app/services/algorithms.py) and called from [`Backend/app/services/rewrite_service.py`](Backend/app/services/rewrite_service.py) as part of the `/rewrite` response pipeline.

| Concept | CLRS | Where it is used | Complexity | Notes |
|:--------|:----:|:-----------------|:----------:|:------|
| **Hash Table — Chaining** | Ch. 11.2 | `HashTableChaining` + `dedup_glossary` in `algorithms.py`; called in `rewrite_service.py` after glossary parsing | O(1) avg insert/lookup | Polynomial rolling hash `h = (h·131 + ord(c)) mod m`; handles arbitrary Unicode (Korean). Removes duplicate glossary terms the LLM may emit before any further processing. |
| **Merge Sort** | Ch. 2.3 | `merge_sort_glossary` in `algorithms.py`; called in `rewrite_service.py` after dedup | Θ(n log n) | Stable sort — equal terms preserve their original relative order. Sorts the deduplicated glossary alphabetically (case-insensitive) so the UI renders a consistent dictionary-style list. |
| **Counting Sort** | Ch. 8.2 | `counting_sort_checklist` in `algorithms.py`; called in `rewrite_service.py` after checklist parsing | Θ(n + k), k = 3 | Sorts checklist items by priority (high → medium → low). k is bounded at 3, so this runs in linear time. Stable: items with the same priority keep their LLM-output order. |
| **Dynamic Programming — LCS** | Ch. 15.4 | `lcs_word_ratio` in `algorithms.py`; called in `rewrite_service.py` after the LLM rewrite | O(mn) time, O(n) space | Word-tokenised LCS between the original document and the plain-Korean rewrite. Normalised to [0, 1] as `LCS_length / max(|original|, |rewrite|)`. Returned as `preservation_ratio` in the API response alongside the Upstage Groundedness label, giving a purely local, deterministic measure of content fidelity. Space-optimised to two rolling rows instead of the full O(mn) table. |
| **Graph — BFS** | Ch. 22.1–22.2 | `build_term_graph` + `bfs_related_terms` in `algorithms.py`; called in `rewrite_service.py` after glossary is finalised | O(V + E) | Builds a directed adjacency list where an edge A → B exists when term B appears in the definition of term A (i.e., understanding A requires knowing B). BFS from each term discovers all transitively related terms. Results are attached to each `GlossaryTerm` as `related_terms` in the API response. |

<br><a name="tech-stack"></a>
## 🛠 Tech Stack

| Layer | Choice |
|:------|:-------|
| Frontend | Next.js 15 (App Router, React 19) + Tailwind CSS |
| Backend | FastAPI + uvicorn (Python 3.11) |
| Database / Auth | Supabase (Postgres, free plan) |
| LLM | Upstage Solar Pro 2 (rewrite, glossary, key-info), Document Parse, Groundedness Check |
| External APIs | 국가법령정보센터 Open API (legal term lookup via `GET /law/term`) |
| Frontend hosting | Vercel (Hobby plan) |
| Backend hosting | Render (free plan, Singapore) |
| Cold-start mitigation | External cron pinger (cron-job.org, every 5 min) on `/health` |

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the deployment topology and operational notes.


<br><a name="repository-structure"></a>
## 🗂 Repository Structure

```
CLI_AL/
├── backend/             FastAPI app (uvicorn entry: app.main:app)
│   ├── app/
│   │   ├── main.py      App factory + CORS
│   │   ├── config.py    pydantic-settings (UPSTAGE_*, SUPABASE_*, CORS_*, LAW_API_KEY)
│   │   ├── routers/     /health · /parse · /rewrite · /history · /law
│   │   └── services/    upstage_client · supabase_client · rewrite_service · law_client · …
│   ├── tests/           pytest
│   └── pyproject.toml
├── frontend/            Next.js (App Router)
│   ├── app/             page.tsx · convert/ · history/
│   ├── components/      Dropzone · RewriteText · GroundednessBadge · …
│   ├── lib/api.ts       FastAPI client
│   └── package.json
├── llm/prompts/         Versioned prompt templates (rewrite_v1, extract_*_v1)
├── supabase/migrations/ 0001_init.sql (documents · rewrites · glossary_cache)
├── infra/               Makefile + dev.ps1 for local two-server bring-up
├── docs/                SETUP.md (local dev) · DEPLOY.md (production)
├── .github/             CODEOWNERS
└── render.yaml          Render Blueprint (backend service definition)
```

<br><a name="deliverables"></a>
## 📦 Deliverables

| # | Deliverable | Description | Status |
|:-:|:------------|:------------|:------:|
| 1 | Application | Working product + full source code (this repository) | MVP deployed |
| 2 | Technical Report | System architecture, tech stack, LLM usage, key implementation details, limitations | Pending |
| 3 | Development Process Document | Planning → scheduling → execution → retrospective; meeting notes, timelines, per-role progress, issue tracking | Pending |
| 4 | Presentation Slides | Final presentation deck — **in English** | Pending |

> The final presentation will take place during class. **Both the slides and the presentation itself must be in English.**

<br><a name="roadmap"></a>
## 🗺 Roadmap

- [x] Team formed
- [x] Public GitHub repository created
- [x] Initial topic statement (one-paragraph summary + 3 core features)
- [x] Upstage Solar API approved
- [ ] NVIDIA NIM access (optional)
- [x] Claude Code 1-month license assigned to team representative
- [x] Proposal
- [x] Prototype
- [x] MVP — deployed to Vercel + Render
- [ ] Feature polish
- [ ] Technical report
- [ ] Development process document
- [ ] Presentation slides

<br><a name="license"></a>
## 🤝 License

This repository is released under the [MIT License](LICENSE).

---
