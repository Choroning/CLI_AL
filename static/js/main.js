const textarea   = document.getElementById('document-input');
const charCount  = document.getElementById('char-count');
const analyzeBtn = document.getElementById('analyze-btn');
const clearBtn   = document.getElementById('clear-btn');
const fileInput  = document.getElementById('file-input');
const resultArea = document.getElementById('result-area');
const loading    = document.getElementById('loading');
const tooltip    = document.getElementById('tooltip-overlay');

let lastResult      = null;
let chatHistory     = [];
let currentDocument = '';

const MAX_CHARS = 10000;

// ── 글자수 카운터 ──────────────────────────────
textarea.addEventListener('input', () => {
  const len = textarea.value.length;
  charCount.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}자`;
  charCount.className = 'char-count' + (len > MAX_CHARS ? ' error' : len > 8000 ? ' warning' : '');
  analyzeBtn.disabled = len === 0 || len > MAX_CHARS;
});

// ── 초기화 버튼 ────────────────────────────────
clearBtn.addEventListener('click', () => {
  textarea.value = '';
  textarea.dispatchEvent(new Event('input'));
  resultArea.innerHTML = emptyState();
  lastResult = null;
  currentDocument = '';
  chatHistory = [];
  document.getElementById('result-header-actions').style.display = 'none';
  document.getElementById('chat-panel').style.display = 'none';
});

// ── 파일 업로드 ────────────────────────────────
document.getElementById('upload-btn').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  showLoading('파일 읽는 중...');
  try {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    textarea.value = data.text;
    textarea.dispatchEvent(new Event('input'));
    showToast('파일을 불러왔습니다.');
  } catch {
    showToast('파일 업로드 중 오류가 발생했습니다.', true);
  } finally {
    hideLoading();
    fileInput.value = '';
  }
});

// ── 분석 요청 (스트리밍) ───────────────────────
analyzeBtn.addEventListener('click', async () => {
  const docText = textarea.value.trim();
  if (!docText) return;

  analyzeBtn.disabled = true;
  currentDocument = docText;

  // 스트리밍 미리보기 초기화
  resultArea.innerHTML = `
    <div id="stream-preview" class="result-section">
      <div class="section-title">📝 쉬운말로 바꾸는 중...</div>
      <div class="simplified-text" id="stream-text"><span class="stream-cursor"></span></div>
    </div>`;
  document.getElementById('chat-panel').style.display = 'none';
  document.getElementById('result-header-actions').style.display = 'none';

  let accumulated = '';
  let pendingMeta = {};

  try {
    const res = await fetch('/analyze/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: docText }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break outer;

        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }

        if (parsed.error) {
          showToast(parsed.error, true);
          resultArea.innerHTML = errorState(parsed.error);
          return;
        }
        if (parsed.meta) {
          pendingMeta = parsed.meta;
          continue;
        }
        if (parsed.t) {
          accumulated += parsed.t;
          updateStreamPreview(accumulated);
        }
      }
    }

    // 스트리밍 완료 → JSON 파싱 후 전체 렌더링
    const result = parseStreamResult(accumulated, pendingMeta);
    if (result.error) {
      showToast('응답 파싱에 실패했습니다.', true);
      resultArea.innerHTML = errorState('응답 파싱에 실패했습니다.');
    } else {
      renderResult(result);
    }

  } catch (e) {
    showToast('서버 연결에 실패했습니다.', true);
    resultArea.innerHTML = errorState('서버 연결에 실패했습니다.');
  } finally {
    analyzeBtn.disabled = false;
  }
});

function updateStreamPreview(text) {
  const el = document.getElementById('stream-text');
  if (!el) return;
  // JSON에서 simplified 값 진행 중 추출
  const m = text.match(/"simplified"\s*:\s*"((?:[^"\\]|\\.)*)/) ;
  const display = m
    ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    : text.replace(/[{}"]/g, '').slice(-300); // fallback: 마지막 300자
  el.innerHTML = escHtml(display) + '<span class="stream-cursor"></span>';
}

function parseStreamResult(text, meta) {
  text = text.replace(/```(?:json)?\s*/g, '').trim();
  const m = text.match(/\{.*\}/s);
  if (!m) return { error: true };
  try {
    const obj = JSON.parse(m[0]);
    obj.rag_used = meta.rag_used || false;
    obj.rag_laws = meta.rag_laws || [];
    return obj;
  } catch {
    return { error: true };
  }
}

// ── 결과 렌더링 ────────────────────────────────
function renderResult(data) {
  lastResult = data;
  document.getElementById('result-header-actions').style.display = 'flex';
  // 챗 패널 초기화 후 표시
  chatHistory = [];
  document.getElementById('chat-messages').innerHTML = `<div class="chat-hint">
    이 문서에 대해 궁금한 점을 물어보세요.<br>
    예: <em>"계약 해지하려면 어떻게 해야 하나요?"</em> &nbsp;·&nbsp; <em>"보증금은 언제 돌려받나요?"</em>
  </div>`;
  document.getElementById('chat-panel').style.display = 'block';

  const simplified    = data.simplified    || '';
  const keyPoints     = data.key_points    || [];
  const actionItems   = data.action_items  || [];
  const difficultWords = data.difficult_words || [];

  resultArea.innerHTML = `
    <div class="doc-meta">
      ${data.doc_type ? `<span class="doc-type-badge ${docTypeClass(data.doc_type)}">${docTypeIcon(data.doc_type)} ${escHtml(data.doc_type)}</span>` : ''}
      ${data.rag_used ? `
      <div class="rag-badge">
        ⚖️ 법제처 법령 참고
        <span class="rag-law-names">${(data.rag_laws || []).map(n => `<span class="rag-law-tag">${escHtml(n)}</span>`).join('')}</span>
      </div>` : ''}
    </div>

    ${simplified ? `
    <div class="result-section">
      <div class="section-title">📝 쉬운말로 바꾼 내용</div>
      <div class="simplified-text">${escHtml(simplified)}</div>
    </div>` : ''}

    ${keyPoints.length ? `
    <div class="result-section">
      <div class="section-title">⭐ 핵심 의무 · 권리 · 기한</div>
      <ul class="key-points-list">
        ${keyPoints.map(p => `<li>${escHtml(p)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${actionItems.length ? `
    <div class="result-section">
      <div class="section-title">✅ 해야 할 일 체크리스트</div>
      <ul class="checklist" id="checklist">
        ${actionItems.map((item, i) => `
        <li id="item-${i}" onclick="toggleCheck(${i})">
          <input type="checkbox" id="chk-${i}" onclick="event.stopPropagation(); toggleCheck(${i})">
          <span>${escHtml(item)}</span>
        </li>`).join('')}
      </ul>
    </div>` : ''}

    ${difficultWords.length ? `
    <div class="result-section">
      <div class="section-title">🔍 어려운 단어 (클릭하면 풀이)</div>
      <div class="word-tags">
        ${difficultWords.map(w => `
        <span class="word-tag"
              data-word="${escAttr(w.word)}"
              data-explanation="${escAttr(w.explanation)}"
              onclick="showWordTooltip(this)">
          ${escHtml(w.word)}
        </span>`).join('')}
      </div>
    </div>` : ''}
  `;
}

// ── 체크리스트 토글 ────────────────────────────
function toggleCheck(i) {
  const li  = document.getElementById(`item-${i}`);
  const chk = document.getElementById(`chk-${i}`);
  const done = !li.classList.contains('done');
  li.classList.toggle('done', done);
  chk.checked = done;
}

// ── 단어 툴팁 ──────────────────────────────────
async function showWordTooltip(el) {
  const word        = el.dataset.word;
  const explanation = el.dataset.explanation;

  // 이미 설명이 있으면 바로 표시
  if (explanation) {
    renderTooltip({ word, explanation, example: '' });
    return;
  }

  // LLM에 추가 설명 요청
  const context = textarea.value.slice(0, 500);
  showLoading('단어 풀이 가져오는 중...');
  try {
    const res = await fetch('/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, context }),
    });
    const data = await res.json();
    renderTooltip(data.error ? { word, explanation: '풀이를 가져오지 못했습니다.', example: '' } : data);
  } catch {
    renderTooltip({ word, explanation: '서버 연결에 실패했습니다.', example: '' });
  } finally {
    hideLoading();
  }
}

function renderTooltip(data) {
  document.getElementById('tooltip-word').textContent        = data.word || '';
  document.getElementById('tooltip-explanation').textContent = data.explanation || '';
  const exampleEl = document.getElementById('tooltip-example');
  if (data.example) {
    exampleEl.textContent = data.example;
    exampleEl.style.display = 'block';
  } else {
    exampleEl.style.display = 'none';
  }
  tooltip.classList.add('show');
}

document.getElementById('tooltip-close').addEventListener('click', closeTooltip);
tooltip.addEventListener('click', e => { if (e.target === tooltip) closeTooltip(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTooltip(); });

function closeTooltip() {
  tooltip.classList.remove('show');
}

// ── 로딩 ──────────────────────────────────────
function showLoading(msg = 'AI가 처리하고 있습니다...') {
  document.getElementById('loading-text').textContent = msg;
  loading.classList.add('show');
}

function hideLoading() {
  loading.classList.remove('show');
}

// ── 토스트 알림 ────────────────────────────────
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── 상태 템플릿 ────────────────────────────────
function emptyState() {
  return `<div class="result-empty">
    <div class="empty-icon">📄</div>
    <p>왼쪽에 문서를 입력하고<br><strong>변환하기</strong>를 눌러주세요</p>
  </div>`;
}

function errorState(msg) {
  return `<div class="result-empty">
    <div class="empty-icon">⚠️</div>
    <p>${escHtml(msg)}</p>
  </div>`;
}

// ── Q&A 챗 ────────────────────────────────────────
const chatInput   = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

chatSendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendChat(); });

async function sendChat() {
  const question = chatInput.value.trim();
  if (!question || !currentDocument) return;

  chatInput.value = '';
  chatSendBtn.disabled = true;

  appendBubble('user', question);
  chatHistory.push({ role: 'user', content: question });

  const typingEl = appendTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: currentDocument,
        history: chatHistory.slice(0, -1),
        question,
      }),
    });
    const data = await res.json();
    typingEl.remove();

    const answer = data.error ? '죄송합니다. 답변을 가져오지 못했습니다.' : data.answer;
    appendBubble('assistant', answer);
    if (!data.error) chatHistory.push({ role: 'assistant', content: answer });
  } catch {
    typingEl.remove();
    appendBubble('assistant', '서버 연결에 실패했습니다.');
  } finally {
    chatSendBtn.disabled = false;
    chatInput.focus();
  }
}

function appendBubble(role, text) {
  const msgs = document.getElementById('chat-messages');
  // 처음 메시지 오면 hint 제거
  const hint = msgs.querySelector('.chat-hint');
  if (hint) hint.remove();

  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function appendTyping() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-bubble assistant typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chat-messages').innerHTML = `<div class="chat-hint">
    이 문서에 대해 궁금한 점을 물어보세요.<br>
    예: <em>"계약 해지하려면 어떻게 해야 하나요?"</em>
  </div>`;
}

// ── 문서 유형 아이콘 / 색상 ───────────────────────
function docTypeIcon(type) {
  const icons = {
    '임대차계약서': '🏠', '근로계약서': '💼', '기타계약서': '📝',
    '공문서': '🏛️', '의료안내문': '🏥', '약관': '📋',
    '법령·규정': '⚖️', '기타': '📄',
  };
  return icons[type] || '📄';
}

function docTypeClass(type) {
  const classes = {
    '임대차계약서': 'type-lease', '근로계약서': 'type-work', '기타계약서': 'type-contract',
    '공문서': 'type-official', '의료안내문': 'type-medical', '약관': 'type-terms',
    '법령·규정': 'type-law', '기타': 'type-other',
  };
  return classes[type] || 'type-other';
}

// ── 복사 / 저장 ────────────────────────────────
function buildResultText() {
  if (!lastResult) return '';
  const lines = [];

  if (lastResult.simplified) {
    lines.push('=== 쉬운말로 바꾼 내용 ===');
    lines.push(lastResult.simplified);
    lines.push('');
  }
  if (lastResult.key_points?.length) {
    lines.push('=== 핵심 의무 · 권리 · 기한 ===');
    lastResult.key_points.forEach(p => lines.push(`• ${p}`));
    lines.push('');
  }
  if (lastResult.action_items?.length) {
    lines.push('=== 해야 할 일 체크리스트 ===');
    lastResult.action_items.forEach(item => lines.push(`☐ ${item}`));
    lines.push('');
  }
  if (lastResult.difficult_words?.length) {
    lines.push('=== 어려운 단어 풀이 ===');
    lastResult.difficult_words.forEach(w => lines.push(`[${w.word}] ${w.explanation}`));
  }
  return lines.join('\n');
}

async function copyResult() {
  const text = buildResultText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('클립보드에 복사됐습니다.');
  } catch {
    showToast('복사에 실패했습니다. 브라우저 권한을 확인해주세요.', true);
  }
}

function saveResult() {
  const text = buildResultText();
  if (!text) return;
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = '쉬운말_변환결과.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('파일로 저장됐습니다.');
}

// ── 유틸 ──────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
