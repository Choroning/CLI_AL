"""
LLM 작동 확인 테스트 스크립트

실행 방법 (어떤 Python이든 가능):
    python test_llm.py          # 기본 테스트 (백엔드 서버 필요)
    python test_llm.py --nim    # NIM 사용 여부 추가 확인
"""

import asyncio
import io
import json
import sys

import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE_URL = "http://127.0.0.1:8000"
MOCK_SIGNATURE = "개발용 mock LLM 응답입니다"

EXPLAIN_REQUEST = {
    "documentText": "기초연금 수급을 희망하는 사람은 주소지 관할 읍·면·동 행정복지센터에 신청서를 제출하여야 합니다.",
    "selectedText": "소득인정액",
    "selectionType": "word",
    "surroundingContext": "담당 기관은 신청인의 소득인정액을 조사한 뒤 선정기준액 이하에 해당하는 경우 급여 지급 여부를 결정합니다.",
    "mode": "explain",
}

FILL_REQUEST = {**EXPLAIN_REQUEST, "selectedText": "(빈 칸)", "mode": "fillExample"}


# ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

async def post_selection(client: httpx.AsyncClient, payload: dict) -> dict:
    r = await client.post(f"{BASE_URL}/api/simplify/selection", json=payload)
    r.raise_for_status()
    return r.json()


# ── 1. 헬스체크 ───────────────────────────────────────────────────────────────

async def test_health() -> bool:
    print(f"\n[1] 헬스체크 ({BASE_URL}/api/health)")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{BASE_URL}/api/health")
        r.raise_for_status()
        data = r.json()
        print(f"  status        : {data.get('status')}")
        if "llm_provider" in data:
            print(f"  llm_provider  : {data['llm_provider']}")
            print(f"  nim_key_set   : {data['nim_key_set']}")
            print(f"  env_file_path : {data['env_file_path']}")
            print(f"  env_file_exists: {data['env_file_exists']}")
        else:
            print("  [경고] 서버가 최신 코드로 실행되지 않았습니다.")
            print("         백엔드 서버를 완전히 재시작(터미널 닫고 run-dev.bat 재실행)하세요.")
        print("  ✓ PASS")
        return True
    except httpx.ConnectError:
        print("  ✗ FAIL — 서버에 연결할 수 없습니다.")
        print("           run-dev.bat 을 실행하세요.")
        return False
    except Exception as exc:
        print(f"  ✗ FAIL — {exc}")
        return False


# ── 2. explain 모드 ───────────────────────────────────────────────────────────

async def test_explain() -> tuple[bool, bool]:
    """(통과여부, mock여부) 반환"""
    print(f"\n[2] explain 모드 — 단어 설명")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = await post_selection(client, EXPLAIN_REQUEST)
        result = payload.get("resultText", "")
        explanation = payload.get("explanation", "")
        is_mock = MOCK_SIGNATURE in explanation
        print(f"  resultText  : {result[:80]}")
        print(f"  plainMeaning: {payload.get('plainMeaning', '')[:80]}")
        print(f"  공급자      : {'mock (개발용)' if is_mock else 'NIM (실제 AI)'}")
        if payload.get("warnings"):
            print(f"  warnings    : {payload['warnings']}")
        print("  ✓ PASS")
        return True, is_mock
    except httpx.ConnectError:
        print("  ✗ SKIP — 서버 미실행")
        return False, True
    except Exception as exc:
        print(f"  ✗ FAIL — {exc}")
        return False, True


# ── 3. fillExample 모드 (빈 칸 포함) ─────────────────────────────────────────

async def test_fill_example() -> bool:
    print(f"\n[3] fillExample 모드 — 빈 칸 예시 채우기")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            payload = await post_selection(client, FILL_REQUEST)
        print(f"  resultText: {payload.get('resultText', '')[:120]}")
        print("  ✓ PASS")
        return True
    except httpx.ConnectError:
        print("  ✗ SKIP — 서버 미실행")
        return False
    except Exception as exc:
        print(f"  ✗ FAIL — {exc}")
        return False


# ── 4. 요약 엔드포인트 ────────────────────────────────────────────────────────

async def test_summary() -> bool:
    print(f"\n[4] 요약 엔드포인트 (/api/simplify)")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{BASE_URL}/api/simplify",
                json={"documentText": EXPLAIN_REQUEST["documentText"]},
            )
        r.raise_for_status()
        payload = r.json()
        print(f"  summary : {payload.get('summary', '')[:80]}")
        print("  ✓ PASS")
        return True
    except httpx.ConnectError:
        print("  ✗ SKIP — 서버 미실행")
        return False
    except Exception as exc:
        print(f"  ✗ FAIL — {exc}")
        return False


# ── 5. NIM 사용 여부 확인 (--nim 옵션) ────────────────────────────────────────

async def test_nim_check(explain_is_mock: bool) -> bool:
    print(f"\n[5] NIM LLM 사용 여부 확인")

    if not explain_is_mock:
        print("  서버가 NIM 공급자를 사용 중입니다.")
        print("  ✓ PASS")
        return True

    print("  현재 서버는 mock 공급자를 사용 중입니다.")
    print()
    print("  NIM으로 전환하려면:")
    print("  1. backend/.env 파일 생성 (없으면):")
    print("       LLM_PROVIDER=nim")
    print("       NVIDIA_NIM_API_KEY=nvapi-xxxxxxxxxxxxxxxx")
    print("       NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct   # 선택")
    print()
    print("  2. 서버 재시작 후 다시 테스트:")
    print("       python test_llm.py --nim")
    print()

    # .env 파일이 존재하면 내용 확인
    import os
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]
        provider_line = next((l for l in lines if "LLM_PROVIDER" in l), None)
        key_line = next((l for l in lines if "NVIDIA_NIM_API_KEY" in l), None)
        print(f"  현재 .env: {provider_line or 'LLM_PROVIDER 없음'}")
        if key_line:
            key_val = key_line.split("=", 1)[-1].strip()
            masked = key_val[:8] + "..." if len(key_val) > 8 else "(비어 있음)"
            print(f"  현재 .env: NVIDIA_NIM_API_KEY={masked}")
    else:
        print("  backend/.env 파일이 없습니다. 위 내용으로 생성하세요.")

    print("  ✗ FAIL — mock 사용 중 (NIM 미설정)")
    return False


# ── main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    run_nim = "--nim" in sys.argv

    print("=" * 56)
    print("  LLM 테스트 스크립트")
    print("=" * 56)

    results = []

    health_ok = await test_health()
    results.append(health_ok)

    explain_ok, explain_is_mock = await test_explain()
    results.append(explain_ok)

    results.append(await test_fill_example())
    results.append(await test_summary())

    if run_nim:
        if health_ok and explain_ok:
            results.append(await test_nim_check(explain_is_mock))
        else:
            print("\n[5] NIM 확인 — ✗ SKIP (서버 응답 없음)")
            results.append(False)

    passed = sum(results)
    total = len(results)
    print(f"\n{'=' * 56}")
    print(f"  결과: {passed}/{total} 통과")
    print("=" * 56)

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
