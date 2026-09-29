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

  /* ------------------------------------------------------------ hero: interactive day -> night */
  // One camera, four renders (day, afternoon, dusk, blue hour) + three lights layers added on top.
  // t in [0,1] drives everything: which render shows, how many lights are on, how the traffic looks.
  const mobile = innerWidth < 900;
  const layers = $$('#stage .hl');
  const [L_AFT, L_DUSK, L_BLUE, L_1, L_2, L_3] = layers.slice(1);
  const track = $('#dayTrack'), dot = $('#dayDot'), clock = $('#dayClock'), phaseEl = $('#dayPhase');
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const PHASES = [[0, 'النهار', 'Day'], [.3, 'العصر', 'Afternoon'], [.47, 'الغروب', 'Sunset'],
                  [.62, 'الشفق', 'Blue hour'], [.8, 'الليل', 'Night']];
  const srcOf = el => `assets/img/hero/${el.dataset.src}${mobile ? '-m' : ''}.webp`;
  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(src); i.src = src; });

  const retry = img => img.addEventListener('error', () => {           // one quiet retry on a flaky network
    if (img.dataset.retried) return; img.dataset.retried = 1; setTimeout(() => { img.src = img.src + '?r=1'; }, 800);
  });

  let T = 0, lightsOn = 0, lastPhase = '';
  function applyTime(t) {
    T = clamp(t);
    L_AFT.style.opacity = smooth(.12, .32, T);
    L_DUSK.style.opacity = smooth(.34, .52, T);
    L_BLUE.style.opacity = smooth(.52, .7, T);
    lightsOn = smooth(.58, .82, T);
    L_1.style.opacity = smooth(.58, .74, T);
    L_2.style.opacity = smooth(.66, .84, T);
    L_3.style.opacity = smooth(.76, .95, T);
    const hours = 9 + 12.75 * T, hh = Math.floor(hours), mm = Math.floor((hours - hh) * 60);
    clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    dot.style.left = `${(T * 100).toFixed(2)}%`;
    track.setAttribute('aria-valuenow', Math.round(T * 100));
    let ph = PHASES[0];
    PHASES.forEach(p => { if (T >= p[0]) ph = p; });
    const name = ph[document.documentElement.lang === 'en' ? 2 : 1];
    if (name !== lastPhase) { lastPhase = name; phaseEl.textContent = name; }
  }

  // autoplay: slow ping-pong day -> night -> day; pauses while the user holds the slider
  const PERIOD = 36;                       // seconds for a full day -> night -> day
  let auto = !reduce, userAt = 0, phase0 = 0, dragging = false;
  const pingpong = s => (1 - Math.cos(2 * Math.PI * s / PERIOD)) / 2;
  function resumeFrom(t) {                 // continue the autoplay from the current position
    const s = Math.acos(1 - 2 * clamp(t)) * PERIOD / (2 * Math.PI);
    phase0 = performance.now() / 1000 - s;
  }

  function setFromPointer(e) {
    const r = track.getBoundingClientRect();
    applyTime((e.clientX - r.left) / r.width);
  }
  track.addEventListener('pointerdown', e => {
    dragging = true; auto = false; track.classList.add('is-drag');
    track.setPointerCapture(e.pointerId); setFromPointer(e);
  });
  track.addEventListener('pointermove', e => { if (dragging) setFromPointer(e); });
  const release = () => { if (!dragging) return; dragging = false; track.classList.remove('is-drag'); userAt = performance.now(); };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('keydown', e => {
    const k = { ArrowRight: .04, ArrowUp: .04, ArrowLeft: -.04, ArrowDown: -.04 }[e.key];
    if (k) { e.preventDefault(); auto = false; userAt = performance.now(); applyTime(T + k); }
  });

  /* traffic on the highways: cars by day, headlights and tail-lights at night */
  const cv = $('#traffic'), ctx = cv.getContext('2d');
  const FW = 1600, FH = 892.7;              // frame the road coordinates are expressed in
  const roads = Object.entries(window.BUAD_ROADS || {}).map(([name, pts]) => {
    const seg = []; let len = 0;
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], l = Math.hypot(x1 - x0, y1 - y0);
      seg.push({ x0, y0, dx: (x1 - x0) / l, dy: (y1 - y0) / l, l, at: len }); len += l;
    }
    return { seg, len, reverse: /_2$/.test(name), dense: name === 'link' ? .45 : 1 };
  });
  function pointAt(r, d) {
    let s = r.seg[r.seg.length - 1];
    for (const q of r.seg) if (d <= q.at + q.l) { s = q; break; }
    const k = d - s.at;
    return [s.x0 + s.dx * k, s.y0 + s.dy * k, s.dx, s.dy];
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const COLORS = ['#f4f1ea', '#e9e6df', '#cfd2d4', '#2d2f33', '#8d9196', '#b7b2a6', '#7a2a24', '#28415e'];
  const cars = [];
  roads.forEach(r => {
    const n = Math.round(r.len / 34 * r.dense);
    for (let k = 0; k < n; k++) {
      cars.push({ r, d: rnd(0, r.len), v: rnd(26, 46), c: COLORS[(Math.random() * COLORS.length) | 0], big: Math.random() < .12 });
    }
  });
  let scale = 1, ox = 0, oy = 0, dpr = 1;
  function fit() {
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    scale = Math.max(w / FW, h / FH); ox = (w - FW * scale) / 2; oy = (h - FH * scale) / 2;
  }
  addEventListener('resize', fit);

  function drawTraffic(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    const night = lightsOn, day = 1 - smooth(.5, .72, T);
    for (const car of cars) {
      car.d += car.v * dt;
      if (car.d > car.r.len) car.d -= car.r.len;
      const dd = car.r.reverse ? car.r.len - car.d : car.d;
      let [x, y, dx, dy] = pointAt(car.r, dd);
      if (car.r.reverse) { dx = -dx; dy = -dy; }
      const L = car.big ? 6.5 : 3.6, W = car.big ? 2.2 : 1.8;
      if (day > .02) {                                   // the car body
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = .92 * day + .25 * (1 - day);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-L / 2 + .5, -W / 2 + .7, L, W);
        ctx.fillStyle = car.c; ctx.fillRect(-L / 2, -W / 2, L, W);
        ctx.restore();
      }
      if (night > .02) {                                 // head- and tail-lights, additive glow
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        const hx = x + dx * (L / 2 + 3), hy = y + dy * (L / 2 + 3), tx = x - dx * L / 2, ty = y - dy * L / 2;
        let g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 4.2);
        g.addColorStop(0, `rgba(255,248,226,${.95 * night})`); g.addColorStop(.35, `rgba(255,232,190,${.45 * night})`);
        g.addColorStop(1, 'rgba(255,225,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 4.2, 0, 7); ctx.fill();
        g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 2.3);
        g.addColorStop(0, `rgba(255,70,50,${.95 * night})`); g.addColorStop(1, 'rgba(255,40,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 2.3, 0, 7); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  let prevNow = null, heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe($('#hero'));
  function frame(now) {
    const dt = prevNow === null ? 0 : Math.min((now - prevNow) / 1000, .05);
    prevNow = now;
    if (heroVisible) {
      if (!auto && !dragging && now - userAt > 6000 && !reduce) { auto = true; resumeFrom(T); }
      if (auto) applyTime(pingpong(now / 1000 - phase0));
      drawTraffic(reduce ? 0 : dt);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ loader */
  const bar = $('.loader__line i');
  (async () => {
    const first = loadImg(srcOf(layers[0]));
    bar.style.width = '45%';
    await Promise.race([first, new Promise(r => setTimeout(r, 4500))]);
    layers.forEach(retry);
    layers[0].src = srcOf(layers[0]);
    bar.style.width = '100%';
    layers.slice(1).forEach(l => { l.src = srcOf(l); });      // the rest streams in behind the loader
    setTimeout(() => {
      $('#loader').classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      fit(); applyTime(0); resumeFrom(0);
      requestAnimationFrame(frame);
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
  const gTrack = $('#gallery');
  $$('.gbtn').forEach(b => b.addEventListener('click', () => {
    const rtl = document.documentElement.dir === 'rtl';
    const d = +b.dataset.dir * (rtl ? -1 : 1);
    gTrack.scrollBy({ left: d * gTrack.clientWidth * .6, behavior: 'smooth' });
  }));
  let down = false, sx = 0, sl = 0, moved = false;
  gTrack.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = gTrack.scrollLeft; });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 4) { moved = true; gTrack.classList.add('is-drag'); }
    gTrack.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => { down = false; gTrack.classList.remove('is-drag'); });
  gTrack.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);

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
    lastPhase = ''; applyTime(T);
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
