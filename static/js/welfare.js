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
  document.body.classList.remove('font-sm', 'font-md', 'font-lg');
  document.body.classList.add('font-' + size);
  localStorage.setItem('fontSize', size);
  document.querySelectorAll('.font-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${size}'`));
  });
}

// ── 카테고리 색상 ──────────────────────────────
const CATEGORY_CLASS = {
  '생활지원': 'cat-life', '의료': 'cat-medical', '주거': 'cat-housing',
  '교육': 'cat-edu', '고용': 'cat-work', '돌봄': 'cat-care',
  '장애': 'cat-disability', '노인': 'cat-elderly', '아동': 'cat-child',
};

function catClass(cat) { return CATEGORY_CLASS[cat] || 'cat-life'; }

// ── 혜택 찾기 ──────────────────────────────────
let lastWelfareResult = null;

document.getElementById('welfare-btn').addEventListener('click', async () => {
  const age       = document.getElementById('w-age').value.trim();
  const household = document.getElementById('w-household').value;
  const income    = document.getElementById('w-income').value;

  if (!age || !household || !income) {
    showToast('나이, 가구 유형, 소득 수준은 필수 항목입니다.', true);
    return;
  }

  const btn = document.getElementById('welfare-btn');
  btn.disabled = true;
  showLoading('복지 혜택을 분석하고 있습니다...');

  const body = {
    age,
    household,
    income,
    disability:  document.getElementById('w-disability').value,
    region:      document.getElementById('w-region').value,
    has_infant:  document.getElementById('w-infant').checked,
    has_child:   document.getElementById('w-child').checked,
    has_elderly: document.getElementById('w-elderly').checked,
  };

  try {
    const res  = await fetch('/welfare/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, true); return; }
    lastWelfareResult = data;
    renderWelfare(data);
  } catch {
    showToast('서버 연결에 실패했습니다.', true);
  } finally {
    btn.disabled = false;
    hideLoading();
  }
});

function renderWelfare(data) {
  const programs = data.programs || [];
  const el = document.getElementById('welfare-result');

  if (!programs.length) {
    el.innerHTML = `<div class="result-empty">
      <div class="empty-icon">🔍</div>
      <p>입력하신 조건에 해당하는 복지 혜택을 찾지 못했습니다.<br>조건을 조정해 다시 시도해보세요.</p>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="welfare-summary">총 <strong>${programs.length}개</strong>의 혜택을 찾았습니다.</div>
    <div class="program-list">
      ${programs.map(p => `
      <div class="program-card">
        <div class="program-header">
          <span class="program-category ${catClass(p.category)}">${escHtml(p.category)}</span>
          <span class="program-name">${escHtml(p.name)}</span>
        </div>
        <p class="program-desc">${escHtml(p.description)}</p>
        <div class="program-details">
          <div class="program-detail-item">
            <span class="detail-label">자격 요건</span>
            <span class="detail-value">${escHtml(p.eligibility)}</span>
          </div>
          <div class="program-detail-item">
            <span class="detail-label">지원 내용</span>
            <span class="detail-value">${escHtml(p.benefit)}</span>
          </div>
          <div class="program-detail-item">
            <span class="detail-label">신청 방법</span>
            <span class="detail-value">${escHtml(p.how_to_apply)}</span>
          </div>
          <div class="program-detail-item">
            <span class="detail-label">문의처</span>
            <span class="detail-value">${escHtml(p.contact)}</span>
          </div>
        </div>
      </div>`).join('')}
    </div>
    ${data.tips ? `
    <div class="welfare-tips">
      <div class="tips-title">💡 추가 안내</div>
      <p>${escHtml(data.tips)}</p>
    </div>` : ''}
  `;
}
