// ── 유틸 ──────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showLoading(msg='AI가 계약서를 작성하고 있습니다...') {
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

// ── 계약 유형 ──────────────────────────────────
let currentContractType = '방·집 임대차 계약';

function setContractType(type) {
  currentContractType = type;
  document.querySelectorAll('[data-type]').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

// ── 글자수 ─────────────────────────────────────
const contractInput = document.getElementById('contract-input');
const contractCount = document.getElementById('contract-char-count');
contractInput.addEventListener('input', () => {
  const len = contractInput.value.length;
  contractCount.textContent = `${len.toLocaleString()} / 1,000자`;
  contractCount.className = 'char-count' + (len > 1000 ? ' error' : len > 800 ? ' warning' : '');
});

// ── 계약서 생성 ────────────────────────────────
let lastContractResult = null;

document.getElementById('contract-btn').addEventListener('click', async () => {
  const situation = contractInput.value.trim();
  if (!situation) { showToast('계약 내용을 입력해주세요.', true); return; }

  const btn = document.getElementById('contract-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-dots"><span></span><span></span><span></span></span>작성 중...';
  showLoading('AI가 공정한 계약서를 작성하고 있습니다...');
  document.getElementById('contract-result-actions').style.display = 'none';

  try {
    const res  = await fetch('/contract/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_type: currentContractType, situation }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    lastContractResult = data;
    renderContract(data);
    document.getElementById('contract-result-actions').style.display = 'flex';
  } catch { showToast('오류가 발생했습니다. 다시 시도해주세요.', true); }
  finally {
    hideLoading();
    btn.disabled = false;
    btn.textContent = '계약서 만들기';
  }
});

function renderContract(d) {
  const result = document.getElementById('contract-result');

  const clausesHtml = (d.clauses || []).map(c => `
    <div class="contract-clause">
      <div class="contract-clause-num">제${c.number}조</div>
      <div class="contract-clause-title">${escHtml(c.title)}</div>
      <div class="contract-clause-content">${escHtml(c.content)}</div>
    </div>`).join('');

  const protectionHtml = (d.protection_notes || []).map(n =>
    `<li>${escHtml(n)}</li>`).join('');

  result.innerHTML = `
    <div class="result-section">
      <div class="contract-title-block">
        <h2 class="contract-main-title">${escHtml(d.title || '계약서')}</h2>
        <div class="contract-parties">
          <span class="contract-party party-a">갑(甲) ${escHtml(d.parties?.party_a || '')}</span>
          <span class="contract-party party-b">을(乙) ${escHtml(d.parties?.party_b || '')}</span>
        </div>
      </div>
    </div>

    <div class="result-section">
      <div class="section-title">📋 계약 조항</div>
      <div class="contract-clauses">${clausesHtml}</div>
    </div>

    ${protectionHtml ? `
    <div class="result-section">
      <div class="section-title" style="color:#1d4ed8;">🛡 을(약자) 보호 포인트</div>
      <ul class="rights-list">${protectionHtml}</ul>
    </div>` : ''}

    ${d.caution ? `
    <div class="result-section">
      <div class="section-title">⚠️ 계약 전 확인사항</div>
      <p class="civil-tips-text">${escHtml(d.caution)}</p>
    </div>` : ''}`;
}

// ── 예시 힌트 ──────────────────────────────────
const CONTRACT_HINTS = {
  '방·집 임대차 계약': '서울 마포구 원룸, 보증금 1,000만원, 월세 55만원, 계약기간 2년, 관리비 5만원 별도. 소형견 1마리 있음. 계약 만료 1개월 전 갱신/해지 의사 통보 특약 포함.',
  '알바·단기 고용 계약': '편의점 아르바이트, 시급 10,000원, 주 3일 (수·토·일), 하루 6시간 (14:00~20:00), 3개월 계약. 법정 초과근무수당 및 주휴수당 명시 필요.',
  '프리랜서 용역 계약': '쇼핑몰 UI 디자인 외주, 총 300만원, 계약금 30% 선불·잔금 납품 후 지급, 납품 기간 30일, 수정 3회 포함. 저작권은 잔금 수령 후 클라이언트에게 이전.',
  '물품 매매·거래 계약': '중고 맥북 판매, 가격 90만원, 스크래치 있는 현재 상태 확인 후 직거래. 직거래 후 3일 이내 은폐된 하자 발견 시 전액 환불.',
  '기타 계약': '1:1 영어 회화 과외, 주 2회 각 1시간, 월 20만원 선불, 3개월 계약. 3회 이상 무단 결석 시 잔여 수업료 환불 없이 계약 해지 가능.',
};

function applyContractHint() {
  const hint = CONTRACT_HINTS[currentContractType];
  if (!hint) { showToast('선택된 유형의 예시가 없습니다.', true); return; }
  contractInput.value = hint;
  contractInput.dispatchEvent(new Event('input'));
  showToast('예시를 불러왔습니다.');
}

// ── Ctrl+Enter 단축키 ──────────────────────────
contractInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') document.getElementById('contract-btn').click();
});

// ── TTS ────────────────────────────────────────
let _ttsOn = false;

function toggleTTS() {
  const btn = document.getElementById('contract-tts-btn');
  if (!lastContractResult) return;
  if (_ttsOn || speechSynthesis.speaking) {
    speechSynthesis.cancel();
    _ttsOn = false;
    if (btn) btn.textContent = '🔊 읽기';
    return;
  }
  const d = lastContractResult;
  let text = `${d.title || '계약서'}. `;
  (d.clauses || []).forEach(c => { text += `제${c.number}조 ${c.title}. ${c.content}. `; });
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.9;
  utt.onend = utt.onerror = () => { _ttsOn = false; if (btn) btn.textContent = '🔊 읽기'; };
  speechSynthesis.speak(utt);
  _ttsOn = true;
  if (btn) btn.textContent = '⏹ 중지';
}

// ── 복사 / 저장 ────────────────────────────────
function buildContractText() {
  if (!lastContractResult) return '';
  const d = lastContractResult;
  let text = `${d.title || '계약서'}\n\n갑(甲): ${d.parties?.party_a || ''}\n을(乙): ${d.parties?.party_b || ''}\n\n`;
  (d.clauses || []).forEach(c => { text += `제${c.number}조 ${c.title}\n${c.content}\n\n`; });
  if (d.protection_notes?.length) {
    text += '[을(약자) 보호 포인트]\n';
    d.protection_notes.forEach(n => { text += `• ${n}\n`; });
    text += '\n';
  }
  if (d.caution) text += `[계약 전 확인사항]\n${d.caution}`;
  return text;
}

function copyContract() {
  const text = buildContractText();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('복사됐습니다.'));
}

function saveContract() {
  const text = buildContractText();
  if (!text) return;
  const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '계약서_작성결과.txt'; a.click();
  URL.revokeObjectURL(url);
  showToast('파일로 저장됐습니다.');
}

function printContract() { window.print(); }
