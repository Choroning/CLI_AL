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
    // 가까운 섹션이 viewport 의 50% 이내일 때만 흡착. 너무 멀면 자유 스크롤.
    // 0.35 → 0.5 (2026-05): 흡착 범위 확장 — 거의 절반 영역에서 스냅 발동.
    const THRESHOLD_RATIO = 0.5;

    let snapping = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function pickClosestSection(): HTMLElement | null {
      const targetY = window.scrollY + headerOffsetPx;
      let closest: HTMLElement | null = null;
      let minDist = Infinity;
      for (const s of sections) {
        const dist = Math.abs(s.offsetTop - targetY);
        if (dist < minDist) {
          minDist = dist;
          closest = s;
        }
      }
      const threshold = window.innerHeight * THRESHOLD_RATIO;
      if (minDist > threshold) return null;
      return closest;
    }

    function scheduleSnap() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (snapping) return;
        const target = pickClosestSection();
        if (!target) return;
        const destY = Math.max(0, target.offsetTop - headerOffsetPx);
        if (Math.abs(window.scrollY - destY) < 2) return;
        snapping = true;
        gsap.to(window, {
          scrollTo: { y: destY, autoKill: true },
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            snapping = false;
          },
          onInterrupt: () => {
            snapping = false;
          },
        });
      }, SNAP_DELAY);
    }

    function onWheel() {
      // 휠 입력은 진행 중인 snap 을 autoKill 로 끊고 새 타이머 시작.
      if (timer) clearTimeout(timer);
      scheduleSnap();
    }

    function onTouchEnd() {
      scheduleSnap();
    }

    function onKeyDown(e: KeyboardEvent) {
      // 키보드 페이지 이동 키엔 즉시 다음/이전 섹션 snap.
      const navKeys = [
        "PageDown",
        "PageUp",
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
      ];
      if (!navKeys.includes(e.key)) return;
      // 타이머 기반 자연 흐름에 맡김 (브라우저 기본 동작 → wheel 처럼 작용).
      scheduleSnap();
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      gsap.killTweensOf(window);
    };
  }, [selector, headerOffsetPx, enabled]);
}
