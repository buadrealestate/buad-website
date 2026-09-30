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

  /* ------------------------------------------------------------ hero: day -> night film, driven by the time slider */
  // hero.mp4 = the Higgsfield time-lapse (day -> night), played forward; at the end the night view holds, then
  // dissolves back into the day poster and the film starts again. The slider scrubs the whole film.
  const mobile = innerWidth < 900;
  const portrait = innerHeight > innerWidth && innerWidth < 900;
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

  let heroVisible = true;
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (!heroVisible) video.pause(); else if (auto) video.play().catch(() => {});
  }).observe($('#hero'));
  function frame(now) {
    if (heroVisible && dur) {
      if (!auto && !dragging && now - userAt > 6000 && !reduce) {
        auto = true;
        if (video.currentTime >= dur - .05) restart(); else video.play().catch(() => {});
      }
      if (auto && video.classList.contains('is-on')) showTime(video.currentTime / dur);
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ loader */
  const bar = $('.loader__line i');
  const poster = $('#heroPoster');
  (async () => {
    const src = `assets/video/hero${portrait ? '-m' : ''}.mp4`;
    video.src = src;
    bar.style.width = '35%';
    const ready = new Promise(res => {
      video.addEventListener('loadeddata', res, { once: true });
      video.addEventListener('error', res, { once: true });
    });
    await Promise.race([ready, new Promise(r => setTimeout(r, 5000))]);
    bar.style.width = '100%';
    const start = () => {
      dur = video.duration || 0;
      video.classList.add('is-on');
      if (auto) video.play().catch(() => {});
    };
    if (video.readyState >= 1) start(); else video.addEventListener('loadedmetadata', start, { once: true });
    setTimeout(() => {
      $('#loader').classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      showTime(0);
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
    lastPhase = ''; showTime(T);
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
