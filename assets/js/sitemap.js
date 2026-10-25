/* BUAD — the project location, shown cinematically (user 2026-10-25).
   [data-sitemap] opens a full-screen view: the satellite map flies in like a drone (tilted, zoomed, moving), settles over the site,
   the project frontage is drawn in gold, a pin drops and a card appears with the Google Maps link and the two kroki documents
   (allocation kroki + marking kroki — shown once the images are added to KROKI below). */
(() => {
  'use strict';
  const MAPS = 'https://maps.app.goo.gl/xBKahBZcByVDwckx6';
  const KROKI = [   // { src: 'assets/img/jumum/kroki-allocation.webp', ar: 'كروكي التخصيص', en: 'Allocation kroki' }, …
  ];
  // the site outline on the day render (1200 × 669 frame of assets/img/hero/h1-day.webp), traced by hand (user 2026-10-25: cinematic, not a Google map)
  const SITE = 'M212 178 L262 128 L330 112 L395 104 L470 128 L560 150 L660 170 L745 178 L785 215 L800 290 L835 360 L880 450 L900 515 L800 535 L700 555 L625 565 L565 540 L500 480 L430 430 L360 370 L300 320 L255 260 Z';
  const en = () => document.documentElement.lang === 'en';
  const T = () => en()
    ? { kicker: 'Project location', title: 'Al Jumum Interface', sub: 'The northern entrance of Makkah · on the Madinah Expressway', open: 'Open in Google Maps', replay: 'Replay', close: 'Close' }
    : { kicker: 'موقع المشروع', title: 'واجهة الجموم', sub: 'مدخل مكة المكرمة الشمالي · على طريق المدينة المنورة السريع', open: 'افتح في قوقل ماب', replay: 'إعادة العرض', close: 'إغلاق' };

  const dlg = document.createElement('dialog');
  dlg.className = 'smap';
  document.body.appendChild(dlg);

  function render() {
    const L = T(), B = window.ASSET_BASE || '';   // '../' on pages in a sub-folder (smartface/)
    const docs = KROKI.map(k => `<a class="smap__doc" href="${B}${k.src}" target="_blank" rel="noopener"><img src="${B}${k.src}" alt=""><span>${en() ? k.en : k.ar}</span></a>`).join('');
    dlg.innerHTML = `
      <div class="smap__stage">
        <div class="smap__drift"><div class="smap__cam">
          <img class="smap__img" src="${B}assets/img/hero/h1-day.webp" alt="">
          <svg class="smap__svg" viewBox="0 0 1200 669" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><mask id="smapHole"><rect width="1200" height="669" fill="#fff"/><path d="${SITE}" fill="#000"/></mask></defs>
            <rect class="smap__dim" width="1200" height="669" mask="url(#smapHole)"/>
            <path class="smap__glow" d="${SITE}"/><path class="smap__line" d="${SITE}" pathLength="1"/>
            <g class="smap__pin" transform="translate(590 330)"><circle r="26" class="smap__pulse"/><path d="M0 0 C-11 -16 -16 -24 -16 -32 A16 16 0 0 1 16 -32 C16 -24 11 -16 0 0Z"/><circle cy="-32" r="6" class="smap__dot"/></g>
          </svg>
        </div></div>
        <div class="smap__fog smap__fog--a"></div><div class="smap__fog smap__fog--b"></div><div class="smap__sweep"></div>
        <div class="smap__vignette"></div>
      </div>
      <div class="smap__card">
        <p class="smap__kicker"><i aria-hidden="true"></i>${L.kicker}</p>
        <h2 class="smap__title">${L.title}</h2>
        <p class="smap__sub">${L.sub}</p>
        ${docs ? `<div class="smap__docs">${docs}</div>` : ''}
        <div class="smap__actions">
          <a class="btn btn--light btn--ico" href="${MAPS}" target="_blank" rel="noopener"><span>${L.open}</span><i class="btn__ico" aria-hidden="true"></i></a>
          <button type="button" class="btn btn--ghost smap__replay">${L.replay}</button>
        </div>
      </div>
      <button type="button" class="smap__x" aria-label="${L.close}"></button>`;
    dlg.querySelector('.smap__x').addEventListener('click', () => dlg.close());
    dlg.querySelector('.smap__replay').addEventListener('click', play);
  }
  function play() {
    dlg.classList.remove('is-play'); void dlg.offsetWidth; dlg.classList.add('is-play');
  }
  function open() {
    render(); dlg.showModal(); document.documentElement.classList.add('rq-open');
    requestAnimationFrame(play);
  }
  dlg.addEventListener('close', () => { dlg.classList.remove('is-play'); document.documentElement.classList.remove('rq-open'); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-sitemap]');
    if (!b) return;
    e.preventDefault(); open();
  });
})();
