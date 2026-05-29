"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

/**
 * 풀-뷰포트 스냅 스크롤 — native CSS scroll-snap 대체.
 *
 * native scroll-snap mandatory/proximity 의 문제(휠 끊김, 방향 전환 시 멈춤,
 * 흡착 zone 안에서 작은 휠 입력 무시) 를 회피하기 위한 JS 기반 구현.
 *
 * 동작:
 *   - 휠 굴리는 동안엔 native 자유 스크롤 (방향 전환·취소 즉시 반응)
 *   - 휠 종료 SNAP_DELAY 후 현재 위치 검사
 *   - 가장 가까운 섹션이 THRESHOLD 이내면 그 섹션 top 으로 부드럽게 이동
 *   - 이동 진행 중 사용자가 다시 휠 굴리면 autoKill 로 즉시 취소
 *
 * 사용:
 *   useScrollSnap();                       // .snap-section 기본 selector
 *   useScrollSnap(".snap-section", 56);    // 헤더 offset 지정 (기본 3.5rem ≈ 56px)
 */
export function useScrollSnap(
  selector = ".snap-section",
  headerOffsetPx = 56,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    );
    if (sections.length === 0) return;

    // 모션 감소 사용자에게는 snap 비활성 — 어지러움 방지.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const SNAP_DELAY = 150;
    // 흡착 범위 — 후보 섹션 거리가 viewport 의 이 비율 이내여야 snap 발동.
    // 0.35 → 0.5 → 0.7 → 1.0: 뷰포트 한 화면(100%) 거리 안의 진행 방향 섹션은
    // 항상 후보가 되어, 사실상 휠을 멈추면 늘 가장 가까운 섹션으로 흡착된다.
    const THRESHOLD_RATIO = 1.0;
    // 휠 deltaY 임계 — 노이즈 무시. 이보다 큰 입력만 방향으로 인정.
    const DIRECTION_DELTA_MIN = 2;

    let snapping = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // 1 = 아래, -1 = 위, 0 = 없음. 휠 종료 후 어느 쪽 섹션을 우선할지 결정.
    let lastDirection = 0;

    // 헤더 높이를 런타임에 실측 — html font-size(18/19/21px)·size 토글에 따라
    // sticky 헤더의 px 높이가 달라지므로, 하드코딩(56) 대신 매번 측정해 오차 제거.
    function headerOffset(): number {
      const h = document.querySelector("header");
      return h ? h.getBoundingClientRect().height : headerOffsetPx;
    }

    function pickTargetSection(): HTMLElement | null {
      const targetY = window.scrollY + headerOffset();
      const threshold = window.innerHeight * THRESHOLD_RATIO;

      // 임계 거리 안에 들어오는 모든 섹션을 부호 거리(signed)와 함께 수집.
      // signed > 0: 섹션이 현재 위치보다 아래 / < 0: 위.
      const candidates = sections
        .map((s) => ({ s, signed: s.offsetTop - targetY }))
        .filter((c) => Math.abs(c.signed) <= threshold);
      if (candidates.length === 0) return null;

      // 방향 일치 후보 우선 — 살짝만 굴려도 진행 방향 섹션이 채택됨.
      // 방향 의도가 있는데 그 방향 후보가 없으면(=이미 그 방향 끝 섹션에
      // 진입함) snap 자체를 생략. 그렇지 않으면 이미 도달한 섹션 top 으로
      // 다시 잡아당겨 사용자가 그 섹션 안 down 스크롤로 아래 콘텐츠를
      // 보지 못함.
      if (lastDirection > 0) {
        const downs = candidates.filter((c) => c.signed > 0);
        if (downs.length === 0) return null;
        downs.sort((a, b) => a.signed - b.signed);
        return downs[0].s;
      }
      if (lastDirection < 0) {
        const ups = candidates.filter((c) => c.signed < 0);
        if (ups.length === 0) return null;
        ups.sort((a, b) => b.signed - a.signed);
        return ups[0].s;
      }

      // 방향 의도 자체가 없을 때만 절대 거리 기준 최근접 (예: 키보드 입력
      // 후 lastDirection 리셋 직후, 초기 진입 등).
      candidates.sort((a, b) => Math.abs(a.signed) - Math.abs(b.signed));
      return candidates[0].s;
    }

    function scheduleSnap() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (snapping) return;
        const target = pickTargetSection();
        if (!target) return;
        const destY = Math.max(0, target.offsetTop - headerOffset());
        if (Math.abs(window.scrollY - destY) < 2) return;
        snapping = true;
        gsap.to(window, {
          scrollTo: { y: destY, autoKill: true },
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            snapping = false;
            lastDirection = 0; // 완료 후 방향 리셋
          },
          onInterrupt: () => {
            snapping = false;
          },
        });
      }, SNAP_DELAY);
    }

    // 휠 지점이 내부 스크롤 영역(재작성/출처인용 등 overflow-y-auto)이고 아직 그
    // 방향으로 스크롤 여지가 있으면, 페이지 스냅을 잡지 않고 그 영역이 스크롤되게
    // 둔다. 영역 끝(위/아래)에 닿은 뒤에야 다음 섹션으로 스냅이 넘어간다.
    function scrollableConsumes(target: EventTarget | null, deltaY: number): boolean {
      let el = target instanceof Element ? (target as HTMLElement) : null;
      while (el && el !== document.body) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          if (deltaY < 0 && el.scrollTop > 1) return true;
        }
        el = el.parentElement;
      }
      return false;
    }

    function onWheel(e: WheelEvent) {
      // 휠 입력은 진행 중인 snap 을 autoKill 로 끊고 새 타이머 시작.
      if (timer) clearTimeout(timer);
      // 내부 스크롤 영역이 더 스크롤될 수 있으면 페이지 스냅 보류(섹션 튐 방지).
      if (scrollableConsumes(e.target, e.deltaY)) return;
      if (Math.abs(e.deltaY) >= DIRECTION_DELTA_MIN) {
        lastDirection = e.deltaY > 0 ? 1 : -1;
      }
      scheduleSnap();
    }

    function onTouchEnd() {
      scheduleSnap();
    }

    function onKeyDown(e: KeyboardEvent) {
      // 키보드 페이지 이동 — 방향까지 같이 추적해 살짝만 눌러도 다음 섹션으로.
      const downs = ["PageDown", "ArrowDown", "End", " "];
      const ups = ["PageUp", "ArrowUp", "Home"];
      if (downs.includes(e.key)) lastDirection = 1;
      else if (ups.includes(e.key)) lastDirection = -1;
      else return;
      // 브라우저 native scroll 후 타이머가 가장 가까운 방향 섹션을 잡음.
      scheduleSnap();
    }

    function onResize() {
      // 리사이즈로 dvh 기반 섹션 높이가 reflow 되면 기존 스냅 정렬이 어긋난다.
      // 방향 없이(가장 가까운 섹션) 다시 흡착 — 휠처럼 디바운스되어 리사이즈가
      // 끝난 뒤 한 번만 발동한다.
      lastDirection = 0;
      scheduleSnap();
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf(window);
    };
  }, [selector, headerOffsetPx, enabled]);
}
