// ── 글자 크기 ─────────────────────────────────
function setFontSize(size) {
  document.documentElement.classList.remove('font-sm', 'font-md', 'font-lg');
  document.documentElement.classList.add('font-' + size);
  localStorage.setItem('fontSize', size);
  document.querySelectorAll('.font-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${size}'`));
  });
}

// ── 타이핑 효과 ───────────────────────────────
(function () {
  const el = document.querySelector('.hero-type');
  if (!el) return;

  const words = ['계약서', '공문서', '의료 안내문', '행정 고지서', '약관', '임대차 계약서'];
  let wordIdx = 0, charIdx = 0, deleting = false;

  function tick() {
    const word = words[wordIdx];
    el.textContent = deleting ? word.slice(0, --charIdx) : word.slice(0, ++charIdx);

    let delay = deleting ? 55 : 105;

    if (!deleting && charIdx === word.length) {
      delay = 1800;
      deleting = true;
    } else if (deleting && charIdx === 0) {
      deleting = false;
      wordIdx = (wordIdx + 1) % words.length;
      delay = 350;
    }

    setTimeout(tick, delay);
  }

  setTimeout(tick, 700);
})();

// ── 스탯 카운터 ──────────────────────────────
(function () {
  const statsEl = document.getElementById('hero-stats');
  if (!statsEl) return;

  function animateNum(el) {
    const target = parseInt(el.dataset.target, 10);
    const start = performance.now();
    const duration = 1400;

    (function step(now) {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target;
    })(start);
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.hero-stat-num').forEach(animateNum);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.4 });

  obs.observe(statsEl);
})();

// ── 스크롤 리빌 ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  const savedSize = localStorage.getItem('fontSize') || 'md';
  document.querySelectorAll('.font-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${savedSize}'`));
  });
});
