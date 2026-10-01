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

  /* ------------------------------------------------------------ Al Jumum section: day -> night film + time slider */
  // hero.mp4 = the Higgsfield time-lapse (day -> night), played forward; at the end the night view holds, then
  // dissolves back into the day poster and the film starts again. The slider scrubs the whole film.
  // It lives in the Al Jumum section and only loads when the section comes near.
  const mobile = innerWidth < 900;
  // portrait phones get the portrait cut; everything else the full 16:9 film (re-checked on resize)
  const isPortrait = () => innerHeight > innerWidth * 1.15 && innerWidth < 820;
  const filmSrc = () => `assets/video/hero${isPortrait() ? '-m' : ''}.mp4`;
  const video = $('#heroVideo');
  const track = $('#dayTrack'), dot = $('#dayDot'), clock = $('#dayClock'), phaseEl = $('#dayPhase');
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  // the film = clip A (day -> sunset, first half) + clip B (dusk -> night, second half)
  const PHASES = [[0, 'النهار', 'Day'], [.25, 'العصر', 'Afternoon'], [.42, 'الغروب', 'Sunset'],
                  [.55, 'الشفق', 'Blue hour'], [.78, 'الليل', 'Night']];
  const clockAt = t => t < .5 ? 11 + 7 * (t / .5) : 18 + 3.5 * ((t - .5) / .5);
  let T = 0, lastPhase = '', dur = 0;              // dur = film duration (s)

  function showTime(t) {
    T = clamp(t);
    const hours = clockAt(T), hh = Math.floor(hours), mm = Math.floor((hours - hh) * 60);
    clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    dot.style.left = `${(T * 100).toFixed(2)}%`;
    track.setAttribute('aria-valuenow', Math.round(T * 100));
    let ph = PHASES[0];
    PHASES.forEach(p => { if (T >= p[0]) ph = p; });
    const name = ph[document.documentElement.lang === 'en' ? 2 : 1];
    if (name !== lastPhase) { lastPhase = name; phaseEl.textContent = name; }
  }
  const applyTime = showTime;                        // used by the language switch

  // scrubbing: seek to the requested time, never queue more than one seek at a time
  let wantT = null, seeking = false;
  function seek(t) {
    showTime(t);
    if (!dur) return;
    wantT = T * dur;
    if (!seeking) { seeking = true; video.currentTime = wantT; wantT = null; }
  }
  video.addEventListener('seeked', () => {
    seeking = false;
    if (wantT !== null) { seeking = true; video.currentTime = wantT; wantT = null; }
  });

  let dragging = false, userAt = 0, auto = !reduce;
  function setFromPointer(e) {
    const r = track.getBoundingClientRect();
    seek((e.clientX - r.left) / r.width);
  }
  track.addEventListener('pointerdown', e => {
    dragging = true; auto = false; video.pause(); track.classList.add('is-drag');
    video.classList.add('is-on'); clearTimeout(loopTimer);
    track.setPointerCapture(e.pointerId); setFromPointer(e);
  });
  track.addEventListener('pointermove', e => { if (dragging) setFromPointer(e); });
  const release = () => { if (!dragging) return; dragging = false; track.classList.remove('is-drag'); userAt = performance.now(); };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('keydown', e => {
    const k = { ArrowRight: .04, ArrowUp: .04, ArrowLeft: -.04, ArrowDown: -.04 }[e.key];
    if (k) { e.preventDefault(); auto = false; video.pause(); userAt = performance.now(); seek(T + k); }
  });

  // end of the film: hold the night, dissolve into the day poster, start again
  let loopTimer = 0;
  function restart() {
    video.classList.remove('is-on');                  // fades to the day poster underneath (CSS transition)
    loopTimer = setTimeout(() => {
      video.currentTime = 0; showTime(0);
      video.play().catch(() => {});
      setTimeout(() => video.classList.add('is-on'), 120);
    }, 1400);
  }
  video.addEventListener('ended', () => { if (auto) loopTimer = setTimeout(restart, 2200); });

  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const bw = brandSrc();
      if (brand.currentSrc && !brand.currentSrc.endsWith(bw)) { brand.src = bw; if (!reduce) brand.play().catch(() => {}); }
      const want = filmSrc();
      if (!video.currentSrc || video.currentSrc.endsWith(want)) return;
      const t = video.currentTime, playing = !video.paused;
      video.src = want;
      video.addEventListener('loadedmetadata', () => {
        dur = video.duration || dur; video.currentTime = t;
        if (playing) video.play().catch(() => {});
      }, { once: true });
    }, 250);
  });

  let filmVisible = false, filmLoaded = false;
  function loadFilm() {
    if (filmLoaded) return; filmLoaded = true;
    video.preload = 'auto'; video.src = filmSrc();
    video.addEventListener('loadedmetadata', () => {
      dur = video.duration || 0;
      video.classList.add('is-on');
      if (auto && filmVisible) video.play().catch(() => {});
    }, { once: true });
  }
  const filmBox = $('#jumumFilm');
  new IntersectionObserver(([e]) => { if (e.isIntersecting) loadFilm(); }, { rootMargin: '900px 0px' }).observe(filmBox);
  new IntersectionObserver(([e]) => {
    filmVisible = e.isIntersecting;
    if (!filmVisible) video.pause(); else if (auto && dur) video.play().catch(() => {});
  }, { threshold: .25 }).observe(filmBox);
  function frame(now) {
    if (filmVisible && dur) {
      if (!auto && !dragging && now - userAt > 6000 && !reduce) {
        auto = true;
        if (video.currentTime >= dur - .05) restart(); else video.play().catch(() => {});
      }
      if (auto && video.classList.contains('is-on')) showTime(video.currentTime / dur);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ hero: looping brand film */
  const brand = $('#brandVideo');
  const brandSrc = () => 'assets/video/brand.mp4';         // one 16:9 film; portrait phones show it fitted (CSS)
  const brandFit = $('#brandVideoFit');
  function syncFit() {                                   // the fitted copy on portrait phones follows the main film
    if (!isPortrait()) { brandFit.pause(); return; }
    if (!brandFit.src) { brandFit.src = brand.currentSrc || brandSrc(); }
    if (Math.abs(brandFit.currentTime - brand.currentTime) > .2) brandFit.currentTime = brand.currentTime;
    if (!reduce) brandFit.play().catch(() => {});
  }
  brand.addEventListener('playing', syncFit);
  addEventListener('resize', syncFit);

  /* ------------------------------------------------------------ opening sequence */
  // first visit in a session: the full intro (~2.7 s); later page views in the same session: a short one
  let seen = false;
  try { seen = sessionStorage.getItem('buad-intro') === '1'; sessionStorage.setItem('buad-intro', '1'); } catch (e) { /* private mode */ }
  if (seen) document.documentElement.classList.add('intro-seen');
  const introMin = reduce ? 300 : (seen ? 700 : 2700);
  const t0intro = performance.now();
  (async () => {
    brand.src = brandSrc();
    const ready = new Promise(res => {
      brand.addEventListener('loadeddata', res, { once: true });
      brand.addEventListener('error', res, { once: true });
    });
    await Promise.race([ready, new Promise(r => setTimeout(r, 5000))]);
    brand.classList.add('is-on');
    if (!reduce) brand.play().catch(() => {});
    const wait = Math.max(0, introMin - (performance.now() - t0intro));
    setTimeout(() => {
      $('#loader').classList.add('is-done');
      document.body.classList.remove('is-loading');
      setTimeout(() => document.body.classList.add('is-ready'), 250);
      showTime(0);
      requestAnimationFrame(frame);
    }, wait);
  })();
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!reduce) brand.play().catch(() => {}); } else brand.pause();
  }).observe($('#hero'));

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

  /* ------------------------------------------------------------ six dimensions: the logo opens into its six bars */
  // Scroll drives one timeline p = 0..1 through the tall section:
  //   0 – .12   the mark turns into place, title below it
  //   .12 – .22 the camera moves onto the six bars, which step apart
  //   .22 – .88 each bar in turn unfolds into the card of one dimension, then folds back
  //   .88 – 1   the bars close up, the mark returns to the centre and the motto appears
  const dimx = (() => {
    const sec = $('#dimensions');
    if (!sec) return null;
    if (reduce) { sec.classList.add('dimx--static'); return null; }
    const logo = $('#dxLogo'), body = $('#dxBody'), bars = $$('.lgbar'), cards = $$('.dcard');
    const head = $('#dxHead'), motto = $('#dxMotto'), navEl = $('#dxNav'), navBtns = $$('#dxNav button'), pin = $('.dimx__pin');
    const U = 135;                                     // logo box in SVG units (viewBox ≈ 135 × 135)
    const BAR_C = [[22.79, 76.19], [27.78, 81.17], [32.77, 86.16], [37.75, 91.12], [42.75, 96.1], [47.57, 100.92]];
    const BAR_LEN = 19.7, BAR_T = 3.3;                 // bar size in SVG units; bars run at -45°
    const FOCUS = [35.2, 88.6];                        // middle of the six bars
    const T0 = .22, SLOT = .11;
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;
    const mix = (c1, c2, t) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], t))).join(',')})`;
    const TAN = [185, 153, 121], CREAM = [246, 238, 226];
    let sizes = [];
    function measure() {
      const vw = innerWidth, mob = vw < 900;
      const cw = mob ? vw - 32 : Math.min(580, vw * .42);
      cards.forEach(c => c.style.setProperty('--cw', `${cw}px`));
      sizes = cards.map(c => [c.offsetWidth, c.offsetHeight]);
    }
    navBtns.forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k, r = sec.getBoundingClientRect();
      const total = sec.offsetHeight - innerHeight;
      scrollTo({ top: scrollY + r.top + total * (T0 + SLOT * (k + .5)), behavior: 'smooth' });
    }));

    function frame() {
      const vw = innerWidth, vh = innerHeight, mob = vw < 900, rtl = document.documentElement.dir === 'rtl';
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp(-r.top / (sec.offsetHeight - vh));

      // camera: the whole mark in the centre (intro / outro) <-> close on the bars at one side (the six acts)
      const big = Math.min(vw, vh) * .5 / U;
      const side = mob ? { x: vw * .5, y: vh * .19, s: Math.min(vw * .85, vh * .32) / 62 }
                       : { x: rtl ? vw * .25 : vw * .75, y: vh * .5, s: Math.min(vw * .4, vh * .8) / 62 };
      const a = ease(clamp(p / .12)), z = ease(clamp((p - .12) / .1)), o = ease(clamp((p - .88) / .1));
      const k = z * (1 - o);                           // 0 = whole mark centred, 1 = close on the bars
      const rot = lerp(-150, 0, a) + o * 360;          // turns into place, then one full turn as it closes
      const fx = lerp(U / 2, FOCUS[0], k), fy = lerp(U / 2, FOCUS[1], k);
      const sx = lerp(vw / 2, side.x, k), sy = lerp(vh * (mob ? .38 : .4), side.y, k);
      const s = lerp(big * lerp(.7, 1, a) * (1 - o * .25), side.s, k);
      const rr = rot * Math.PI / 180;                  // rotation about the focus point (the centre at the outro)
      const cr = Math.cos(rr), sr = Math.sin(rr);
      const tx = sx - s * (fx * cr - fy * sr), ty = sy - s * (fx * sr + fy * cr);
      logo.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      body.style.opacity = (1 - k * .72).toFixed(3);
      pin.style.setProperty('--gx', `${(sx / vw * 100).toFixed(1)}%`);
      pin.style.setProperty('--gy', `${(sy / vh * 100).toFixed(1)}%`);

      // the bars step apart along their stack and out from the mark; each one unfolds into its card
      let active = -1;
      bars.forEach((bar, i) => {
        const st = T0 + i * SLOT;
        const m = ease(clamp((p - st) / (SLOT * .38))) * (1 - ease(clamp((p - (st + SLOT * .82)) / (SLOT * .18))));
        if (p >= st && p < st + SLOT) active = i;
        const d = (i - 2.5) * 2.6 * k, out = 5 * k + m * 3;
        const dx = (d - out) * .7071, dy = (d + out) * .7071;
        bar.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
        bar.style.opacity = (1 - m * .75).toFixed(3);
        bar.classList.toggle('is-on', i === active && k > .5);

        const card = cards[i];
        if (m <= .001) { card.classList.remove('is-live'); return; }
        card.classList.add('is-live');
        const [W, H] = sizes[i];
        const bx = BAR_C[i][0] + dx, by = BAR_C[i][1] + dy;           // bar centre in SVG units
        const bsx = tx + s * (bx * cr - by * sr), bsy = ty + s * (bx * sr + by * cr);
        const cx = mob ? vw / 2 : (rtl ? vw * .7 : vw * .3);
        const cy = mob ? Math.min(vh - 64 - H / 2, Math.max(vh * .36 + H / 2, vh * .62)) : vh / 2;
        const X = lerp(bsx, cx, m), Y = lerp(bsy, cy, m);
        const w = lerp(BAR_LEN * s, W, m), h = lerp(BAR_T * s, H, m);
        const ang = lerp(-45 + rot, 0, m);
        card.style.transform = `translate3d(${(X - W / 2).toFixed(1)}px, ${(Y - H / 2).toFixed(1)}px, 0) rotate(${ang.toFixed(2)}deg) scale(${(w / W).toFixed(4)}, ${(h / H).toFixed(4)})`;
        card.style.background = mix(TAN, CREAM, clamp(m * 1.4));
        card.firstElementChild.style.opacity = clamp((m - .6) / .4).toFixed(3);
      });
      navBtns.forEach((b, i) => b.classList.toggle('is-active', i === active));
      navEl.classList.toggle('is-on', p > T0 - .02 && p < .9);
      const h0 = clamp((p - .06) / .07);
      head.style.opacity = (1 - h0).toFixed(3);
      head.style.transform = `translate3d(0, ${(-h0 * 40).toFixed(1)}px, 0)`;
      head.style.visibility = p > .14 ? 'hidden' : 'visible';
      motto.style.opacity = clamp((p - .93) / .05).toFixed(3);
    }
    measure();
    addEventListener('resize', () => { measure(); frame(); });
    addEventListener('load', () => { measure(); frame(); });
    return { frame, measure };
  })();

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

  /* ------------------------------------------------------------ scroll-linked motion */
  const progressBar = $('#progressBar');
  const decos = $$('[data-speed], [data-x]');
  const bandRows = $$('[data-band]');
  const heroBrand = $('#heroBrand');
  let mTick = false;
  function motionFrame() {
    mTick = false;
    const vh = innerHeight, y = scrollY;
    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
    if (reduce) return;
    if (dimx) dimx.frame();
    decos.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const k = (r.top + r.height / 2 - vh / 2) / vh;        // -1 .. 1 while the section crosses the screen
      const ty = (+el.dataset.speed || 0) * k * 260;
      const tx = (+el.dataset.x || 0) * k * 2.4;
      const rot = 45 + k * 22;
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg)`;
    });
    bandRows.forEach(row => {
      const r = row.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = (vh - r.top) / (vh + r.height);              // 0 .. 1 while the band crosses the screen
      const dir = +row.dataset.band;
      const span = row.scrollWidth - row.parentElement.clientWidth;
      const tx = dir > 0 ? -span * (.15 + k * .55) : -span * (.7 - k * .55);
      row.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
      // words are brightest at the centre of the screen and fade towards the edges
      const cx = innerWidth / 2;
      row.querySelectorAll('span').forEach(sp => {
        const b = sp.getBoundingClientRect();
        const d = Math.min(1, Math.abs(b.left + b.width / 2 - cx) / (innerWidth * .5));
        sp.style.setProperty('--o', (1 - d * .78).toFixed(3));
      });
    });
    if (heroBrand && y < vh * 1.2) {
      const k = Math.min(y / vh, 1);
      heroBrand.style.transform = `translate3d(0, ${(-k * 90).toFixed(1)}px, 0)`;
      heroBrand.style.opacity = (1 - k * 1.4).toFixed(3);
    }
  }
  addEventListener('scroll', () => { if (!mTick) { mTick = true; requestAnimationFrame(motionFrame); } }, { passive: true });
  addEventListener('resize', motionFrame);
  motionFrame();

  /* ------------------------------------------------------------ tactile hovers (fine pointers only) */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    // a warm light follows the cursor across cards
    $$('.value, .cred, .project, .model, .cta__grid article, .phases__list li').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    // buttons lean gently towards the cursor
    $$('.btn, .lang, .gbtn').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.setProperty('--tx', `${(dx * 8).toFixed(1)}px`);
        btn.style.setProperty('--ty', `${(dy * 6).toFixed(1)}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
    });
  }

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
    lastPhase = ''; showTime(T);
    if (dimx) { dimx.measure(); dimx.frame(); }
    store.set('buad-lang', lang);
  }
  $('#langBtn').addEventListener('click', () => setLang(html.lang === 'en' ? 'ar' : 'en'));
  const saved = store.get('buad-lang') || (new URLSearchParams(location.search).get('lang'));
  if (saved === 'en') setLang('en');

  /* ------------------------------------------------------------ contact form -> e-mail (with inline validation) */
  const form = $('#contactForm'), msg = $('#formMsg');
  form.addEventListener('input', e => { e.target.classList.remove('is-invalid'); msg.classList.remove('is-err'); msg.textContent = ''; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const en = html.lang === 'en';
    const name = (f.get('name') || '').trim(), phone = (f.get('phone') || '').trim(), text = (f.get('msg') || '').trim();
    if (!name || (!phone && !text)) {
      if (!name) form.elements.name.classList.add('is-invalid');
      if (!phone && !text) { form.elements.phone.classList.add('is-invalid'); form.elements.msg.classList.add('is-invalid'); }
      msg.classList.add('is-err');
      msg.textContent = en ? EN['f.err'] : 'فضلاً اكتب الاسم ورقم التواصل أو رسالتك.';
      return;
    }
    const lines = [
      `${en ? 'Name' : 'الاسم'}: ${name}`,
      `${en ? 'Organization' : 'الجهة'}: ${f.get('org') || ''}`,
      `${en ? 'Phone' : 'رقم التواصل'}: ${phone}`,
      `${en ? 'Interest' : 'البُعد المطلوب'}: ${f.get('need') || ''}`,
      '', text
    ];
    msg.textContent = en ? EN['f.ok'] : 'جارٍ فتح البريد الإلكتروني لإرسال رسالتك…';
    const subject = en ? 'Inquiry from the BUAD website' : 'استفسار من موقع بُعد';
    location.href = `mailto:info@buad-r.sa?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join(String.fromCharCode(10)))}`;
  });

  /* ------------------------------------------------------------ current section in the navigation */
  const navMap = new Map($$('#navLinks a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
  const navObs = new IntersectionObserver(entries => entries.forEach(e => {
    const a = navMap.get(e.target.id);
    if (a && e.isIntersecting) { navMap.forEach(x => x.classList.remove('is-active')); a.classList.add('is-active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  navMap.forEach((a, id) => { const el = document.getElementById(id); if (el) navObs.observe(el); });
})();
