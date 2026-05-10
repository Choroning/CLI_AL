import type { Metadata } from "next";
import "./globals.css";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "행정문서 쉬운말 변환기",
  description: "어려운 행정문서·공문·약관을 쉬운 한국어로. 출처 인용·신뢰도 검증 포함.",
};

/**
 * Inline script to apply the saved theme before first paint — avoids the
 * flash-of-wrong-theme on hard reload. Reads localStorage; falls back to
 * `prefers-color-scheme: dark`.
 */
const themeBootstrap = `
(function () {
  try {
    var savedTheme = localStorage.getItem('cli_al_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = savedTheme ? savedTheme === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <DisclaimerModal />

        <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/90 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-content items-center justify-between pl-3 pr-1 sm:px-6">
            <a
              href="/"
              className="flex items-center gap-2 font-sans text-body-sm font-semibold tracking-tight"
            >
              <span
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded-xs bg-primary text-primary-on text-[10px] font-bold"
              >
                쉬
              </span>
              <span>행정문서 쉬운말 변환기</span>
            </a>
            <nav className="flex items-center gap-0 sm:gap-1">
              <a
                href="/convert"
                className="inline-flex items-center min-h-[44px] rounded-md px-2 sm:px-3.5 py-2 text-body-sm text-ink-subtle hover:text-ink hover:bg-surface-1 transition-colors"
              >
                변환
              </a>
              <a
                href="/history"
                className="inline-flex items-center min-h-[44px] rounded-md px-2 sm:px-3.5 py-2 text-body-sm text-ink-subtle hover:text-ink hover:bg-surface-1 transition-colors"
              >
                이력
              </a>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        {/* No max-width / padding here — pages opt in. Landing uses full-bleed
            snap sections; /convert and /history wrap their content in the
            standard centered container. flex-1 anchors the footer to the
            bottom of the viewport on short pages (e.g. /convert before a
            result is rendered). */}
        <main className="flex-1">{children}</main>

        <footer className="border-t border-hairline">
          <div className="mx-auto max-w-content px-6 py-6 text-body-sm text-ink leading-relaxed">
            본 서비스의 결과는 참고용이며 법적 효력이 없습니다. 실제 권리·의무·기한은 반드시
            원문 또는 발급 기관·전문가에 확인하세요.
          </div>
        </footer>
      </body>
    </html>
  );
}
