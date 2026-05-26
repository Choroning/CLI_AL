/** 페이지 하단 푸터 — 면책 한 줄만 노출. */
export function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface-1">
      <div className="mx-auto max-w-content px-6 py-6 text-body-sm text-ink-muted leading-relaxed">
        본 서비스의 결과는{" "}
        <strong className="text-ink">법적 효력이 없습니다</strong>. 실제
        권리, 의무, 기한은 반드시 원문 또는 발급 기관이나 전문가에 확인하세요.
      </div>
    </footer>
  );
}
