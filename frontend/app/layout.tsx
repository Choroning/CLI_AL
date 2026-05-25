import type { Metadata } from "next";
import "./globals.css";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { AccessibilityBar } from "@/components/AccessibilityBar";
import { HeaderNav } from "@/components/HeaderNav";

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
              className="group flex items-center gap-2.5 font-sans text-body-sm font-semibold tracking-tight"
            >
              {/* 로고 배지: 사각 primary 배경 + 변환 메타포 글리프
               *   - 위 zig-zag = 어려운 원문(난잡한 흐름)
               *   - 아래 직선 = 쉬운말 결과(정돈된 한 줄)
               *   호버 시 살짝 확대 + zig-zag 페이드해서 변환되는 느낌을 표현. */}
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-xs bg-primary text-primary-on transition-transform duration-300 ease-out group-hover:scale-110"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="overflow-visible"
                >
                  <path
                    d="M5 8 L9 6 L13 8 L17 6 L19 8"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-60 transition-opacity duration-300 group-hover:opacity-25"
                  />
                  <path
                    d="M5 16 L19 16"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="origin-left transition-transform duration-300 group-hover:scale-x-110"
                  />
                </svg>
              </span>
              <span>행정문서 쉬운말 변환기</span>
            </a>
            <HeaderNav />

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
