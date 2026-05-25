"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS: { href: string; label: string }[] = [
  { href: "/convert", label: "변환" },
  { href: "/history", label: "변환 이력" },
];

/**
 * 상단 헤더 우측 네비.
 *
 * 디자인: 행정 신뢰형 톤 유지 — 색·그림자 없이 1px primary 언더라인만 사용.
 *   - 호버: 왼쪽에서 슬라이드 인하는 2px primary 라인
 *   - 현재 페이지: 같은 라인이 100% 보이고 텍스트는 ink 진하게
 *   - 트랜지션은 200ms ease-out — 행정 사이트 톤에 어울리는 절제된 동작
 */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5 sm:gap-1.5">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname?.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative inline-flex items-center min-h-[44px] px-3 sm:px-4 py-2",
              "text-body-sm font-medium transition-colors",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            <span className="relative">
              {l.label}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 right-0 -bottom-1.5 h-[2px] bg-primary origin-left",
                  "transition-transform duration-200 ease-out",
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                )}
              />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
