/* BUAD home page — the Al Jumum sections (same markup as jumum.html): interactive masterplan, phase timeline,
   render strip and the hero's scroll drift. The film, reveals, counters and language live in main.js. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  const ZONES = window.JUMUM_ZONES || {};
  const en = () => html.lang === 'en';

  /* ------------------------------------------------------------ interactive masterplan */
  const masterplan = (() => {
    const plan = $('#planBox');
    if (!plan) return null;
    const zDefault = $('#zDefault'), zZone = $('#zZone');
    const polys = $$('.zone', plan);
    const PH_AR = ['مرافق مساندة', 'المرحلة الأولى', 'المرحلة الثانية', 'المرحلة الثالثة', 'المرحلة الرابعة'];
    const PH_EN = ['Supporting facilities', 'Phase One', 'Phase Two', 'Phase Three', 'Phase Four'];
    polys.forEach(p => {
      const b = p.getBBox();
      p.style.setProperty('--d', `${(((1500 - b.x) + b.y) / 2400 * .9).toFixed(2)}s`);
      p.setAttribute('tabindex', '0');
    });
    const list = $('#zlist');
    const order = Object.keys(ZONES).sort((a, b) => ((ZONES[a].ph || 9) - (ZONES[b].ph || 9)));
    const swClass = id => id === 'zg' ? 'pg' : (ZONES[id].ph ? `ph${ZONES[id].ph}` : 'ps');
    const renderList = () => {
      list.innerHTML = order.map(id => `<li data-z="${id}"><i class="sw ${swClass(id)}"></i><span>${en() ? ZONES[id].en : ZONES[id].ar}</span></li>`).join('');
    };
    renderList();
    let current = null, pinned = null, phase = 'all';
    function show(id) {
      current = id;
      polys.forEach(p => p.classList.toggle('is-hot', p.dataset.z === id));
      $$('li', list).forEach(li => li.classList.toggle('is-hot', li.dataset.z === id));
      if (!id) { zZone.hidden = true; zDefault.hidden = false; return; }
      const z = ZONES[id];
      $('#zPhase').innerHTML = `<i class="sw ${swClass(id)}"></i>${(en() ? PH_EN : PH_AR)[z.ph]}`;
      $('#zName').textContent = en() ? z.en : z.ar;
      $('#zArea').textContent = z.a.toLocaleString('en-US');
      zDefault.hidden = true;
      zZone.hidden = false;
      zZone.style.animation = 'none'; void zZone.offsetWidth; zZone.style.animation = '';
    }
    const dimList = () => $$('li', list).forEach(li => li.classList.toggle('is-dim', phase !== 'all' && String(ZONES[li.dataset.z].ph) !== phase));
    const enter = id => { if (id !== current) show(id); };
    const leave = () => { if (pinned) { if (current !== pinned) show(pinned); } else show(null); };
    const pick = id => { pinned = pinned === id ? null : id; show(pinned); };
    polys.forEach(p => {
      p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') enter(p.dataset.z); });
      p.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') leave(); });
      p.addEventListener('click', () => pick(p.dataset.z));
      p.addEventListener('focus', () => enter(p.dataset.z));
      p.addEventListener('blur', leave);
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p.dataset.z); } });
    });
    list.addEventListener('pointerover', e => { const li = e.target.closest('li'); if (li && e.pointerType === 'mouse') enter(li.dataset.z); });
    list.addEventListener('pointerleave', leave);
    list.addEventListener('click', e => {
      const li = e.target.closest('li'); if (!li) return;
      pick(li.dataset.z);
      if (innerWidth < 1100) plan.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    $$('#phaseChips .chip').forEach(chip => chip.addEventListener('click', () => {
      phase = chip.dataset.ph;
      $$('#phaseChips .chip').forEach(c => c.classList.toggle('is-active', c === chip));
      plan.classList.toggle('is-filtered', phase !== 'all');
      polys.forEach(p => p.classList.toggle('is-match', phase !== 'all' && String(ZONES[p.dataset.z].ph) === phase));
      dimList();
      pinned = null; show(null);
    }));
    document.addEventListener('click', e => {
      if (pinned && !e.target.closest('.zone, #zlist, #zcard, #phaseChips')) { pinned = null; show(null); }
    });
    return { relabel() { renderList(); show(pinned); dimList(); } };
  })();

  /* ------------------------------------------------------------ scroll-linked: hero drift, timeline line, render strip */
  const jhMedia = $('#jhMedia'), jhContent = $('#jhContent'), hero = jhMedia && jhMedia.closest('section');
  const tl = $('#timeline'), tlItems = $$('.tl__item');
  const strip = $('#strip');
  let tick = false;
  function frame() {
    tick = false;
    const vh = innerHeight;
    if (tl) {
      const r = tl.getBoundingClientRect();
      tl.style.setProperty('--tl', Math.min(1, Math.max(0, (vh * .55 - r.top) / r.height)).toFixed(4));
      tlItems.forEach(li => {
        const b = li.getBoundingClientRect();
        li.classList.toggle('is-on', b.top + b.height / 2 < vh * .55);
      });
    }
    if (reduce) return;
    if (hero) {                                              // the film sinks a little and the title lifts away as it leaves
      const r = hero.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const h = Math.min(1, Math.max(0, -r.top / vh));
        jhMedia.style.transform = `translate3d(0, ${(h * 18).toFixed(2)}%, 0) scale(${(1 + h * .08).toFixed(4)})`;
        jhContent.style.transform = `translate3d(0, ${(-h * 80).toFixed(1)}px, 0)`;
        jhContent.style.opacity = (1 - h * 1.5).toFixed(3);
      }
    }
    if (strip) {
      const s = strip.parentElement.getBoundingClientRect();
      if (s.bottom > 0 && s.top < vh) {
        const q = (vh - s.top) / (vh + s.height);
        const span = strip.scrollWidth - strip.parentElement.clientWidth;
        const tx = html.dir === 'rtl' ? -span * (1 - q) : -span * q;
        strip.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
      }
    }
  }
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  frame();

  document.addEventListener('buad:lang', () => { if (masterplan) masterplan.relabel(); frame(); });
  if (en() && masterplan) masterplan.relabel();
})();
