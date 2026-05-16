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

// ── 절차 유형 ──────────────────────────────────
let currentProcedureType = '주거·이사';

function setProcedureType(type) {
  currentProcedureType = type;
  document.querySelectorAll('[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

// ── 글자수 ─────────────────────────────────────
const procInput = document.getElementById('procedure-input');
const procCount = document.getElementById('procedure-char-count');
procInput.addEventListener('input', () => {
  const len = procInput.value.length;
  procCount.textContent = `${len.toLocaleString()} / 500자`;
  procCount.className = 'char-count' + (len > 500 ? ' error' : len > 400 ? ' warning' : '');
});

// ── 절차 안내 요청 ─────────────────────────────
let lastProcedureResult = null;

document.getElementById('procedure-btn').addEventListener('click', async () => {
  const situation = procInput.value.trim();
  if (!situation) { showToast('상황을 입력해주세요.', true); return; }

  const btn = document.getElementById('procedure-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-dots"><span></span><span></span><span></span></span>안내 중...';
  showLoading('AI가 절차를 정리하고 있습니다...');
  document.getElementById('procedure-result-actions').style.display = 'none';

  try {
    const res  = await fetch('/procedure/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procedure_type: currentProcedureType, situation }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    lastProcedureResult = data;
    renderProcedure(data);
    document.getElementById('procedure-result-actions').style.display = 'flex';
  } catch { showToast('오류가 발생했습니다. 다시 시도해주세요.', true); }
  finally {
    hideLoading();
    btn.disabled = false;
    btn.textContent = '절차 안내받기';
  }
});

function renderProcedure(d) {
  const result = document.getElementById('procedure-result');

  const stepsHtml = (d.steps || []).map(s => `
    <div class="proc-step">
      <div class="proc-step-num">${s.step}</div>
      <div class="proc-step-body">
        <div class="proc-step-title">${escHtml(s.title)}</div>
        <div class="proc-step-desc">${escHtml(s.description)}</div>
        ${s.location ? `<div class="proc-step-meta">📍 ${escHtml(s.location)}</div>` : ''}
        ${s.duration  ? `<div class="proc-step-meta">⏱ ${escHtml(s.duration)}</div>`  : ''}
      </div>
    </div>`).join('');

  const docsHtml = (d.required_docs || []).map(doc =>
    `<li>${escHtml(doc)}</li>`).join('');

  result.innerHTML = `
    <div class="result-section">
      <h2 class="contract-main-title">${escHtml(d.title || '절차 안내')}</h2>
      ${d.summary ? `<p class="civil-tips-text" style="margin-top:8px;">${escHtml(d.summary)}</p>` : ''}
      <div class="proc-meta-row">
        <span class="proc-badge">⏳ ${escHtml(d.total_duration || '')}</span>
        ${d.online_available ? `<span class="proc-badge proc-badge-blue">💻 온라인 가능</span>` : ''}
      </div>
    </div>

    <div class="result-section">
      <div class="section-title">📋 단계별 안내</div>
      <div class="proc-steps">${stepsHtml}</div>
    </div>

    ${docsHtml ? `
    <div class="result-section">
      <div class="section-title">📁 필요 서류</div>
      <ul class="rights-list">${docsHtml}</ul>
    </div>` : ''}

    ${d.online_guide ? `
    <div class="result-section">
      <div class="section-title">💻 온라인 신청</div>
      <p class="civil-tips-text">${escHtml(d.online_guide)}</p>
    </div>` : ''}

    ${d.tips ? `
    <div class="result-section">
      <div class="section-title">💡 알아두세요</div>
      <p class="civil-tips-text">${escHtml(d.tips)}</p>
    </div>` : ''}`;
}

// ── Ctrl+Enter 단축키 ──────────────────────────
procInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') document.getElementById('procedure-btn').click();
});

// ── TTS ────────────────────────────────────────
let _ttsOn = false;

function toggleTTS() {
  const btn = document.getElementById('procedure-tts-btn');
  if (!lastProcedureResult) return;
  if (_ttsOn || speechSynthesis.speaking) {
    speechSynthesis.cancel();
    _ttsOn = false;
    if (btn) btn.textContent = '🔊 읽기';
    return;
  }
  const d = lastProcedureResult;
  let text = `${d.title || ''}. ${d.summary || ''}. `;
  (d.steps || []).forEach(s => { text += `${s.step}단계. ${s.title}. ${s.description}. `; });
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.9;
  utt.onend = utt.onerror = () => { _ttsOn = false; if (btn) btn.textContent = '🔊 읽기'; };
  speechSynthesis.speak(utt);
  _ttsOn = true;
  if (btn) btn.textContent = '⏹ 중지';
}

// ── 복사 / 저장 ────────────────────────────────
function buildProcedureText() {
  if (!lastProcedureResult) return '';
  const d = lastProcedureResult;
  let text = `${d.title || '절차 안내'}\n${d.summary || ''}\n\n`;
  (d.steps || []).forEach(s => { text += `${s.step}단계. ${s.title}\n${s.description}\n${s.location ? '📍 '+s.location+'\n' : ''}${s.duration ? '⏱ '+s.duration+'\n' : ''}\n`; });
  if (d.required_docs?.length) text += `[필요 서류]\n${d.required_docs.map(x=>'• '+x).join('\n')}\n`;
  if (d.tips) text += `\n[알아두세요]\n${d.tips}`;
  return text;
}

function copyProcedure() {
  const text = buildProcedureText();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('복사됐습니다.'));
}

function saveProcedure() {
  const text = buildProcedureText();
  if (!text) return;
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '절차안내_결과.txt'; a.click();
  URL.revokeObjectURL(url);
  showToast('파일로 저장됐습니다.');
}

function printProcedure() { window.print(); }
