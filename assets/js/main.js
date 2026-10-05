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

  /* ------------------------------------------------------------ six dimensions: a camera journey into the mark */
  // One scroll timeline p = 0..1 through the tall section (eased, so the camera moves with weight):
  //   0 – .12    the whole mark turns into place above the title
  //   .12 – .22  the camera dives in: the mark turns 45° and grows until its six bars stand like pillars
  //   .22 – .88  six stops, one per bar; between stops the camera glides to the next pillar and the colour moves on
  //   .88 – 1    the camera pulls back to the whole mark, now dark on sand, and the motto appears
  const dimx = (() => {
    const sec = $('#dimensions');
    if (!sec) return null;
    if (reduce) { sec.classList.add('dimx--static'); return null; }
    const logo = $('#dxLogo'), bars = $$('.lgbar'), cards = $$('.dcard'), num = $('#dxNum');
    const head = $('#dxHead'), motto = $('#dxMotto'), navEl = $('#dxNav'), navBtns = $$('#dxNav button');
    const BAR_C = [[22.79, 76.19], [27.78, 81.17], [32.77, 86.16], [37.75, 91.12], [42.75, 96.1], [47.57, 100.92]];
    const BAR_LEN = 19.7;                             // length of a bar in SVG units
    const A0 = .12, S0 = .22, SLOT = .11, OUT = S0 + 6 * SLOT;
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const lerp = (a, b, t) => a + (b - a) * t;

    // the colour of each moment: background · ink · mark body · bars · lit bar  (dark espresso → light sand)
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const STOPS = [
      ['#221813', '#f6eee2', '#b99979', '#b99979', '#f6dcb4'],   // intro: sand mark on espresso
      ['#2b1f19', '#f6eee2', '#3a2b23', '#8f7058', '#f6dcb4'],   // 01
      ['#41302a', '#f6eee2', '#4d3a31', '#a08066', '#f8e2bf'],   // 02
      ['#6e5342', '#f6eee2', '#7a5f4d', '#b39377', '#fbe9cf'],   // 03
      ['#a3846a', '#2b1f19', '#ad8f76', '#755946', '#2b1f19'],   // 04
      ['#c8ad8d', '#2b1f19', '#d1b898', '#957659', '#2b1f19'],   // 05
      ['#e6d0b1', '#2b1f19', '#ddc4a2', '#ad8d70', '#2b1f19'],   // 06
      ['#edd8ba', '#2b1f19', '#3d2d24', '#3d2d24', '#3d2d24']    // outro: espresso mark on sand
    ].map(s => s.map(rgb));
    const KEYS = ['--dx-bg', '--dx-ink', '--dx-body', '--dx-bar', '--dx-hi'];
    function colours(a, b, t) {
      const m = STOPS[a].map((c, j) => c.map((v, q) => Math.round(lerp(v, STOPS[b][j][q], t))));
      KEYS.forEach((k, j) => sec.style.setProperty(k, `rgb(${m[j].join(',')})`));
      sec.style.setProperty('--dx-line', `rgba(${m[1].join(',')}, .2)`);
      const L = (m[1][0] * .3 + m[1][1] * .59 + m[1][2] * .11) / 255;   // ink brightness: light ink = dark stage
      sec.style.setProperty('--dx-glow', `rgba(255, 242, 222, ${lerp(.6, .16, L).toFixed(3)})`);
      sec.style.setProperty('--dx-halo', `rgba(${m[4].join(',')}, ${clamp((L - .4) / .4).toFixed(3)})`);   // glow only on dark stages
    }

    // camera poses: which logo point sits where on screen, at what scale and turn
    const whole = (vw, vh, mob) => ({ f: [67.5, 67.5], x: vw / 2, y: vh * (mob ? .36 : .4), s: Math.min(vw * .78, vh * .5) / 135, r: 0 });
    const close = (i, vw, vh, mob, rtl) => ({ f: BAR_C[i], x: mob ? vw * .5 : vw * (rtl ? .27 : .73), y: vh * (mob ? .27 : .5),
      s: (mob ? Math.min(vh * .34, vw * .9) : vh * .66) / BAR_LEN, r: -45 });
    const mix = (a, b, t) => ({ f: [lerp(a.f[0], b.f[0], t), lerp(a.f[1], b.f[1], t)], x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t),
      s: a.s * Math.pow(b.s / a.s, t), r: lerp(a.r, b.r, t) });
    let proj = () => [0, 0];
    function place(c) {
      const rr = c.r * Math.PI / 180, co = Math.cos(rr), si = Math.sin(rr);
      const tx = c.x - c.s * (c.f[0] * co - c.f[1] * si), ty = c.y - c.s * (c.f[0] * si + c.f[1] * co);
      logo.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${c.r.toFixed(3)}deg) scale(${c.s.toFixed(4)})`;
      proj = q => [tx + c.s * (q[0] * co - q[1] * si), ty + c.s * (q[0] * si + q[1] * co)];
    }

    navBtns.forEach(b => b.addEventListener('click', () => {
      const r = sec.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top + (sec.offsetHeight - innerHeight) * (S0 + SLOT * (+b.dataset.k + .35)), behavior: 'smooth' });
    }));

    let P = -1, shown = -1, last = 0, running = false;
    function render(p) {
      const vw = innerWidth, vh = innerHeight, mob = vw < 900, rtl = document.documentElement.dir === 'rtl';
      let cam, active = -1, settle = 0, k = 0, drift = 0;
      if (p < A0) {                                            // the mark turns into place
        const a = easeOut(clamp(p / A0)), w = whole(vw, vh, mob);
        w.s *= lerp(.82, 1, a); w.r = lerp(-28, 0, a);
        cam = w; colours(0, 0, 0);
      } else if (p < S0) {                                     // dive in
        const a = ease((p - A0) / (S0 - A0));
        cam = mix(whole(vw, vh, mob), close(0, vw, vh, mob, rtl), a); colours(0, 1, a); k = a;
      } else if (p < OUT) {                                    // six stops
        const f = (p - S0) / SLOT, i = Math.min(5, Math.floor(f)), sl = f - i;
        k = 1;
        if (sl < .7 || i === 5) {
          cam = close(i, vw, vh, mob, rtl); active = i; drift = sl;
          settle = clamp(sl / .1) * (i === 5 ? 1 : 1 - clamp((sl - .62) / .08));
          cam.f = [cam.f[0] + (sl - .35) * 1.2, cam.f[1] + (sl - .35) * 1.2];   // the slow push along the pillars
          colours(i + 1, i + 1, 0);
        } else {
          const a = ease((sl - .7) / .3);
          cam = mix(close(i, vw, vh, mob, rtl), close(i + 1, vw, vh, mob, rtl), a);
          cam.f = [cam.f[0] + lerp(.42, -.42, a), cam.f[1] + lerp(.42, -.42, a)];
          colours(i + 1, i + 2, a);
        }
      } else {                                                 // pull back to the whole mark
        const a = ease(clamp((p - OUT) / (1 - OUT)));
        cam = mix(close(5, vw, vh, mob, rtl), whole(vw, vh, mob), a); colours(6, 7, a); k = 1 - a;
      }
      place(cam);

      bars.forEach((b, i) => b.classList.toggle('is-on', i === active && settle > .25));
      sec.classList.toggle('is-close', k > .5);
      const g = active >= 0 ? proj(BAR_C[active]) : proj([67.5, 67.5]);
      sec.style.setProperty('--gx', `${(g[0] / vw * 100).toFixed(1)}%`);
      sec.style.setProperty('--gy', `${(g[1] / vh * 100).toFixed(1)}%`);
      if (active >= 0) num.textContent = `0${active + 1}`;
      num.style.opacity = (settle * .9).toFixed(3);
      num.style.transform = `translate3d(${((drift - .35) * (rtl ? 70 : -70)).toFixed(1)}px, -50%, 0)`;

      const want = active >= 0 && settle > .8 ? active : -1;
      if (want !== shown) { cards.forEach((c, i) => c.classList.toggle('is-show', i === want)); shown = want; }
      navBtns.forEach((b, i) => b.classList.toggle('is-active', i === active));
      navEl.classList.toggle('is-on', p > S0 - .02 && p < OUT + .02);
      const h0 = clamp((p - .06) / .06);
      head.style.opacity = (1 - h0).toFixed(3);
      head.style.transform = `translate3d(0, ${(-h0 * 30).toFixed(1)}px, 0)`;
      head.style.visibility = p > .13 ? 'hidden' : 'visible';
      motto.style.opacity = clamp((p - (OUT + .07)) / .04).toFixed(3);
    }
    const target = () => { const r = sec.getBoundingClientRect(); return clamp(-r.top / (sec.offsetHeight - innerHeight)); };
    // a soft follow: the scene eases towards the scroll position, frame-rate independent
    function loop(now) {
      const t = target(), dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
      P = P < 0 ? t : lerp(P, t, 1 - Math.pow(.002, dt));
      render(P);
      if (Math.abs(P - t) > .0002) requestAnimationFrame(loop); else running = false;
    }
    function frame() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
    function measure() { P = -1; frame(); }
    addEventListener('resize', measure);
    measure();
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
