/* progress.html — the works timeline: animate the bars in and place the "today" line */
(() => {
  'use strict';
  const chart = document.getElementById('gt');
  if (!chart) return;
  const t0 = new Date(chart.dataset.t0 + 'T00:00:00+03:00'), t1 = new Date(chart.dataset.t1 + 'T00:00:00+03:00');
  const k = (Date.now() - t0) / (t1 - t0);
  const today = document.getElementById('gtToday');
  const place = () => {
    const lab = parseFloat(getComputedStyle(chart).getPropertyValue('--lab')) || 0;
    const body = chart.querySelector('.gt__body');
    const lane = body.querySelector('.gt__lane');
    if (!lane || k < 0 || k > 1) { today.style.display = 'none'; return; }
    const w = lane.getBoundingClientRect().width, bodyR = body.getBoundingClientRect(), laneR = lane.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl';
    const x = rtl ? laneR.right - bodyR.left - w * k : laneR.left - bodyR.left + w * k;
    today.style.display = 'block';
    today.style.left = `${x}px`;
  };
  new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; o.disconnect(); chart.classList.add('in'); }, { threshold: .2 }).observe(chart);
  place();
  addEventListener('resize', place);
  addEventListener('buad:lang', () => setTimeout(place, 50));
  chart.addEventListener('scroll', place, { passive: true });
})();
