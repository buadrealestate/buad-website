/* BUAD — «أنشطة المشروع» (user 2026-10-26, from «عناصر المشروع.pdf»): the activities of Al Jumum Interface (20 since 2026-11-23, = the approved masterplan).
   A large stage shows one activity (photo, phase, description, its other photos); the index beside it filters by kind.
   Visitors tick («أشّر») the activities they are interested in; the ticked ones gather in a bar that sends them with a
   leasing or investment request (requests.js prefills the form). The ticks are kept in this browser only (localStorage). */
(() => {
  'use strict';
  const root = document.getElementById('jacts');
  if (!root) return;
  const B = window.ASSET_BASE || '';
  const html = document.documentElement;
  const en = () => html.lang === 'en';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IMG = n => `${B}assets/img/acts/${n}.webp`, TH = n => `${B}assets/img/acts/${n}-t.webp`;

  // k: kind (retail · food & leisure · stay · business & services), ph: development phase, img: photos (first = cover)
  // 20 activities = the approved masterplan (2026-11-18): names, order and phases; ph 0 = project-wide service (user 2026-11-23)
  const A = [
    { id: 'station', k: 'biz', ph: 1, img: ['station-mp0', 'station-mp1', 'station-mp2'],
      ar: ['محطة وقود ومرافق خدمة', 'محطة متكاملة على طريق مكة - المدينة السريع تضم سوبرماركت ومحلات ومسجداً ومعارض تجارية وخدمات سيارات ومغسلة ومطاعم ومقهى ومواقف شاحنات واستراحة سائقين'],
      en: ['Fuel Station & Service Facilities', 'A complete station on the Makkah - Madinah Expressway with a supermarket, shops, a mosque, showrooms, car services, a car wash, restaurants, a café, truck parking and a drivers\u2019 rest area'] },
    { id: 'diwaniya', k: 'biz', ph: 1, img: ['diwaniya-mp0', 'diwaniya-mp1', 'diwaniya-mp2'],
      ar: ['إدارة وتشغيل المشروع', 'مقر إدارة المشروع وتشغيله وملاحق الإستقبال، بمجلس لإستقبال الزوار والضيوف بطابع محلي'],
      en: ['Project Administration & Operation', 'The project\u2019s management and operations headquarters with reception annexes and a majlis for visitors and guests'] },
    { id: 'farms', k: 'fun', ph: 1, img: ['farms-mp0', 'farms-mp1', 'farms-mp2'],
      ar: ['مساحات ترفيهية', 'منطقة فعاليات بطابع ريفي تضم مطاعم ومقاهي وأنشطة مجتمعية بين النخيل والمزروعات، مع مجالس ومسارات للعائلات والزوار'],
      en: ['Recreational Spaces', 'A rural-style events area with restaurants, cafés and community activities among palms and crops, with seating and trails for families and visitors'] },
    { id: 'warehouses', k: 'biz', ph: 1, img: ['warehouses-mp0', 'warehouses-mp1', 'warehouses-mp2'],
      ar: ['مخازن ذكية', 'حلول تخزين متطورة ودعم تشغيلي متكامل للمشروع وزواره، بجوار محطة الوقود ومرافق الخدمة'],
      en: ['Smart Warehouses', 'Advanced storage solutions and complete operational support, next to the fuel station and service facilities'] },
    { id: 'walk', k: 'fun', ph: 1, img: ['walk-mp0', 'walk-mp1', 'walk-mp2'],
      ar: ['ممشى واجهة الجموم', 'أجمل ممشى في واجهة الجموم: مسارات مظللة ومسار للجري وسط المساحات الخضراء، بإضاءة ليلية هادئة تجعله وجهة يومية للعائلات والرياضيين'],
      en: ['Al Jumum Walkway', 'The finest walkway in Al Jumum: shaded paths and a running track among green spaces, softly lit at night - a daily destination for families and athletes'] },
    { id: 'openmall', k: 'retail', ph: 2, img: ['openmall-mp0', 'openmall-mp1', 'openmall-mp2', 'openmall-mp3'],
      ar: ['معارض تجارية', 'معارض ومحلات تجارية في الهواء الطلق مع مساحات خضراء، ومول إقتصادي وصيدلية تلبي إحتياجات الزوار والسكان اليومية'],
      en: ['Commercial Showrooms', 'Open-air showrooms and shops with green spaces, a value mall and a pharmacy for the daily needs of visitors and residents'] },
    { id: 'popular', k: 'retail', ph: 2, img: ['popular-mp0', 'popular-mp1', 'popular-mp2'],
      ar: ['الأسواق الشعبية', 'محلات ومنتجات تراثية تعكس الطابع المحلي في أجواء السوق القديم'],
      en: ['Popular Markets', 'Shops and heritage products reflecting local character in an old-market atmosphere'] },
    { id: 'boulevard', k: 'fun', ph: 2, img: ['boulevard-mp0', 'boulevard-mp1', 'boulevard-mp2'],
      ar: ['مطاعم وكافيهات', 'مجموعة متنوعة من المطاعم والمقاهي في أجواء مفتوحة على الممرات المظللة'],
      en: ['Restaurants & Cafés', 'A varied range of restaurants and cafés in an open setting along shaded walkways'] },
    { id: 'banks', k: 'biz', ph: 2, img: ['banks-mp0'],
      ar: ['مجمع البنوك', 'خدمات مصرفية للزوار والسكان في مجمع واحد'],
      en: ['Banking Complex', 'Banking services for visitors and residents in one complex'] },
    { id: 'mosque', k: 'biz', ph: 2, img: ['mosque-mp0'],
      ar: ['المسجد', 'مسجدان يخدمان الزوار والمرتادين'],
      en: ['Mosques', 'Two mosques serving visitors and patrons'] },
    { id: 'hall', k: 'biz', ph: 3, img: ['hall-mp0', 'hall-mp1', 'hall-mp2'],
      ar: ['قاعة مناسبات', 'قاعة متكاملة للمناسبات والمؤتمرات والحفلات، بخدمات ضيافة راقية وتصميم يجمع الحجر والخشب والضوء'],
      en: ['Events Hall', 'A complete hall for occasions, conferences and celebrations, with fine hospitality and a design of stone, wood and light'] },
    { id: 'hanging', k: 'fun', ph: 3, img: ['hanging-mp0', 'hanging-mp1', 'hanging-mp2'],
      ar: ['المطاعم الشعبية المعلّقة', 'أطباق محلية أصيلة في أجواء بسيطة ومميزة بإطلالات مرتفعة على المشروع'],
      en: ['Hanging Popular Restaurants', 'Authentic local dishes in a simple, distinctive setting with elevated views over the project'] },
    { id: 'fun', k: 'fun', ph: 3, img: ['fun-mp0', 'fun-mp1', 'fun-mp2'],
      ar: ['مناطق ترفيهية', 'أنشطة ترفيهية متنوعة للعائلات: ألعاب مائية وحدائق لعب وممرات خضراء'],
      en: ['Entertainment Zones', 'Varied family entertainment: water games, play gardens and green walkways'] },
    { id: 'modern', k: 'retail', ph: 3, img: ['modern-mp0', 'modern-mp1', 'modern-mp2'],
      ar: ['أسواق حديثة', 'محلات تجزئة وماركات متنوعة للتسوق العصري'],
      en: ['Modern Markets', 'Retail stores and a range of brands for modern shopping'] },
    { id: 'visitors', k: 'stay', ph: 3, img: ['visitors-mp0', 'visitors-mp1', 'visitors-mp2'],
      ar: ['مركز زوار ومعتمرين', 'إقامة وخدمات متكاملة لراحة المعتمرين والزوار القادمين إلى مكة المكرمة'],
      en: ['Visitor & Umrah Centre', 'Accommodation and complete services for the comfort of Umrah pilgrims and visitors coming to Makkah'] },
    { id: 'medical', k: 'biz', ph: 0, img: ['medical-mp0'],
      ar: ['مراكز طبية', 'عيادات ورعاية صحية قريبة للزوار والسكان'],
      en: ['Medical Centres', 'Clinics and nearby healthcare for visitors and residents'] },
    { id: 'chalets', k: 'stay', ph: 4, img: ['chalets-mp0', 'chalets-mp1', 'chalets-mp2'],
      ar: ['شاليهات', 'وحدات إقامة مميزة توفر الخصوصية والراحة للزوار، بمسابح خاصة وسط الطبيعة'],
      en: ['Chalets', 'Distinctive stays offering privacy and comfort, with private pools amid nature'] },
    { id: 'resorts', k: 'stay', ph: 4, img: ['resorts-mp0', 'resorts-mp1', 'resorts-mp2'],
      ar: ['منتجعات', 'وجهة متكاملة للترفيه والإقامة وسط أجواء طبيعية مميزة'],
      en: ['Resorts', 'An integrated destination for leisure and stays in a distinctive natural setting'] },
    { id: 'motels', k: 'stay', ph: 4, img: ['motels-mp0', 'motels-mp1', 'motels-mp2'],
      ar: ['موتيلات', 'وحدات إقامة مريحة وخدمات أساسية للمسافرين على طريق مكة - المدينة السريع'],
      en: ['Motels', 'Comfortable stays and essential services for travellers on the Makkah - Madinah Expressway'] },
    { id: 'resid', k: 'stay', ph: 4, img: ['resid-mp0', 'resid-mp1', 'resid-mp2'],
      ar: ['مجمعات سكنية', 'وحدات سكنية راقية بحدائق خاصة توفر الخصوصية والراحة'],
      en: ['Residential Compounds', 'Fine homes with private gardens offering privacy and comfort'] },
  ];
  const KINDS = [['all', 'الكل', 'All'], ['retail', 'تسوق وتجارة', 'Retail'], ['fun', 'ترفيه ومطاعم', 'Leisure & dining'],
                 ['stay', 'إقامة وضيافة', 'Stay & hospitality'], ['biz', 'أعمال وخدمات', 'Business & services']];
  const PH = { ar: ['خدمات المشروع', 'المرحلة الأولى', 'المرحلة الثانية', 'المرحلة الثالثة', 'المرحلة الرابعة'], en: ['Project services', 'Phase One', 'Phase Two', 'Phase Three', 'Phase Four'] };
  const L = () => en()
    ? { pick: 'Add to my interests', picked: 'In your interests', n: c => `${c} ${c === 1 ? 'activity' : 'activities'} ticked`, lease: 'Leasing request', invest: 'Investment interest',
        clear: 'Clear', tick: 'Tick', hint: 'Tick the activities you are interested in', prev: 'Previous', next: 'Next', notes: 'Activities of interest: ' }
    : { pick: 'أشّر على النشاط', picked: 'ضمن إهتماماتك', n: c => c === 1 ? 'نشاط واحد مختار' : c === 2 ? 'نشاطان مختاران' : `${c} أنشطة مختارة`, lease: 'اطلب الإستئجار', invest: 'إهتمام إستثماري',
        clear: 'مسح', tick: 'أشّر', hint: 'أشّر على الأنشطة التي تهمك', prev: 'السابق', next: 'التالي', notes: 'الأنشطة المهتم بها: ' };
  const T = a => en() ? a.en : a.ar;
  const no = i => String(i + 1).padStart(2, '0');

  // ticks survive a reload in this browser only
  let picked = new Set();
  try { picked = new Set(JSON.parse(localStorage.getItem('jumumActs') || '[]').filter(id => A.some(a => a.id === id))); } catch (e) { /* storage blocked */ }
  const save = () => { try { localStorage.setItem('jumumActs', JSON.stringify([...picked])); } catch (e) { /* storage blocked */ } };
  window.jumumPicked = () => A.filter(a => picked.has(a.id)).map(a => T(a)[0]).join(en() ? ', ' : ' · ');

  root.innerHTML = `
    <div class="ja__stage" id="jaStage">
      <div class="ja__media"><img class="ja__img is-on" alt=""><img class="ja__img" alt=""></div>
      <div class="ja__shade" aria-hidden="true"></div>
      <span class="ja__count" aria-hidden="true"><b></b><i></i></span>
      <div class="ja__photos" role="group"></div>
      <div class="ja__info">
        <span class="ja__ph"></span>
        <h3 class="ja__t"></h3>
        <p class="ja__d"></p>
        <div class="ja__row">
          <button type="button" class="ja__pick"><i aria-hidden="true"></i><span></span></button>
          <span class="ja__nav"><button type="button" class="ja__prev"></button><button type="button" class="ja__next"></button></span>
        </div>
      </div>
      <i class="ja__bar" aria-hidden="true"><em></em></i>
    </div>
    <div class="ja__index">
      <div class="ja__kinds" role="tablist"></div>
      <p class="ja__hint"><i aria-hidden="true"></i><span></span></p>
      <ul class="ja__grid"></ul>
    </div>
    <div class="ja__tray" aria-live="polite">
      <span class="ja__faces"></span><b class="ja__n"></b>
      <button type="button" class="btn btn--light ja__go" data-rq="lease" data-rq-acts></button>
      <button type="button" class="btn btn--ghost ja__go" data-rq="invest" data-rq-acts></button>
      <button type="button" class="ja__clear"></button>
    </div>`;
  const $ = s => root.querySelector(s) || document.querySelector('.ja__tray ' + s);
  const stage = $('.ja__stage'), imgs = [...root.querySelectorAll('.ja__img')], grid = $('.ja__grid'), kinds = $('.ja__kinds'), tray = $('.ja__tray');
  document.body.appendChild(tray);   // the bar is fixed: keep it above the later sections
  let cur = 0, photo = 0, kind = 'all', layer = 0, timer = 0, auto = !reduce, inView = false;

  // two layers cross-fade; a token keeps a late load from an earlier pick out of the way
  let token = 0;
  function showPhoto(src) {
    if (imgs[layer].getAttribute('src') === src) return;
    const nxt = imgs[1 - layer], my = ++token;
    const swap = () => { if (my !== token || nxt.classList.contains('is-on')) return; nxt.classList.add('is-on'); imgs[layer].classList.remove('is-on'); layer = 1 - layer; };
    nxt.onload = swap;
    nxt.src = src;
    if (nxt.complete && nxt.naturalWidth) swap();
  }
  function paint() {
    const a = A[cur], t = T(a), l = L();
    stage.dataset.id = a.id;
    showPhoto(IMG(a.img[photo] || a.img[0]));
    $('.ja__count b').textContent = no(cur); $('.ja__count i').textContent = `/ ${A.length}`;
    $('.ja__ph').textContent = PH[en() ? 'en' : 'ar'][a.ph];
    const tt = $('.ja__t'), dd = $('.ja__d');
    tt.textContent = t[0]; dd.textContent = t[1];
    [tt, dd, $('.ja__ph')].forEach(el => { el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); });
    const on = picked.has(a.id);
    const pk = $('.ja__pick'); pk.classList.toggle('is-on', on); pk.setAttribute('aria-pressed', on); $('.ja__pick span').textContent = on ? l.picked : l.pick;
    $('.ja__photos').innerHTML = a.img.length > 1 ? a.img.map((n, i) => `<button type="button" class="${i === photo ? 'is-on' : ''}" data-ph="${i}" aria-label="${i + 1}"><img src="${TH(n)}" alt=""></button>`).join('') : '';
    grid.querySelectorAll('.ja__tile').forEach(li => li.classList.toggle('is-cur', li.dataset.id === a.id));
  }
  function tiles() {
    const l = L();
    grid.innerHTML = A.map((a, i) => `<li class="ja__tile${picked.has(a.id) ? ' is-picked' : ''}${kind !== 'all' && a.k !== kind ? ' is-out' : ''}" data-id="${a.id}" data-i="${i}" style="--k:${i}">
        <button type="button" class="ja__open" aria-label="${T(a)[0]}"><img src="${TH(a.img[0])}" alt="" loading="lazy"><span class="ja__no">${no(i)}</span><b>${T(a)[0]}</b></button>
        <button type="button" class="ja__tick" aria-pressed="${picked.has(a.id)}" aria-label="${l.tick} ${T(a)[0]}"><i aria-hidden="true"></i></button></li>`).join('');
    kinds.innerHTML = KINDS.map(([k, ar, e]) => `<button type="button" role="tab" aria-selected="${k === kind}" class="${k === kind ? 'is-on' : ''}" data-k="${k}">${en() ? e : ar}<em>${k === 'all' ? A.length : A.filter(a => a.k === k).length}</em></button>`).join('');
    $('.ja__hint span').textContent = l.hint;
    $('.ja__prev').setAttribute('aria-label', l.prev); $('.ja__next').setAttribute('aria-label', l.next);
    paint(); trayPaint();
  }
  function trayPaint() {
    const l = L(), c = picked.size;
    tray.classList.toggle('is-on', c > 0 && inView);
    $('.ja__n').textContent = l.n(c);
    $('.ja__faces').innerHTML = A.filter(a => picked.has(a.id)).slice(0, 4).map(a => `<img src="${TH(a.img[0])}" alt="">`).join('');
    const [g1, g2] = tray.querySelectorAll('.ja__go'); g1.textContent = l.lease; g2.textContent = l.invest;
    $('.ja__clear').textContent = l.clear;
    grid.querySelectorAll('.ja__tile').forEach(li => { const on = picked.has(li.dataset.id); li.classList.toggle('is-picked', on); li.querySelector('.ja__tick').setAttribute('aria-pressed', on); });
  }
  function go(i, user) {
    cur = (i + A.length) % A.length; photo = 0;
    if (user) stop();
    paint(); restartBar();
  }
  function toggle(id) {
    picked.has(id) ? picked.delete(id) : picked.add(id);
    save(); trayPaint(); if (A[cur].id === id) paint();
    const li = grid.querySelector(`[data-id="${id}"]`); if (li) { li.classList.remove('pop'); void li.offsetWidth; li.classList.add('pop'); }
  }
  // the stage plays through the activities (6 s each) until the visitor takes over
  function restartBar() { const bar = $('.ja__bar em'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = auto ? '' : 'none'; stage.classList.toggle('is-auto', auto); }
  function tick() { clearTimeout(timer); if (auto && inView) timer = setTimeout(() => { const vis = A.map((a, i) => i).filter(i => kind === 'all' || A[i].k === kind); go(vis[(vis.indexOf(cur) + 1) % vis.length]); tick(); }, 6000); }
  function stop() { auto = false; clearTimeout(timer); restartBar(); }

  grid.addEventListener('click', e => {
    const li = e.target.closest('.ja__tile'); if (!li) return;
    if (e.target.closest('.ja__tick')) toggle(li.dataset.id);
    else { go(+li.dataset.i, true); if (matchMedia('(max-width: 980px)').matches) { const r = stage.getBoundingClientRect(); if (r.top < 0) scrollBy({ top: r.top - 90, behavior: reduce ? 'auto' : 'smooth' }); } }
  });
  grid.addEventListener('pointerover', e => { const li = e.target.closest('.ja__tile'); if (li && e.pointerType === 'mouse' && +li.dataset.i !== cur) go(+li.dataset.i, true); });
  kinds.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    kind = b.dataset.k; tiles();
    const first = A.findIndex(a => kind === 'all' || a.k === kind); if (kind !== 'all' && A[cur].k !== kind) go(first, true);
  });
  $('.ja__pick').addEventListener('click', () => { stop(); toggle(A[cur].id); });
  $('.ja__prev').addEventListener('click', () => go(cur - 1, true));
  $('.ja__next').addEventListener('click', () => go(cur + 1, true));
  $('.ja__photos').addEventListener('click', e => { const b = e.target.closest('[data-ph]'); if (!b) return; stop(); photo = +b.dataset.ph; paint(); });
  $('.ja__clear').addEventListener('click', () => { picked.clear(); save(); trayPaint(); paint(); });
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(timer); stage.classList.add('is-held'); } });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { stage.classList.remove('is-held'); tick(); } });
  // swipe on the stage
  let x0 = null;
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(cur + ((dx > 0) === (html.dir === 'rtl') ? 1 : -1), true); });
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; root.classList.toggle('is-in', inView || root.classList.contains('is-in')); trayPaint(); inView ? tick() : clearTimeout(timer); }, { threshold: .2 }).observe(root);
  document.addEventListener('buad:lang', () => tiles());
  tiles(); restartBar();
})();
