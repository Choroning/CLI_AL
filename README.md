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

| Role | Name | Student ID |
|:-----|:-----|:----------:|
| Project Manager | Park Cheolwon | 2024270616 |
| Backend | Kang Seonguk | 2022270628 |
| Frontend | Song Minseong | 2024270601 |
| LLM / Prompt Engineering | Kwak Jun | 2023270636 |

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

The project must apply algorithm concepts from the course. The table below will be filled in as the implementation progresses, with pointers to where each concept is used in the code.

| Concept | Where it is used | Notes |
|:--------|:-----------------|:------|
| _e.g., Hashing_ | _TBD_ | _TBD_ |
| _e.g., Dynamic Programming_ | _TBD_ | _TBD_ |
| _e.g., Graph algorithms_ | _TBD_ | _TBD_ |

Candidate concepts: sorting / searching, divide & conquer, greedy, dynamic programming, graph algorithms, hashing, trees (BST / RBT / B-Tree), and others covered in the course.

<br><a name="tech-stack"></a>
## 🛠 Tech Stack

| Layer | Choice |
|:------|:-------|
| Frontend | Next.js 15 (App Router, React 19) + Tailwind CSS |
| Backend | FastAPI + uvicorn (Python 3.11) |
| Database / Auth | Supabase (Postgres, free plan) |
| LLM | Upstage Solar Pro 2 (rewrite, glossary, key-info), Document Parse, Groundedness Check |
| Frontend hosting | Vercel (Hobby plan) |
| Backend hosting | Render (free plan, Singapore) |
| Cold-start mitigation | GitHub Actions cron (`*/10 * * * *`) pinging `/health` |

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the deployment topology and operational notes.


<br><a name="repository-structure"></a>
## 🗂 Repository Structure

```
CLI_AL/
├── backend/             FastAPI app (uvicorn entry: app.main:app)
│   ├── app/
│   │   ├── main.py      App factory + CORS
│   │   ├── config.py    pydantic-settings (UPSTAGE_*, SUPABASE_*, CORS_*)
│   │   ├── routers/     /health · /parse · /rewrite · /history
│   │   └── services/    upstage_client · supabase_client · rewrite_service · …
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
├── .github/             CODEOWNERS · workflows/keepalive.yml
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
