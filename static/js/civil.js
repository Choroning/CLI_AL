// ── 유틸 ──────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading(msg = 'AI가 처리하고 있습니다...') {
  document.getElementById('loading-text').textContent = msg;
  document.getElementById('loading').classList.add('show');
}
function hideLoading() { document.getElementById('loading').classList.remove('show'); }

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setFontSize(size) {
  document.documentElement.classList.remove('font-sm', 'font-md', 'font-lg');
  document.documentElement.classList.add('font-' + size);
  localStorage.setItem('fontSize', size);
  document.querySelectorAll('.font-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${size}'`));
  });
}

// ── 예시 힌트 ──────────────────────────────────
const CIVIL_HINTS = {
  '신고': '집 앞 골목에 매일 불법 주정차 차량이 있어서 소방차·구급차 진입이 어렵습니다. 여러 번 자진 이동을 요청했지만 개선이 없어 신고합니다.',
  '건의': '우리 동네 어린이공원 화장실이 10년 이상 방치되어 노후화가 심각합니다. 리모델링 또는 이동식 화장실 설치를 건의드립니다.',
  '불만·고충': '○○역 엘리베이터가 3주째 고장 상태인데 수리가 안 되고 있습니다. 어르신과 유아차 보호자들이 큰 불편을 겪고 있어 빠른 조치를 요청합니다.',
  '정보공개청구': '구청에서 지난해 발주한 ○○로 도로 재포장 공사의 업체 선정 과정, 계약 금액, 감리 결과 및 최종 검사 보고서를 공개 요청합니다.',
};

function applyCivilHint() {
  const hint = CIVIL_HINTS[currentCivilType];
  if (!hint) { showToast('선택된 유형의 예시가 없습니다.', true); return; }
  civilInput.value = hint;
  civilInput.dispatchEvent(new Event('input'));
  showToast('예시를 불러왔습니다.');
}

// ── 민원 유형 선택 ─────────────────────────────
let currentCivilType = '신고';

function setCivilType(type) {
  currentCivilType = type;
  document.querySelectorAll('.civil-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

// ── 글자수 카운터 ──────────────────────────────
const civilInput = document.getElementById('civil-input');
const civilCount = document.getElementById('civil-char-count');

civilInput.addEventListener('input', () => {
  const len = civilInput.value.length;
  civilCount.textContent = `${len.toLocaleString()} / 1,000자`;
  civilCount.className = 'char-count' + (len > 1000 ? ' error' : len > 800 ? ' warning' : '');
});

civilInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') document.getElementById('civil-btn').click();
});

// ── 민원 작성 ──────────────────────────────────
let lastCivilResult = null;

document.getElementById('civil-btn').addEventListener('click', async () => {
  const situation = civilInput.value.trim();
  if (!situation) {
    showToast('상황을 입력해주세요.', true);
    return;
  }

  const btn = document.getElementById('civil-btn');
  btn.disabled = true;
  showLoading('민원 문서를 작성하고 있습니다...');

  try {
    const res  = await fetch('/civil/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ civil_type: currentCivilType, situation }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    lastCivilResult = data;
    renderCivil(data);
  } catch {
    showToast('서버 연결에 실패했습니다.', true);
  } finally {
    btn.disabled = false;
    hideLoading();
  }
});

function renderCivil(data) {
  const el = document.getElementById('civil-result');
  const actions = document.getElementById('civil-result-actions');
  if (actions) actions.style.display = 'flex';

  el.innerHTML = `
    <div class="civil-doc">

      <div class="civil-meta-row">
        <div class="civil-meta-item">
          <span class="civil-meta-label">수신</span>
          <span class="civil-meta-value">${escHtml(data.recipient || '')}</span>
        </div>
        <div class="civil-meta-item">
          <span class="civil-meta-label">담당 부서</span>
          <span class="civil-meta-value">${escHtml(data.department || '')}</span>
        </div>
      </div>

      <div class="civil-title-row">
        <span class="civil-title-label">제목</span>
        <span class="civil-title-text">${escHtml(data.title || '')}</span>
      </div>

      <div class="civil-section">
        <div class="civil-section-label">민원 내용</div>
        <div class="civil-body-text">${escHtml(data.body || '').replace(/\n/g, '<br>')}</div>
      </div>

      ${data.attachments && data.attachments.length ? `
      <div class="civil-section">
        <div class="civil-section-label">첨부 서류</div>
        <ul class="civil-attachments">
          ${data.attachments.map((a, i) => `<li>${i + 1}. ${escHtml(a)}</li>`).join('')}
        </ul>
      </div>` : ''}

      <div class="civil-section">
        <div class="civil-section-label">📮 제출 방법</div>
        <div class="civil-submit-method">${escHtml(data.submission_method || '').replace(/\n/g, '<br>')}</div>
      </div>

      ${data.tips ? `
      <div class="welfare-tips" style="margin-top:16px;">
        <div class="tips-title">💡 참고 사항</div>
        <p>${escHtml(data.tips)}</p>
      </div>` : ''}
    </div>
  `;
}

// ── 복사 / 저장 ────────────────────────────────
function buildCivilText() {
  if (!lastCivilResult) return '';
  const d = lastCivilResult;
  const lines = [
    `[민원 유형] ${currentCivilType}`,
    `[수신] ${d.recipient || ''}`,
    `[담당 부서] ${d.department || ''}`,
    `[제목] ${d.title || ''}`,
    '',
    '=== 민원 내용 ===',
    d.body || '',
    '',
  ];
  if (d.attachments && d.attachments.length) {
    lines.push('=== 첨부 서류 ===');
    d.attachments.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push('');
  }
  lines.push('=== 제출 방법 ===', d.submission_method || '');
  if (d.tips) { lines.push('', '=== 참고 사항 ===', d.tips); }
  return lines.join('\n');
}

async function copyCivil() {
  const text = buildCivilText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('클립보드에 복사됐습니다.');
  } catch {
    showToast('복사에 실패했습니다.', true);
  }
}

function saveCivil() {
  const text = buildCivilText();
  if (!text) return;
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = '민원_작성결과.txt'; a.click();
  URL.revokeObjectURL(url);
  showToast('파일로 저장됐습니다.');
}

function printCivil() { window.print(); }

// ── TTS ────────────────────────────────────────
let _ttsOn = false;

function toggleTTS() {
  const btn = document.getElementById('civil-tts-btn');
  if (!lastCivilResult) return;
  if (_ttsOn || speechSynthesis.speaking) {
    speechSynthesis.cancel();
    _ttsOn = false;
    if (btn) btn.textContent = '🔊 읽기';
    return;
  }
  const d = lastCivilResult;
  const text = `${d.title || ''}. ${d.body || ''}`;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.9;
  utt.onend = utt.onerror = () => { _ttsOn = false; if (btn) btn.textContent = '🔊 읽기'; };
  speechSynthesis.speak(utt);
  _ttsOn = true;
  if (btn) btn.textContent = '⏹ 중지';
}
