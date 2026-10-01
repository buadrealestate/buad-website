/* BUAD — Al Jumum Interface page (no dependencies) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const html = document.documentElement;
  const EN = window.BUAD_EN || {};
  const ZONES = window.JUMUM_ZONES || {};
  const en = () => html.lang === 'en';
  $('#year').textContent = new Date().getFullYear();
  requestAnimationFrame(() => document.body.classList.add('is-ready'));

  /* ------------------------------------------------------------ header */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > innerHeight * .75);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#burger').addEventListener('click', () => nav.classList.toggle('is-open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

  /* ------------------------------------------------------------ word split for the big statement */
  function split(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, k) => `<span class="w" style="transition-delay:${k * 60}ms">${w}</span>`).join(' ');
  }
  $$('.split').forEach(split);

  /* ------------------------------------------------------------ reveal on scroll + counters */
  const fmt = (n, sep) => sep ? n.toLocaleString('en-US') : String(n);
  function count(el) {
    const end = +el.dataset.count, suf = el.dataset.suffix || '', sep = !!el.dataset.sep;
    if (reduce) { el.textContent = fmt(end, sep) + suf; return; }
    const dur = 1700, t = performance.now();
    const step = now => {
      const k = Math.min((now - t) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      el.textContent = fmt(v, sep) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    $$('[data-count]', el).forEach(count);
    io.unobserve(el);
  }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .split, .reveal-img').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const k = sib.indexOf(el);
    if (k > 0 && !el.style.transitionDelay) el.style.transitionDelay = `${Math.min(k, 6) * 90}ms`;
    io.observe(el);
  });

  /* ------------------------------------------------------------ interactive masterplan */
  const plan = $('#planBox'), card = $('#zcard'), zDefault = $('#zDefault'), zZone = $('#zZone');
  const polys = $$('.zone', plan);
  const PH_AR = ['مرافق مساندة', 'المرحلة الأولى', 'المرحلة الثانية', 'المرحلة الثالثة', 'المرحلة الرابعة'];
  const PH_EN = ['Supporting facilities', 'Phase One', 'Phase Two', 'Phase Three', 'Phase Four'];
  // zones draw in from the highway side (top-right) outward
  polys.forEach(p => {
    const b = p.getBBox();
    p.style.setProperty('--d', `${(((1500 - b.x) + b.y) / 2400 * .9).toFixed(2)}s`);
    p.setAttribute('tabindex', '0');
  });

  // the list under the map (one row per zone, ordered by phase)
  const list = $('#zlist');
  const order = Object.keys(ZONES).sort((a, b) => ((ZONES[a].ph || 9) - (ZONES[b].ph || 9)));
  function swClass(id) { const z = ZONES[id]; return id === 'zg' ? 'pg' : (z.ph ? `ph${z.ph}` : 'ps'); }
  function renderList() {
    list.innerHTML = order.map(id => `<li data-z="${id}"><i class="sw ${swClass(id)}"></i><span>${en() ? ZONES[id].en : ZONES[id].ar}</span></li>`).join('');
  }
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

  // phase filter
  $$('#phaseChips .chip').forEach(chip => chip.addEventListener('click', () => {
    phase = chip.dataset.ph;
    $$('#phaseChips .chip').forEach(c => c.classList.toggle('is-active', c === chip));
    plan.classList.toggle('is-filtered', phase !== 'all');
    polys.forEach(p => p.classList.toggle('is-match', phase !== 'all' && String(ZONES[p.dataset.z].ph) === phase));
    $$('li', list).forEach(li => li.classList.toggle('is-dim', phase !== 'all' && String(ZONES[li.dataset.z].ph) !== phase));
    pinned = null; show(null);
  }));
  // a tap outside the map clears a pinned zone
  document.addEventListener('click', e => {
    if (pinned && !e.target.closest('.zone, #zlist, #zcard, #phaseChips')) { pinned = null; show(null); }
  });

  /* ------------------------------------------------------------ scroll-linked motion */
  const progressBar = $('#progressBar');
  const decos = $$('[data-speed], [data-x]');
  const jhMedia = $('#jhMedia'), jhContent = $('#jhContent');
  const tl = $('#timeline'), tlItems = $$('.tl__item');
  const strip = $('#strip');
  const locImg = $('.jloc__media img');
  let tick = false;
  function frame() {
    tick = false;
    const vh = innerHeight, y = scrollY;
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;

    // timeline line fills as you read down; each phase marker lights up when the line reaches it
    const r = tl.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (vh * .55 - r.top) / r.height));
    tl.style.setProperty('--tl', k.toFixed(4));
    tlItems.forEach(li => {
      const b = li.getBoundingClientRect();
      li.classList.toggle('is-on', b.top + b.height / 2 < vh * .55);
    });
    if (reduce) return;

    if (y < vh * 1.2) {
      const h = Math.min(y / vh, 1);
      jhMedia.style.transform = `translate3d(0, ${(h * 18).toFixed(2)}%, 0) scale(${(1 + h * .08).toFixed(4)})`;
      jhContent.style.transform = `translate3d(0, ${(-h * 80).toFixed(1)}px, 0)`;
      jhContent.style.opacity = (1 - h * 1.5).toFixed(3);
    }
    decos.forEach(el => {
      const b = el.parentElement.getBoundingClientRect();
      if (b.bottom < -200 || b.top > vh + 200) return;
      const q = (b.top + b.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(${((+el.dataset.x || 0) * q * 2.4).toFixed(1)}px, ${((+el.dataset.speed || 0) * q * 260).toFixed(1)}px, 0) rotate(${(45 + q * 22).toFixed(1)}deg)`;
    });
    const s = strip.parentElement.getBoundingClientRect();
    if (s.bottom > 0 && s.top < vh) {
      const q = (vh - s.top) / (vh + s.height);              // 0 .. 1 while the strip crosses the screen
      const span = strip.scrollWidth - strip.parentElement.clientWidth;
      const dir = html.dir === 'rtl' ? 1 : -1;               // Arabic reads right-to-left, so the row travels right
      const tx = dir > 0 ? -span * (1 - q) : -span * q;
      strip.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
    }
    const l = locImg.parentElement.getBoundingClientRect();
    if (l.bottom > 0 && l.top < vh) {
      const q = (l.top + l.height / 2 - vh / 2) / (vh + l.height);
      locImg.style.transform = `translate3d(0, ${(-12 - q * 18).toFixed(2)}%, 0)`;
    }
  }
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  frame();

  /* ------------------------------------------------------------ tactile hovers (fine pointers only) */
  if (fine && !reduce) {
    $$('.btn, .lang, .chip, .dl__btn').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const b = btn.getBoundingClientRect();
        btn.style.setProperty('--tx', `${(((e.clientX - (b.left + b.width / 2)) / b.width) * 8).toFixed(1)}px`);
        btn.style.setProperty('--ty', `${(((e.clientY - (b.top + b.height / 2)) / b.height) * 6).toFixed(1)}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
    });
  }

  /* ------------------------------------------------------------ language (shared choice with the home page) */
  const nodes = $$('[data-i18n]');
  const arTitle = document.title;
  function setLang(lang) {
    const isEn = lang === 'en';
    nodes.forEach(el => {
      if (el.dataset.ar === undefined) el.dataset.ar = el.innerHTML;
      const v = isEn ? EN[el.dataset.i18n] : el.dataset.ar;
      if (v !== undefined) el.innerHTML = v;
      if (el.classList.contains('split')) { const was = el.classList.contains('in'); split(el); if (was) el.classList.add('in'); }
    });
    html.lang = isEn ? 'en' : 'ar';
    html.dir = isEn ? 'ltr' : 'rtl';
    document.title = isEn ? EN['jp.meta.title'] : arTitle;
    $('#langBtn').textContent = isEn ? 'ع' : 'EN';
    renderList(); show(pinned);
    $$('li', list).forEach(li => li.classList.toggle('is-dim', phase !== 'all' && String(ZONES[li.dataset.z].ph) !== phase));
    store.set('buad-lang', lang);
    frame();
  }
  $('#langBtn').addEventListener('click', () => setLang(en() ? 'ar' : 'en'));
  const saved = store.get('buad-lang') || (new URLSearchParams(location.search).get('lang'));
  if (saved === 'en') setLang('en');
})();
