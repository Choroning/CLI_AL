"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

/**
 * 글로벌 위치(layout.tsx)에서만 사용. 랜딩(`/`) 페이지에서는 푸터를
 * FinalCTA snap-section 내부에 직접 넣어 한 viewport 에 같이 보이게 하므로,
 * 글로벌 푸터는 숨긴다.
 */
export function AppFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <Footer />;
}
