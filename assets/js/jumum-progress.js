/* BUAD — Al Jumum progress (home page + jumum.html). The overall % comes from the milestones' status
   (completed = 1, in progress = ½) unless #jprog carries data-progress; it loads up like a progress bar when the
   section comes into view. The day counter runs to the fuel station's opening date (data-launch). */
(() => {
  'use strict';
  const box = document.getElementById('jprog');
  if (!box) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...document.querySelectorAll('.ms-list .ms')];
  // completed = 1, in progress = its data-p share (½ when not given), upcoming = 0
  const share = m => m.classList.contains('is-done') ? 1 : m.classList.contains('is-now') ? (+m.dataset.p || .5) : 0;
  const pct = box.dataset.progress ? +box.dataset.progress : Math.round(items.reduce((t, m) => t + share(m), 0) / items.length * 100);
  const days = Math.max(0, Math.ceil((new Date(box.dataset.launch + 'T00:00:00+03:00') - Date.now()) / 864e5));
  const pctEl = document.getElementById('jprogPct'), daysEl = document.getElementById('jprogDays'), fill = document.getElementById('jprogFill');
  const ticks = [...box.querySelectorAll('.jprog__tick')];
  // place the milestone ticks evenly; the fill reaches the middle of the current milestone
  ticks.forEach((t, i) => t.style.setProperty('--at', `${((i + .5) / ticks.length * 100).toFixed(2)}%`));
  const show = k => {
    const p = pct * k;
    pctEl.textContent = Math.round(p);
    daysEl.textContent = Math.round(days * k).toLocaleString('en-US');
    fill.style.width = `${p.toFixed(2)}%`;
    ticks.forEach(t => t.classList.toggle('is-passed', parseFloat(t.style.getPropertyValue('--at')) <= p + .01));
  };
  if (reduce) { show(1); box.classList.add('is-loaded'); return; }
  show(0);
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    const t0 = performance.now(), dur = 2600;
    const ease = x => 1 - Math.pow(1 - x, 4);
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      show(ease(k));
      if (k < 1) requestAnimationFrame(step); else box.classList.add('is-loaded');
    })(t0);
  }, { threshold: .45 }).observe(box);
})();
