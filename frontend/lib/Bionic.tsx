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
  return (
    <>
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
    </>
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
      const headLen = isHangul ? Math.min(1, w.length) : Math.ceil(w.length / 2);
      out.push({ head: w.slice(0, headLen), tail: w.slice(headLen) });
    }
  }
  if (out.length === 0) out.push({ head: "", tail: s });
  return out;
}
