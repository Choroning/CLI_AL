/**
 * 사이트 전역 Bionic Reading 적용 — DOM walker 기반.
 *
 * 콘텐츠 컴포넌트(RewriteText/GlossaryList/...) 는 React-side <Bionic> 으로
 * 이미 어절 머리를 b.bx 로 분할하고 있지만, 그 외의 모든 텍스트(헤더, 푸터,
 * 메뉴, 버튼 라벨, 페이지 본문 등) 까지 동일 효과를 주기 위해 이 walker 가
 * dyslexia 토글 시 document.body 전체를 훑어 텍스트 노드를 b.bx 로 wrap.
 *
 * 충돌 방지:
 *   - SCRIPT/STYLE/CODE/PRE/TEXTAREA/INPUT/SELECT/OPTION 은 skip
 *   - data-bionic-react 컨테이너 안은 React 가 관리하므로 skip
 *   - 이미 b.bx 안에 있는 텍스트도 skip
 *   - walker 자체의 변경은 mutating flag 로 MutationObserver 가 재진입하지 않게
 *
 * Unwrap:
 *   - walker 가 만든 b 에만 dataset.bionicWalker 마커. 해제 시 그 마커가 있는
 *     b 만 풀어 text node 로 복원. React-Bionic 의 b.bx 는 건드리지 않음.
 *   - 복원 후 인접 텍스트 노드를 normalize 로 병합 — 안 하면 "안"+"녕..." 처럼
 *     쪼개진 채 남아, 다시 켤 때 walker 가 조각을 별개 어절로 보고 머리글자가
 *     밀린다(매 토글마다 강조 위치가 달라지는 버그).
 */

import { splitBionic } from "./Bionic";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
]);

let observer: MutationObserver | null = null;
let mutating = false;

function shouldSkip(node: Node): boolean {
  let p = node.parentElement;
  while (p) {
    if (SKIP_TAGS.has(p.tagName)) return true;
    if (p.classList && p.classList.contains("bx")) return true;
    if ((p as HTMLElement).dataset && (p as HTMLElement).dataset.bionicReact !== undefined) {
      return true;
    }
    p = p.parentElement;
  }
  return false;
}

function processTextNode(node: Text) {
  if (!node.parentNode) return;
  if (shouldSkip(node)) return;
  const text = node.nodeValue;
  if (!text || !/\S/.test(text)) return;

  const parts = splitBionic(text);
  // 분할 결과 head 가 모두 비어 있으면(공백·문장부호만) wrap 불필요.
  if (!parts.some((p) => p.head)) return;

  const fragment = document.createDocumentFragment();
  for (const p of parts) {
    if (p.head) {
      const b = document.createElement("b");
      b.className = "bx";
      b.dataset.bionicWalker = "1";
      b.textContent = p.head;
      fragment.appendChild(b);
    }
    if (p.tail) {
      fragment.appendChild(document.createTextNode(p.tail));
    }
  }
  node.parentNode.replaceChild(fragment, node);
}

function walk(root: Node) {
  // SHOW_TEXT walker — 모든 후보 text node 를 수집한 뒤 한 번에 변환.
  // walker 중 DOM 변경하면 traversal 가 깨지므로 수집/처리 분리.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) targets.push(n as Text);
  for (const t of targets) processTextNode(t);
}

function unwrapWalkerNodes(root: ParentNode) {
  const list = root.querySelectorAll<HTMLElement>("b.bx[data-bionic-walker]");
  const parents = new Set<Node>();
  list.forEach((b) => {
    const parent = b.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(b.textContent || ""), b);
    parents.add(parent);
  });
  // 쪼개진 인접 텍스트 노드를 다시 하나로 병합 → 재활성화 시 walker 가 온전한
  // 어절을 보고 항상 같은 머리글자를 강조(결정적). normalize 없으면 토글할수록
  // 강조 위치가 "안→녕→하…" 로 밀린다.
  parents.forEach((p) => p.normalize());
}

export function enableDyslexiaBionic() {
  if (typeof document === "undefined") return;
  if (observer) return;
  mutating = true;
  walk(document.body);
  mutating = false;

  observer = new MutationObserver((muts) => {
    if (mutating) return;
    mutating = true;
    try {
      for (const m of muts) {
        if (m.type === "childList") {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              processTextNode(node as Text);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              walk(node);
            }
          });
        } else if (m.type === "characterData") {
          const tgt = m.target;
          if (tgt.nodeType === Node.TEXT_NODE) {
            processTextNode(tgt as Text);
          }
        }
      }
    } finally {
      mutating = false;
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function disableDyslexiaBionic() {
  if (typeof document === "undefined") return;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  mutating = true;
  try {
    unwrapWalkerNodes(document.body);
  } finally {
    mutating = false;
  }
}
