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
  const filmSrc = () => `assets/video/hero${isPortrait() ? '-m' : ''}.mp4?v=b2`;   // b2: buildings around the project on every side (2026-10-28)
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
    if (!dur) { wantT = T; return; }   // applied once the film's metadata arrives (as a fraction until then)
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
  // phones (iOS above all) only load / seek a film after it has been started once inside a user gesture (user 2026-10-27: the
  // slider did nothing on the phone) — the first touch starts and pauses it so every seek after that shows the frame
  let unlocked = false;
  function unlock() {
    if (unlocked) return; unlocked = true;
    loadFilm(); video.muted = true;
    const pr = video.play(); if (pr && pr.then) pr.then(() => { if (!auto || dragging) video.pause(); }).catch(() => {});
  }
  track.addEventListener('touchstart', unlock, { passive: true });
  track.addEventListener('pointerdown', e => {
    unlock();
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
    video.preload = 'auto'; video.muted = true; video.src = filmSrc(); video.load();
    video.addEventListener('loadedmetadata', () => {
      dur = video.duration || 0;
      video.classList.add('is-on');
      if (wantT !== null) { seeking = true; video.currentTime = Math.min(wantT * dur, dur); wantT = null; }   // a drag made before the film was ready
      else if (auto && filmVisible) video.play().catch(() => {});
    }, { once: true });
    if (auto && filmVisible) video.play().catch(() => {});   // muted inline films may start before the metadata event (iOS)
  }
  const filmBox = $('[data-film]') || $('#jumumFilm');
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
  $$('.reveal, .split, .reveal-img').forEach(el => {
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

  /* ------------------------------------------------------------ six dimensions: an orbit (the strips below stay as ?dims=strips) */
  // The six dimensions sit on a slowly turning ring around the BUAD mark. One is lit at a time (every 6 s, or on
  // hover / tap); its text takes the place of the mark in the centre, its services appear under the ring.
  // Built from the strips' own markup, so the copy (and its translation) lives in one place.
  (() => {
    const sec = $('#dimensions');
    if (!sec || new URLSearchParams(location.search).get('dims') === 'strips') return;      // ?dims=strips shows the earlier strips design
    sec.classList.add('dorbit');
    const src = $$('.strip', sec).map(s => ({
      no: $('.strip__no', s).textContent,
      title: $('.strip__title', s).outerHTML.replace('strip__title', 'orb__title'),
      tag: ($('.dim__tag', s) || {}).outerHTML || '', desc: ($('.dim__desc', s) || {}).outerHTML || '',
      svc: ($('.dim__svc', s) || {}).outerHTML || '', who: ($('.dim__for', s) || {}).outerHTML || ''
    }));
    const n = src.length;
    const wrap = document.createElement('div');
    wrap.className = 'orb';
    wrap.innerHTML = `
      <div class="orb__stage">
        <svg class="orb__track" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49.6"/><circle class="orb__inner" cx="50" cy="50" r="36"/></svg>
        <i class="orb__arm" aria-hidden="true"></i>
        <div class="orb__core">
          <div class="orb__panel orb__panel--mark is-on"><img src="assets/img/logo-mark-sand.png" alt=""></div>
          ${src.map((d, i) => `<div class="orb__panel" data-k="${i}"><span class="orb__no">${d.no}</span>${d.title}${d.tag}${d.desc}</div>`).join('')}
        </div>
        ${src.map((d, i) => `<button type="button" class="orb__node" data-k="${i}" style="--a:${(360 / n) * i}deg"><i class="orb__dot"></i><span class="orb__label"><b>${d.no}</b>${d.title.replace(/<h3([^>]*)class="orb__title"/, '<span$1class="orb__name"').replace('</h3>', '</span>')}</span></button>`).join('')}
      </div>
      <div class="orb__more"><p class="orb__hint"><i aria-hidden="true"></i><span></span></p>${src.map((d, i) => `<div class="orb__extra" data-k="${i}">${d.desc.replace('dim__desc', 'dim__desc orb__desc')}${d.svc}${d.who}</div>`).join('')}</div>`;
    $('.dstrips__row', sec).after(wrap);
    const nodes = $$('.orb__node', wrap), panels = $$('.orb__panel[data-k]', wrap), extras = $$('.orb__extra', wrap);
    const mark = $('.orb__panel--mark', wrap), arm = $('.orb__arm', wrap), stage = $('.orb__stage', wrap);

    // the details under the ring (services + «لمن») open only on a click / tap on a dimension — not on hover or the timer
    // (user 2026-10-27); hovering or the 6-second play only lights the dimension and its text in the centre
    let spin = 0, active = -1, timer = 0, held = false, visible = false, last = performance.now(), pinned = false;
    function select(k) {
      active = k;
      nodes.forEach((b, i) => b.classList.toggle('is-active', i === k));
      panels.forEach((p, i) => p.classList.toggle('is-on', i === k));
      extras.forEach((p, i) => p.classList.toggle('is-on', i === k && pinned));
      wrap.classList.toggle('is-pinned', pinned);
      mark.classList.toggle('is-on', k < 0);
      wrap.classList.toggle('has-active', k >= 0);
    }
    const next = () => { clearTimeout(timer); if (!held && visible) timer = setTimeout(() => { select((active + 1) % n); next(); }, 6000); };
    // a click / tap pins the dimension (its details stay open, the ring stops) until it is tapped again or the visitor taps
    // elsewhere — user 2026-10-26: the details must open on a click too, not only on hover
    const more = $('.orb__more', wrap);
    const hint = () => { $('.orb__hint span', wrap).textContent = document.documentElement.lang === 'en' ? 'Click a dimension to see its services' : 'اضغط على البُعد لعرض خدماته وتفاصيله'; };
    hint(); document.addEventListener('buad:lang', hint);
    nodes.forEach((b, i) => {
      b.addEventListener('click', e => {
        if (pinned && active === i) { pinned = held = false; select(i); next(); return; }
        pinned = held = true; clearTimeout(timer); select(i);
        if (e.pointerType !== 'mouse') {                                   // touch: bring the details into view
          held = true; const r = more.getBoundingClientRect();
          if (r.bottom > innerHeight) scrollBy({ top: r.bottom - innerHeight + 24, behavior: reduce ? 'auto' : 'smooth' });
        }
      });
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !pinned) { held = true; clearTimeout(timer); select(i); } });
      b.addEventListener('focus', () => { if (!pinned) { held = true; clearTimeout(timer); select(i); } });
    });
    // the ring stops turning while the mouse is over it, so a dimension is easy to click (user 2026-10-26)
    stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { held = true; clearTimeout(timer); } });
    stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !pinned) { held = false; next(); } });
    stage.addEventListener('focusout', e => { if (!pinned && !stage.contains(e.relatedTarget)) { held = false; next(); } });
    document.addEventListener('click', e => { if (pinned && !wrap.contains(e.target)) { pinned = held = false; select(active); next(); } });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { sec.classList.add('is-in'); if (active < 0) setTimeout(() => { if (active < 0) select(0); next(); }, 1400); else next(); }
      else clearTimeout(timer);
    }, { threshold: .3 }).observe(wrap);
    // the ring turns slowly; it eases to a stop while a dimension is held, so the lit node is easy to read
    let speed = reduce ? 0 : 1;
    (function turn(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      speed += ((held || reduce ? 0 : 1) - speed) * Math.min(1, dt * 3);
      if (visible) spin = (spin + dt * 6 * speed) % 360;                 // 6° per second: a full turn a minute
      stage.style.setProperty('--spin', `${spin.toFixed(2)}deg`);
      nodes.forEach((b, i) => {                                         // labels sit on the outer side of the ring
        const up = Math.cos(((360 / n) * i + spin) * Math.PI / 180) > .2;
        if (b.classList.contains('is-top') !== up) b.classList.toggle('is-top', up);
      });
      if (active >= 0) arm.style.transform = `rotate(${((360 / n) * active + spin).toFixed(2)}deg)`;
      requestAnimationFrame(turn);
    })(last);
  })();

  /* ------------------------------------------------------------ six dimensions: six vertical strips, one opens at a time */
  // The strips rise in when the section arrives, then open one after another on a timer.
  const dimx = (() => {
    const sec = $('#dimensions');
    if (!sec || sec.classList.contains('dorbit')) return null;
    const strips = $$('.strip', sec);
    strips.forEach(s => {                                  // the open state shows the title large, a ghost number and a progress line
      const t = $('.strip__title', s), big = t.cloneNode(true);
      big.className = 'strip__big'; $('.strip__body', s).prepend(big);
      s.insertAdjacentHTML('beforeend', `<span class="strip__ghost" aria-hidden="true">${$('.strip__no', s).textContent}</span><i class="strip__bar" aria-hidden="true"></i>`);
    });
    new IntersectionObserver(([e]) => { if (e.isIntersecting) sec.classList.add('is-in'); }, { threshold: .15 }).observe(sec);
    // the strips play on their own while the section is on screen (no scroll needed);
    // hovering, tapping or focusing a strip opens it and pauses the play until the pointer leaves
    const DUR = 6000;
    let current = -1, timer = 0, visible = false, held = false;
    function open(k, timed) {
      current = k;
      strips.forEach((s, i) => { s.classList.toggle('is-active', i === k); s.classList.remove('is-timing'); });
      clearTimeout(timer);
      if (timed && !reduce) {
        requestAnimationFrame(() => requestAnimationFrame(() => strips[k].classList.add('is-timing')));
        timer = setTimeout(() => open((k + 1) % strips.length, true), DUR);
      }
    }
    const play = () => { if (visible && !held) open(current < 0 ? 0 : current, true); };
    const hold = k => { held = true; sec.classList.add('is-paused'); if (k !== current) open(k, false); else { clearTimeout(timer); strips[k].classList.remove('is-timing'); } };
    const release = () => { held = false; sec.classList.remove('is-paused'); play(); };
    sec.style.setProperty('--dur', `${DUR / 1000}s`);
    strips.forEach((s, i) => {
      s.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold(i); });
      s.addEventListener('click', () => hold(i));
      s.addEventListener('focus', () => hold(i));
      s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hold(i); } });
    });
    $('#strips').addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') release(); });
    $('#strips').addEventListener('focusout', e => { if (!e.relatedTarget || !sec.contains(e.relatedTarget)) release(); });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { if (current < 0) open(0, false); play(); } else { clearTimeout(timer); }
    }, { threshold: .35 }).observe(sec);
    if (reduce) strips.forEach(s => s.classList.add('is-active'));
    return null;
  })();

  /* ------------------------------------------------------------ marquee: duplicate row for a seamless loop */
  const row = $('.marquee__row');
  row.innerHTML += row.innerHTML;

  /* ------------------------------------------------------------ how we work: a gold line climbs the staircase with the scroll */
  (() => {
    const box = $('#stairs');
    if (!box) return;
    const svg = $('.stairs__line', box), path = $('#stairsPath'), items = $$('.stair', box);
    function build() {
      const b = box.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${b.width.toFixed(1)} ${b.height.toFixed(1)}`);
      const rtl = document.documentElement.dir === 'rtl';
      let d = '';
      items.forEach((it, i) => {
        const r = it.getBoundingClientRect();
        const x0 = (rtl ? r.right : r.left) - b.left, x1 = (rtl ? r.left : r.right) - b.left, y = r.top - b.top - 10;
        d += (i ? ` L${x0.toFixed(1)} ${y.toFixed(1)}` : `M${x0.toFixed(1)} ${y.toFixed(1)}`) + ` L${x1.toFixed(1)} ${y.toFixed(1)}`;
      });
      path.setAttribute('d', d);
      box.style.setProperty('--len', path.getTotalLength().toFixed(0));
      frame();
    }
    function frame() {
      const r = box.getBoundingClientRect(), vh = innerHeight;
      const k = reduce ? 1 : Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .2)));
      box.style.setProperty('--sp', k.toFixed(3));
      items.forEach((it, i) => it.classList.toggle('is-lit', k >= (i + .6) / items.length));
    }
    addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
    addEventListener('resize', build);
    document.addEventListener('buad:lang', () => setTimeout(build, 50));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    setTimeout(build, 300);
  })();

  /* ------------------------------------------------------------ intro: the mark draws itself behind the statement */
  (() => {
    const sec = $('#intro');
    if (!sec) return;
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { sec.classList.add('is-in'); o.disconnect(); } }, { threshold: .25 }).observe(sec);
  })();

  /* ------------------------------------------------------------ vision & mission: the diamond window opens, the vision lights up word by word */
  const mv = (() => {
    const sec = $('#vision');
    if (!sec) return null;
    const vision = $('#mvVision'), gem = $('#vmGem');
    const KEY = /المنظومة|المتكاملة|الأولى|first|integrated|ecosystem/i;     // the words that turn gold
    let words = [];
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { gem.classList.add('in'); o.disconnect(); } }, { threshold: .3 }).observe(gem);
    function splitWords() {
      vision.innerHTML = vision.textContent.trim().split(/\s+/)
        .map(w => `<span class="w${KEY.test(w) ? ' key' : ''}">${w}</span>`).join(' ');
      words = $$('.w', vision);
      frame();
    }
    function frame() {
      const vh = innerHeight, r = vision.getBoundingClientRect(), s = sec.getBoundingClientRect();
      if (s.bottom < 0 || s.top > vh) return;
      const k = reduce ? 1 : Math.min(1, Math.max(0, (vh * .88 - r.top) / (r.height + vh * .3)));
      const lit = Math.round(k * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
      if (!reduce) sec.style.setProperty('--vmr', `${((vh - s.top) / (vh + s.height) * 50 - 25).toFixed(2)}deg`);
    }
    splitWords();
    addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
    addEventListener('resize', frame);
    return { splitWords };
  })();

  /* ------------------------------------------------------------ values: a showcase (user 2026-10-26) — the list on one side, the chosen
     value shown large in the arch panel; it plays through the five while in view, a hover / tap / focus takes over */
  (() => {
    const list = $('#vxList'), show = $('#vxShow');
    if (!list || !show) return;
    const items = $$('.vx__item', list), dots = $$('.vx__dots i', show);
    let k = 0, timer = 0, visible = false, held = false;
    const pick = i => {
      k = i;
      items.forEach((it, j) => { it.classList.toggle('is-on', j === i); $('.vx__btn', it).setAttribute('aria-pressed', j === i); });
      dots.forEach((d, j) => d.classList.toggle('is-on', j === i));
      const it = items[i];
      $('.vx__big', show).textContent = String(i + 1).padStart(2, '0');
      $('.vx__halo i', show).innerHTML = $('.vx__ic', it).innerHTML;
      $('.vx__t', show).innerHTML = $('.vx__name', it).innerHTML;
      $('.vx__p', show).innerHTML = $('.vx__d', it).innerHTML;
      show.classList.remove('is-swap'); void show.offsetWidth; show.classList.add('is-swap');
      list.classList.remove('is-run'); void list.offsetWidth; if (visible && !held && !reduce) list.classList.add('is-run');
    };
    const run = () => { clearTimeout(timer); if (visible && !held && !reduce) timer = setTimeout(() => { pick((k + 1) % items.length); run(); }, 5000); };
    items.forEach((it, i) => {
      const b = $('.vx__btn', it);
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { held = true; clearTimeout(timer); pick(i); } });
      b.addEventListener('click', () => { held = false; pick(i); run(); });
      b.addEventListener('focus', () => { held = true; clearTimeout(timer); pick(i); });
      b.addEventListener('blur', () => { held = false; run(); });
    });
    list.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { held = false; pick(k); run(); } });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { pick(k); run(); } else clearTimeout(timer); }, { threshold: .35 }).observe(show);
    document.addEventListener('buad:lang', () => pick(k));
    pick(0);
  })();

  /* ------------------------------------------------------------ why buad: a soft light follows the pointer over each quadrant */
  $$('.wq__q').forEach(q => q.addEventListener('pointermove', e => {
    const r = q.getBoundingClientRect();
    q.style.setProperty('--mx', `${e.clientX - r.left}px`); q.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ------------------------------------------------------------ goals: a gold path through the five milestones, drawn as the page scrolls */
  (() => {
    const box = $('#gxStage');
    if (!box) return;
    const svg = $('.gx__path', box), line = $('#gxLine'), track = $('.gx__track', box), nodes = $$('.gx__node', box), goal = $('.gx__goal', box);
    function build() {
      const b = box.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${b.width.toFixed(1)} ${b.height.toFixed(1)}`);
      const pts = nodes.map(n => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top]; });
      if (goal && getComputedStyle(goal).display !== 'none') { const r = goal.getBoundingClientRect(); pts.push([r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top]); }
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
        d += ` C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
      line.setAttribute('d', d); track.setAttribute('d', d);
      box.style.setProperty('--len', line.getTotalLength().toFixed(0));
      frame();
    }
    function frame() {
      const r = box.getBoundingClientRect(), vh = innerHeight;
      const k = reduce ? 1 : Math.min(1, Math.max(0, (vh * .8 - r.top) / (r.height + vh * .1)));
      box.style.setProperty('--gp', k.toFixed(3));
      $$('.gx__m', box).forEach((m, i, all) => m.classList.toggle('is-lit', k >= (i + .5) / (all.length + 1)));
      if (goal) goal.classList.toggle('is-lit', k > .97);
    }
    addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
    addEventListener('resize', build);
    document.addEventListener('buad:lang', () => setTimeout(build, 60));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    setTimeout(build, 400);
  })();

  /* ------------------------------------------------------------ why buad: "many parties" vs "one party" diagram */
  (() => {
    const card = $('#whyHub');
    if (!card) return;
    const btns = $$('.hub__switch button', card);
    const set = one => { card.classList.toggle('is-one', one); btns.forEach(b => { b.classList.toggle('is-on', +b.dataset.hub === +one); b.setAttribute('aria-pressed', +b.dataset.hub === +one); }); };
    let touched = false;
    btns.forEach(b => b.addEventListener('click', () => { touched = true; set(b.dataset.hub === '1'); }));
    if (reduce) return set(true);
    set(false);                                   // start tangled, then untangle once the card is in view
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      setTimeout(() => { if (!touched) set(true); }, 1300);
    }, { threshold: .5 }).observe(card);
  })();

  /* ------------------------------------------------------------ scroll-linked motion */
  const progressBar = $('#progressBar');
  const decos = $$('[data-speed], [data-x]');
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
    if (mv) mv.splitWords();
    store.set('buad-lang', lang);
    document.dispatchEvent(new CustomEvent('buad:lang'));
  }
  $('#langBtn').addEventListener('click', () => setLang(html.lang === 'en' ? 'ar' : 'en'));
  const saved = store.get('buad-lang') || (new URLSearchParams(location.search).get('lang'));
  if (saved === 'en') setLang('en');

  /* ------------------------------------------------------------ contact form -> WhatsApp or e-mail (with inline validation) */
  const form = $('#contactForm'), msg = $('#formMsg'), needBox = $('#needBox');
  const syncTopic = () => { needBox.hidden = (form.querySelector('[name=topic]:checked') || {}).value !== 'services'; };
  form.addEventListener('change', e => { if (e.target.name === 'topic') syncTopic(); });
  syncTopic();
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
      msg.textContent = en ? EN['f.err'] : 'فضلاً اكتب الاسم ورقم التواصل أو رسالتك';
      return;
    }
    const chip = k => (form.querySelector(`[name=${k}]:checked + span`) || {}).textContent || '';
    const topic = chip('topic');
    const lines = [
      `${en ? 'Request' : 'نوع الطلب'}: ${topic}`,
      `${en ? 'Name' : 'الاسم'}: ${name}`,
      f.get('org') ? `${en ? 'Organization' : 'الجهة'}: ${f.get('org')}` : '',
      phone ? `${en ? 'Phone' : 'رقم التواصل'}: ${phone}` : '',
      f.get('email') ? `${en ? 'E-mail' : 'البريد'}: ${f.get('email')}` : '',
      needBox.hidden ? '' : `${en ? 'Dimension' : 'البُعد المطلوب'}: ${chip('need')}`,
      text ? '\n' + text : ''
    ].filter(Boolean).join('\n');
    const subject = (en ? 'BUAD website — ' : 'موقع بُعد — ') + topic;
    if ((e.submitter && e.submitter.dataset.send) === 'mail') {
      msg.textContent = en ? EN['f.ok'] : 'جارٍ فتح البريد الإلكتروني لإرسال رسالتك ';
      location.href = `mailto:info@buad-r.sa?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
    } else {
      msg.textContent = en ? 'Opening WhatsApp with your message…' : 'جارٍ فتح واتساب برسالتك ';
      window.open(`https://wa.me/966550000126?text=${encodeURIComponent(subject + '\n\n' + lines)}`, '_blank', 'noopener');
    }
  });

  /* ------------------------------------------------------------ current section in the navigation */
  const navMap = new Map($$('#navLinks a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
  const navObs = new IntersectionObserver(entries => entries.forEach(e => {
    const a = navMap.get(e.target.id);
    if (a && e.isIntersecting) { navMap.forEach(x => x.classList.remove('is-active')); a.classList.add('is-active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  navMap.forEach((a, id) => { const el = document.getElementById(id); if (el) navObs.observe(el); });
})();
