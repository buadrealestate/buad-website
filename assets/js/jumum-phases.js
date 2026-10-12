/* BUAD — Al Jumum phases (home page + jumum.html): four image panels, one open at a time.
   Opens the next phase every 6 s while in view; hovering, focusing or tapping a panel takes over. */
(() => {
  'use strict';
  const box = document.getElementById('phx');
  if (!box) return;
  const panels = [...box.querySelectorAll('.phx__panel')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let k = 0, timer = 0, visible = false, held = false, touched = false;
  function open(i) {
    k = i;
    panels.forEach((p, j) => { p.classList.toggle('is-open', j === i); p.setAttribute('aria-expanded', j === i); });
    const bar = panels[i].querySelector('.phx__bar'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
  }
  function run() {
    clearTimeout(timer);
    const auto = visible && !held && !touched && !reduce;
    box.classList.toggle('is-auto', auto);
    if (auto) timer = setTimeout(() => { open((k + 1) % panels.length); run(); }, 6000);
  }
  panels.forEach((p, i) => {
    if (fine) p.addEventListener('pointerenter', () => { held = true; open(i); run(); });
    p.addEventListener('click', () => { touched = true; open(i); run(); });
    p.addEventListener('focus', () => { open(i); });
    p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); touched = true; open(i); run(); } });
  });
  if (fine) box.addEventListener('pointerleave', () => { held = false; run(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }, { threshold: .35 }).observe(box);
  open(0);
})();
