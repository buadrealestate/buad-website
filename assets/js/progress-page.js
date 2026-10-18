/* progress.html — works timeline (bars grow in, the "today" beam and the elapsed shade) and the journey road fill */
(() => {
  'use strict';
  const chart = document.getElementById('gt');
  if (chart) {
    const t0 = new Date(chart.dataset.t0 + 'T00:00:00+03:00'), t1 = new Date(chart.dataset.t1 + 'T00:00:00+03:00');
    const k = (Date.now() - t0) / (t1 - t0);
    const today = document.getElementById('gtToday'), past = document.getElementById('gtPast');
    const place = () => {
      const body = chart.querySelector('.gt__body'), lane = body.querySelector('.gt__lane');
      if (!lane || k < 0 || k > 1) { today.style.display = past.style.display = 'none'; return; }
      const bodyR = body.getBoundingClientRect(), laneR = lane.getBoundingClientRect(), w = laneR.width;
      const rtl = document.documentElement.dir === 'rtl';
      const start = rtl ? laneR.right - bodyR.left : laneR.left - bodyR.left;
      const x = rtl ? start - w * k : start + w * k;
      today.style.display = past.style.display = 'block';
      today.style.left = `${x}px`;
      past.style.left = `${Math.min(start, x)}px`;
      past.style.width = `${Math.abs(x - start)}px`;
    };
    new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; o.disconnect(); chart.classList.add('in'); }, { threshold: .2 }).observe(chart);
    place();
    addEventListener('resize', place);
    addEventListener('buad:lang', () => setTimeout(place, 50));
    chart.addEventListener('scroll', place, { passive: true });
  }

  // journey: the gold line runs to the current stage
  const jr = document.getElementById('jr');
  if (jr) {
    const steps = [...jr.querySelectorAll('.jr__step')], fill = document.getElementById('jrFill');
    const cur = Math.max(0, steps.findIndex(s => s.classList.contains('is-now')));
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect();
      fill.style.width = `${(cur + .5) / (steps.length - 1) * 100}%`;
    }, { threshold: .3 }).observe(jr);
  }
})();
