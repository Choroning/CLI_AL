/**
 * Bionic Reading 분할 — 어절(공백 단위)마다 머리 절반을 굵게.
 *
 * `<b class="bx">` 으로 머리 글자를 감싸고, dyslexia-mode 활성화 시
 * globals.css 에서 그 요소만 font-weight 800 + color ink 로 강조한다.
 * 모드가 꺼져 있으면 font-weight/color 가 inherit 이라 시각적으로 영향 없음.
 *
 * 사용:
 *   <Bionic text="긴급한 안내문" />
 *
 * 한 컴포넌트에서 여러 번 호출할 수 있으며, useMemo 로 분할 결과는 캐시됨.
 */

"use client";

import { useMemo } from "react";

export function Bionic({ text }: { text: string }) {
  const parts = useMemo(() => splitBionic(text), [text]);
  // data-bionic-react 마커 — JS walker(dyslexiaBionic) 가 이 컨테이너 안은
  // 이미 React 가 관리하는 Bionic 으로 인식하고 재처리/언래핑하지 않도록 한다.
  return (
    <span data-bionic-react>
      {parts.map((p, i) =>
        p.head ? (
          <span key={i}>
            <b className="bx">{p.head}</b>
            {p.tail}
          </span>
        ) : (
          <span key={i}>{p.tail}</span>
        ),
      )}
    </span>
  );
}

export type BionicPart = { head: string; tail: string };

export function splitBionic(s: string): BionicPart[] {
  const out: BionicPart[] = [];
  const re = /(\s+|[.,;:!?·…—()\[\]"'·]+)|([^\s.,;:!?·…—()\[\]"'·]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) {
      out.push({ head: "", tail: m[1] });
    } else if (m[2]) {
      const w = m[2];
      const isHangul = /[가-힣]/.test(w[0]!);
      // 짧은 어절은 wrap 생략 — 한 글자 한글, 1~2글자 라틴은 강조하면 문장
      // 전체가 강조된 것처럼 보여 가독성 오히려 떨어짐.
      const tooShort = isHangul ? w.length < 2 : w.length < 4;
      if (tooShort) {
        out.push({ head: "", tail: w });
        continue;
      }
      const headLen = isHangul ? 1 : Math.ceil(w.length / 2);
      out.push({ head: w.slice(0, headLen), tail: w.slice(headLen) });
    }
  }
  if (out.length === 0) out.push({ head: "", tail: s });
  return out;
}
