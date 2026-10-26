/* BUAD — «تجارب فعلية» on the home page: a click on a project card opens it large on the same page (user 2026-10-26:
   no separate projects page). The view reads the card itself, so it follows the language switch. */
(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.mpc[data-proj]')];
  if (!cards.length) return;
  const en = () => document.documentElement.lang === 'en';
  const dv = document.createElement('dialog');
  dv.className = 'pv';
  document.body.appendChild(dv);
  let cur = 0;
  function show(i) {
    cur = (i + cards.length) % cards.length;
    const c = cards[cur], q = s => c.querySelector(s);
    const fig = q('.mpc__fig');
    dv.innerHTML = `
      <div class="pv__card">
        <div class="pv__img"><img src="${q('img').getAttribute('src')}" alt=""></div>
        <div class="pv__body">
          <span class="pv__no">${String(cur + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}</span>
          <span class="pv__dim">${q('.mpc__dim').innerHTML}</span>
          <h3 class="pv__t">${q('.mpc__t').innerHTML}</h3>
          ${fig ? `<p class="pv__fig">${fig.innerHTML}</p>` : ''}
          <p class="pv__d">${q('.mpc__d').innerHTML}</p>
          <div class="pv__nav"><button type="button" class="pv__prev" aria-label="${en() ? 'Previous' : 'السابق'}"></button><button type="button" class="pv__next" aria-label="${en() ? 'Next' : 'التالي'}"></button></div>
        </div>
        <button type="button" class="pv__x" aria-label="${en() ? 'Close' : 'إغلاق'}"></button>
      </div>`;
    dv.querySelector('.pv__x').addEventListener('click', () => dv.close());
    dv.querySelector('.pv__prev').addEventListener('click', () => show(cur - 1));
    dv.querySelector('.pv__next').addEventListener('click', () => show(cur + 1));
    if (!dv.open) { dv.showModal(); document.documentElement.classList.add('rq-open'); }
  }
  cards.forEach((c, i) => c.addEventListener('click', () => show(i)));
  dv.addEventListener('click', e => { if (e.target === dv) dv.close(); });
  dv.addEventListener('close', () => document.documentElement.classList.remove('rq-open'));
  dv.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur + (document.documentElement.dir === 'rtl' ? 1 : -1)); if (e.key === 'ArrowRight') show(cur + (document.documentElement.dir === 'rtl' ? -1 : 1)); });
})();
