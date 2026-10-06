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

  /* ------------------------------------------------------------ six dimensions: six vertical strips, one opens at a time */
  // The strips rise in when the section arrives, then open one after another on a timer.
  const dimx = (() => {
    const sec = $('#dimensions');
    if (!sec) return null;
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
