import type { Metadata } from "next";
import "./globals.css";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { AccessibilityBar } from "@/components/AccessibilityBar";

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
    var root = document.documentElement;
    var savedTheme = localStorage.getItem('cli_al_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = savedTheme ? savedTheme === 'dark' : prefersDark;
    if (dark) root.classList.add('dark');
    var size = localStorage.getItem('cli_al_font_size');
    if (size === 'size-l' || size === 'size-xl') root.classList.add(size);
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

        <AccessibilityBar />

        <header className="sticky top-0 z-30 border-b border-hairline-strong bg-canvas">
          <div className="mx-auto flex h-14 max-w-content items-center justify-between pl-3 pr-1 sm:px-6">
            <a
              href="/"
              className="flex items-center gap-2.5 font-sans text-body-sm font-semibold tracking-tight"
            >
              <span
                aria-hidden
                className="grid h-6 w-6 place-items-center rounded-xs bg-primary text-primary-on text-[11px] font-bold"
              >
                쉬
              </span>
              <span>행정문서 쉬운말 변환기</span>
            </a>
            <nav className="flex items-center gap-0 sm:gap-1">
              <a
                href="/convert"
                className="inline-flex items-center min-h-[44px] rounded-sm px-2 sm:px-3.5 py-2 text-body-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors"
              >
                변환
              </a>
              <a
                href="/history"
                className="inline-flex items-center min-h-[44px] rounded-sm px-2 sm:px-3.5 py-2 text-body-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors"
              >
                이력
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-hairline bg-surface-1">
          <div className="mx-auto max-w-content px-6 py-8 text-body-sm text-ink-muted leading-relaxed">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <p className="font-bold text-ink">행정문서 쉬운말 변환기</p>
                <p className="mt-1.5">
                  Team CLI · 박철원 · 강성욱 · 송민성 · 곽준
                </p>
              </div>
              <div>
                <p className="font-bold text-ink">발급 기관</p>
                <p className="mt-1.5">
                  고려대학교 세종캠퍼스 컴퓨터과학과
                  <br />
                  DCSS309-00 알고리즘 (2026 봄학기)
                </p>
              </div>
              <div>
                <p className="font-bold text-ink">면책</p>
                <p className="mt-1.5">
                  본 서비스의 결과는 학술 결과물로 <strong className="text-ink">법적 효력이 없습니다</strong>.
                  실제 권리·의무·기한은 반드시 원문 또는 발급 기관·전문가에 확인하세요.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
