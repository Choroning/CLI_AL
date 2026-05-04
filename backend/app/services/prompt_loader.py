"""Load prompts from llm/prompts/*.md.

Each prompt file uses headings `## SYSTEM` and `## USER (...)` to delimit
sections. We extract the SYSTEM section as the system prompt — USER content
comes from the actual request at runtime.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

# backend/app/services/prompt_loader.py -> repo root is parents[3]
REPO_ROOT = Path(__file__).resolve().parents[3]
PROMPTS_DIR = REPO_ROOT / "llm" / "prompts"


def _extract_section(markdown: str, heading: str) -> str:
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}.*?\n(.*?)(?=^##\s|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(markdown)
    if not m:
        raise ValueError(f"Section '## {heading}' not found in prompt file.")
    return m.group(1).strip()


@lru_cache
def load_prompt(name: str) -> str:
    """Return the SYSTEM section of llm/prompts/<name>.md."""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    md = path.read_text(encoding="utf-8")
    return _extract_section(md, "SYSTEM")
