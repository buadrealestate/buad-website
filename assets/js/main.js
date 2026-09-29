/* BUAD website — interactions (no dependencies) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  document.body.classList.add('is-loading');
  $('#year').textContent = new Date().getFullYear();

  /* ------------------------------------------------------------ hero: day -> night time-lapse */
  const frames = $$('.hero__frame');
  const mobile = innerWidth < 900;
  // clock time (hours) and phase name shown for each frame
  const PHASES = [
    { t: 10.0, ar: 'النهار', en: 'Day' },
    { t: 15.5, ar: 'العصر', en: 'Afternoon' },
    { t: 17.25, ar: 'الأصيل', en: 'Golden hour' },
    { t: 18.1, ar: 'الغروب', en: 'Sunset' },
    { t: 18.6, ar: 'الشفق', en: 'Blue hour' },
    { t: 21.0, ar: 'الليل', en: 'Night' }
  ];
  const HOLD = 2.6, FADE = 2.4, STEP = HOLD + FADE, N = frames.length, CYCLE = N * STEP;
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const dot = $('#dayDot'), clock = $('#dayClock'), phaseEl = $('#dayPhase');

  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(src); i.src = src; });
  const srcOf = el => `assets/img/${el.dataset.src}${mobile ? '-m' : ''}.webp`;

  const loaded = frames.map(() => false);
  let t0 = null, prev = null, lastPhase = -1;
  function paint(now) {
    if (t0 === null) t0 = now;
    // never fade towards a frame that has not finished loading: hold the clock instead
    const probe = ((now - t0) / 1000) % CYCLE, pi = Math.floor(probe / STEP);
    if (prev !== null && probe - pi * STEP > HOLD && !loaded[(pi + 1) % N]) t0 += now - prev;
    prev = now;
    const tc = ((now - t0) / 1000) % CYCLE;
    const i = Math.floor(tc / STEP), local = tc - i * STEP, next = (i + 1) % N;
    const p = local < HOLD ? 0 : ease((local - HOLD) / FADE);
    frames.forEach((f, k) => {
      let o = 0, z = 0;
      if (k === i) { o = 1; z = 1; }
      if (k === next && p > 0) { o = p; z = 2; }
      // slow push-in over the time each frame is on screen
      const start = k * STEP - FADE;
      let life = (tc - start) / (STEP + FADE);
      if (life < 0) life += CYCLE / (STEP + FADE);
      const s = 1.12 - .09 * Math.min(Math.max(life, 0), 1);
      f.style.opacity = o; f.style.zIndex = z;
      f.style.transform = `scale(${s.toFixed(4)})`;
    });
    // day bar
    const a = PHASES[i], b = PHASES[next];
    const wrapBack = next === 0;
    const hours = wrapBack ? a.t + (24 + b.t - a.t) * p : a.t + (b.t - a.t) * p;
    const h = hours % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const pos = wrapBack ? (1 - p) : (i + p) / (N - 1);
    dot.style.left = `${(pos * 100).toFixed(2)}%`;
    const ph = p > .5 ? next : i;
    if (ph !== lastPhase) { lastPhase = ph; phaseEl.textContent = PHASES[ph][document.documentElement.lang === 'en' ? 'en' : 'ar']; }
    if (!reduce) requestAnimationFrame(paint);
  }

  /* ------------------------------------------------------------ loader */
  const bar = $('.loader__line i');
  (async () => {
    const first = [0, 1].map(k => loadImg(srcOf(frames[k])).then(() => { loaded[k] = true; }));
    let done = 0;
    first.forEach(pr => pr.then(() => { done++; bar.style.width = `${40 + done * 30}%`; }));
    await Promise.race([Promise.all(first), new Promise(r => setTimeout(r, 4500))]);
    frames.forEach((f, k) => {
      f.style.backgroundImage = `url(${srcOf(f)})`;
      if (k > 1) loadImg(srcOf(f)).then(() => { loaded[k] = true; });
    });
    bar.style.width = '100%';
    setTimeout(() => {
      $('#loader').classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      frames[0].style.opacity = 1;
      requestAnimationFrame(paint);
    }, 450);
  })();

  /* ------------------------------------------------------------ header */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > innerHeight * .75);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#burger').addEventListener('click', () => nav.classList.toggle('is-open'));
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

  /* ------------------------------------------------------------ word split for big statements */
  function split(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, k) => `<span class="w" style="transition-delay:${k * 70}ms">${w}</span>`).join(' ');
  }
  $$('.split').forEach(split);

  /* ------------------------------------------------------------ reveal on scroll + counters */
  const fmt = (n, sep) => sep ? n.toLocaleString('en-US') : String(n);
  function count(el) {
    const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', sep = !!el.dataset.sep;
    if (reduce) { el.textContent = pre + fmt(end, sep) + suf; return; }
    const dur = 1600, t = performance.now();
    const step = now => {
      const k = Math.min((now - t) / dur, 1), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      el.textContent = pre + fmt(v, sep) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    $$('[data-count]', el).forEach(count);
    if (el.matches('[data-count]')) count(el);
    io.unobserve(el);
  }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  // stagger siblings
  $$('.reveal, .split').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const k = sib.indexOf(el);
    if (k > 0 && !el.style.transitionDelay) el.style.transitionDelay = `${Math.min(k, 6) * 90}ms`;
    io.observe(el);
  });

  /* ------------------------------------------------------------ parallax images */
  const px = $$('.parallax img');
  let ticking = false;
  function parallax() {
    const vh = innerHeight;
    px.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
      img.style.transform = `translate3d(0, ${(-8 - k * 16).toFixed(2)}%, 0)`;
    });
    ticking = false;
  }
  if (!reduce) {
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    parallax();
  }

  /* ------------------------------------------------------------ six dimensions */
  const dimItems = $$('#dimsList li'), dimPanels = $$('.dim');
  let dimTimer = null, dimIdx = 0;
  function showDim(k) {
    dimIdx = k;
    dimItems.forEach((li, j) => li.classList.toggle('is-active', j === k));
    dimPanels.forEach((d, j) => d.classList.toggle('is-active', j === k));
  }
  dimItems.forEach((li, k) => {
    li.addEventListener('click', () => { showDim(k); clearInterval(dimTimer); });
    li.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) { showDim(k); clearInterval(dimTimer); } });
  });
  new IntersectionObserver(([e]) => {
    clearInterval(dimTimer);
    if (e.isIntersecting && !reduce) dimTimer = setInterval(() => showDim((dimIdx + 1) % dimItems.length), 5200);
  }, { threshold: .4 }).observe($('.dims__grid'));

  /* ------------------------------------------------------------ gallery: buttons + drag */
  const track = $('#gallery');
  $$('.gbtn').forEach(b => b.addEventListener('click', () => {
    const rtl = document.documentElement.dir === 'rtl';
    const d = +b.dataset.dir * (rtl ? -1 : 1);
    track.scrollBy({ left: d * track.clientWidth * .6, behavior: 'smooth' });
  }));
  let down = false, sx = 0, sl = 0, moved = false;
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); }
    track.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => { down = false; track.classList.remove('is-drag'); });
  track.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);

  /* ------------------------------------------------------------ marquee: duplicate row for a seamless loop */
  const row = $('.marquee__row');
  row.innerHTML += row.innerHTML;

  /* ------------------------------------------------------------ language */
  const EN = window.BUAD_EN || {};
  const html = document.documentElement;
  const nodes = $$('[data-i18n]');
  const arTitle = document.title;
  function setLang(lang) {
    const en = lang === 'en';
    nodes.forEach(el => {
      if (el.dataset.ar === undefined) el.dataset.ar = el.innerHTML;
      const v = en ? EN[el.dataset.i18n] : el.dataset.ar;
      if (v !== undefined) el.innerHTML = v;
      if (el.classList.contains('split')) { split(el); if (el.classList.contains('in')) el.classList.add('in'); }
    });
    html.lang = en ? 'en' : 'ar';
    html.dir = en ? 'ltr' : 'rtl';
    document.title = en ? EN['meta.title'] : arTitle;
    $('#langBtn').textContent = en ? 'ع' : 'EN';
    lastPhase = -1;
    store.set('buad-lang', lang);
  }
  $('#langBtn').addEventListener('click', () => setLang(html.lang === 'en' ? 'ar' : 'en'));
  const saved = store.get('buad-lang') || (new URLSearchParams(location.search).get('lang'));
  if (saved === 'en') setLang('en');

  /* ------------------------------------------------------------ contact form -> e-mail */
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const en = html.lang === 'en';
    const lines = [
      `${en ? 'Name' : 'الاسم'}: ${f.get('name') || ''}`,
      `${en ? 'Organization' : 'الجهة'}: ${f.get('org') || ''}`,
      `${en ? 'Phone' : 'رقم التواصل'}: ${f.get('phone') || ''}`,
      `${en ? 'Interest' : 'البُعد المطلوب'}: ${f.get('need') || ''}`,
      '', f.get('msg') || ''
    ];
    const subject = en ? 'Inquiry from the BUAD website' : 'استفسار من موقع بُعد';
    location.href = `mailto:info@buad-r.sa?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  });
})();
