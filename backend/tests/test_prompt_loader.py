from app.services.prompt_loader import load_prompt


def test_rewrite_v2_loads() -> None:
    sys_prompt = load_prompt("rewrite_v2")
    assert "쉬운말" in sys_prompt or "재작성" in sys_prompt
    assert "JSON" in sys_prompt or "json" in sys_prompt
