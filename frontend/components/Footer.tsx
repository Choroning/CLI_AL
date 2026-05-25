/** 페이지 하단 푸터 — 행정 신뢰형 톤 (surface-1 배경 + 1px hairline). */
export function Footer() {
  return (
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
              본 서비스의 결과는 학술 결과물로{" "}
              <strong className="text-ink">법적 효력이 없습니다</strong>. 실제
              권리·의무·기한은 반드시 원문 또는 발급 기관·전문가에 확인하세요.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
