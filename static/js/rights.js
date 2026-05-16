// ── 유틸 ──────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showLoading(msg='AI가 처리하고 있습니다...') {
  document.getElementById('loading-text').textContent = msg;
  document.getElementById('loading').classList.add('show');
}
function hideLoading() { document.getElementById('loading').classList.remove('show'); }
function showToast(msg, isError=false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast'+(isError?' error':'');
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 3000);
}
function setFontSize(size) {
  document.documentElement.classList.remove('font-sm','font-md','font-lg');
  document.documentElement.classList.add('font-'+size);
  localStorage.setItem('fontSize', size);
  document.querySelectorAll('.font-btn').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${size}'`));
  });
}

// ── 빠른 힌트 ─────────────────────────────────
const HINTS = {
  '임차인':    '집주인이 계약이 끝났는데 보증금을 돌려주지 않습니다. 어떻게 해야 하나요?',
  '근로자':    '직장에서 갑자기 해고 통보를 받았습니다. 퇴직금도 안 준다고 합니다.',
  '소비자':    '인터넷 쇼핑몰에서 구매한 물건이 설명과 달라 환불을 요청했는데 거부당했습니다.',
  '노인·장애인': '장애인 활동 지원 서비스를 신청했는데 거절당했습니다. 이의신청을 하고 싶습니다.',
  '학생·청소년': '아르바이트를 하고 있는데 최저임금보다 적게 주고 있습니다.',
};

function applyHint(key) {
  const input = document.getElementById('rights-input');
  input.value = HINTS[key] || '';
  input.dispatchEvent(new Event('input'));
}

// ── 글자수 ─────────────────────────────────────
const rightsInput = document.getElementById('rights-input');
const rightsCount = document.getElementById('rights-char-count');
rightsInput.addEventListener('input', () => {
  const len = rightsInput.value.length;
  rightsCount.textContent = `${len.toLocaleString()} / 1,000자`;
  rightsCount.className = 'char-count' + (len > 1000 ? ' error' : len > 800 ? ' warning' : '');
});

// ── 권리 상담 요청 ─────────────────────────────
let lastRightsResult = null;

document.getElementById('rights-btn').addEventListener('click', async () => {
  const situation = rightsInput.value.trim();
  if (!situation) { showToast('상황을 입력해주세요.', true); return; }

  const btn = document.getElementById('rights-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-dots"><span></span><span></span><span></span></span>분석 중...';
  showLoading('AI가 권리를 분석하고 있습니다...');
  document.getElementById('rights-result-actions').style.display = 'none';

  try {
    const res  = await fetch('/rights/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ situation }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    lastRightsResult = data;
    renderRights(data);
    document.getElementById('rights-result-actions').style.display = 'flex';
  } catch { showToast('오류가 발생했습니다. 다시 시도해주세요.', true); }
  finally {
    hideLoading();
    btn.disabled = false;
    btn.textContent = '내 권리 알아보기';
  }
});

function renderRights(d) {
  const result = document.getElementById('rights-result');

  const rightsHtml = (d.rights || []).map(r => `
    <div class="rights-card">
      <div class="rights-card-name">${escHtml(r.right)}</div>
      <div class="rights-card-law">📜 ${escHtml(r.law)}</div>
      <div class="rights-card-desc">${escHtml(r.explanation)}</div>
    </div>`).join('');

  const actionsHtml = (d.actions || []).map(a => `
    <div class="proc-step">
      <div class="proc-step-num">${a.step}</div>
      <div class="proc-step-body">
        <div class="proc-step-title">${escHtml(a.action)}</div>
        ${a.detail ? `<div class="proc-step-desc">${escHtml(a.detail)}</div>` : ''}
      </div>
    </div>`).join('');

  const contactsHtml = (d.help_contacts || []).map(c => `
    <div class="contact-card">
      <div class="contact-name">${escHtml(c.name)}</div>
      <div class="contact-phone">${escHtml(c.phone)}</div>
      <div class="contact-desc">${escHtml(c.description)}</div>
    </div>`).join('');

  result.innerHTML = `
    ${d.situation_summary ? `
    <div class="result-section">
      <div class="section-title">📋 상황 요약</div>
      <p class="civil-tips-text">${escHtml(d.situation_summary)}</p>
    </div>` : ''}

    ${rightsHtml ? `
    <div class="result-section">
      <div class="section-title" style="color:#1d4ed8;">⚖️ 나의 권리</div>
      <div class="rights-cards">${rightsHtml}</div>
    </div>` : ''}

    ${actionsHtml ? `
    <div class="result-section">
      <div class="section-title">✅ 지금 해야 할 일</div>
      <div class="proc-steps">${actionsHtml}</div>
    </div>` : ''}

    ${contactsHtml ? `
    <div class="result-section">
      <div class="section-title">📞 도움받을 곳</div>
      <div class="contacts-grid">${contactsHtml}</div>
    </div>` : ''}

    ${d.caution ? `
    <div class="result-section">
      <div class="section-title">⚠️ 주의사항</div>
      <p class="civil-tips-text">${escHtml(d.caution)}</p>
    </div>` : ''}`;
}

// ── Ctrl+Enter 단축키 ──────────────────────────
rightsInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') document.getElementById('rights-btn').click();
});

// ── TTS ────────────────────────────────────────
let _ttsOn = false;

function toggleTTS() {
  const btn = document.getElementById('rights-tts-btn');
  if (!lastRightsResult) return;
  if (_ttsOn || speechSynthesis.speaking) {
    speechSynthesis.cancel();
    _ttsOn = false;
    if (btn) btn.textContent = '🔊 읽기';
    return;
  }
  const d = lastRightsResult;
  let text = d.situation_summary ? d.situation_summary + '. ' : '';
  (d.rights || []).forEach(r => { text += `${r.right}. ${r.explanation}. `; });
  (d.actions || []).forEach(a => { text += `${a.step}. ${a.action}. ${a.detail || ''}. `; });
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.9;
  utt.onend = utt.onerror = () => { _ttsOn = false; if (btn) btn.textContent = '🔊 읽기'; };
  speechSynthesis.speak(utt);
  _ttsOn = true;
  if (btn) btn.textContent = '⏹ 중지';
}

// ── 복사 / 저장 ────────────────────────────────
function buildRightsText() {
  if (!lastRightsResult) return '';
  const d = lastRightsResult;
  let text = `[권리 상담 결과]\n\n${d.situation_summary || ''}\n\n`;
  (d.rights || []).forEach(r => { text += `▶ ${r.right}\n관련 법: ${r.law}\n${r.explanation}\n\n`; });
  text += '[해야 할 일]\n';
  (d.actions || []).forEach(a => { text += `${a.step}. ${a.action}\n${a.detail || ''}\n\n`; });
  text += '[도움받을 곳]\n';
  (d.help_contacts || []).forEach(c => { text += `${c.name} ${c.phone} — ${c.description}\n`; });
  if (d.caution) text += `\n[주의] ${d.caution}`;
  return text;
}

function copyRights() {
  const text = buildRightsText();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('복사됐습니다.'));
}

function saveRights() {
  const text = buildRightsText();
  if (!text) return;
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '권리상담_결과.txt'; a.click();
  URL.revokeObjectURL(url);
  showToast('파일로 저장됐습니다.');
}

function printRights() { window.print(); }
