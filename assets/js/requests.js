/* BUAD — requests from visitors (home page + jumum.html):
   [data-rq="invest"]  request the Phase One investment memorandum
   [data-rq="lease"]   leasing for brands and operators ([data-rq-zone] prefills the zone shown on the masterplan card)
   The site is static, so a request is sent as a ready-made WhatsApp message to BUAD (e-mail as a fallback).
   Nothing is stored. Return figures are deliberately not shown publicly; they are in the memorandum sent on request. */
(() => {
  'use strict';
  const WA = '966550000126', MAIL = 'info@buad-r.sa';
  const en = () => document.documentElement.lang === 'en';
  const T = {
    ar: {
      invest: { kicker: 'فرص الإستثمار', title: 'اطلب الملف الإستثماري', lead: 'الملف الإستثماري للمرحلة الأولى من مشروع واجهة الجموم متاح للمستثمرين المهتمين اترك بياناتك ويتواصل معك فريق علاقات المستثمرين' },
      lease: { kicker: 'فرص التأجير والتشغيل', title: 'فرص التأجير للعلامات التجارية', lead: 'للعلامات التجارية والمشغّلين الراغبين في موقع ضمن مراحل المشروع: مطاعم أسواق محلات ترفيه خدمات وغيرها' },
      name: 'الاسم', phone: 'رقم الجوال', email: 'البريد الإلكتروني (اختياري)', org: 'الجهة / الشركة (اختياري)',
      type: 'صفة المستثمر', types: ['فرد', 'شركة', 'صندوق أو جهة إستثمارية', 'وسيط'],
      size: 'حجم المساهمة المتوقعة (اختياري)', sizes: ['أقل من 500 ألف', '500 ألف – 2 مليون', '2 – 10 ملايين', 'أكثر من 10 ملايين'],
      brand: 'اسم العلامة التجارية / الشركة', activity: 'النشاط', zone: 'المنطقة المطلوبة (اختياري)', area: 'المساحة التقريبية بالمتر المربع (اختياري)',
      contact: 'اسم المسؤول', notes: 'ملاحظات (اختياري)',
      send: 'إرسال الطلب عبر واتساب', note: 'يُفتح واتساب برسالة جاهزة إلى فريق بُعد ولا نحفظ بياناتك في الموقع',
      err: 'فضلاً أكمل الحقول المطلوبة', okTitle: 'جهّزنا طلبك', okText: 'أكمل الإرسال في واتساب وسيتواصل معك فريقنا قريبًا', okMail: 'أو أرسله بالبريد الإلكتروني', close: 'إغلاق',
      msgInvest: 'طلب الملف الإستثماري — مشروع واجهة الجموم', msgLease: 'طلب تأجير — مشروع واجهة الجموم'
    },
    en: {
      invest: { kicker: 'Investment Opportunities', title: 'Request the Investment Memorandum', lead: 'The Phase One investment memorandum of Al Jumum Interface is available to interested investors. Leave your details and our investor relations team will contact you.' },
      lease: { kicker: 'Leasing & Operations', title: 'Leasing for Brands', lead: 'For brands and operators looking for a space within the project’s phases: restaurants, markets, retail, entertainment, services and more.' },
      name: 'Name', phone: 'Mobile number', email: 'E-mail (optional)', org: 'Organization (optional)',
      type: 'Investor type', types: ['Individual', 'Company', 'Fund or investment entity', 'Broker'],
      size: 'Expected contribution (optional)', sizes: ['Under SAR 500K', 'SAR 500K – 2M', 'SAR 2 – 10M', 'Over SAR 10M'],
      brand: 'Brand / company name', activity: 'Activity', zone: 'Preferred zone (optional)', area: 'Approximate area in m² (optional)',
      contact: 'Contact person', notes: 'Notes (optional)',
      send: 'Send the request on WhatsApp', note: 'WhatsApp opens with a ready message to the BUAD team; nothing is stored on this site.',
      err: 'Please complete the required fields.', okTitle: 'Your request is ready', okText: 'Finish sending it on WhatsApp and our team will contact you shortly.', okMail: 'Or send it by e-mail', close: 'Close',
      msgInvest: 'Investment memorandum request — Al Jumum Interface', msgLease: 'Leasing request — Al Jumum Interface'
    }
  };

  const dlg = document.createElement('dialog');
  dlg.className = 'rq';
  dlg.setAttribute('aria-labelledby', 'rqTitle');
  document.body.appendChild(dlg);

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const field = (name, label, opts = {}) => `<label class="fl${opts.full ? ' full' : ''}">${opts.area
    ? `<textarea name="${name}" rows="3" placeholder=" "></textarea>`
    : `<input name="${name}" placeholder=" "${opts.req ? ' required' : ''}${opts.type ? ` type="${opts.type}"` : ''}${opts.dir ? ` dir="${opts.dir}"` : ''}${opts.mode ? ` inputmode="${opts.mode}"` : ''}${opts.ac ? ` autocomplete="${opts.ac}"` : ''} value="${esc(opts.value || '')}">`}<span>${label}</span></label>`;
  const chips = (name, legend, list, first) => `<fieldset class="needs full"><legend>${legend}</legend>${list.map((t, i) =>
    `<label class="need"><input type="radio" name="${name}" value="${esc(t)}"${first && i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>`;

  let mode = 'invest';
  function render(zone) {
    const L = T[en() ? 'en' : 'ar'], M = L[mode];
    const body = mode === 'invest'
      ? field('name', L.name, { req: true, ac: 'name' }) + field('phone', L.phone, { req: true, dir: 'ltr', mode: 'tel', ac: 'tel' }) +
        field('email', L.email, { type: 'email', dir: 'ltr', ac: 'email' }) + field('org', L.org, { ac: 'organization' }) +
        chips('type', L.type, L.types, true) + chips('size', L.size, L.sizes, false) + field('notes', L.notes, { area: true, full: true })
      : field('brand', L.brand, { req: true, ac: 'organization' }) + field('activity', L.activity, { req: true }) +
        field('zone', L.zone, { value: zone || '' }) + field('area', L.area, { dir: 'ltr', mode: 'numeric' }) +
        field('contact', L.contact, { req: true, ac: 'name' }) + field('phone', L.phone, { req: true, dir: 'ltr', mode: 'tel', ac: 'tel' }) +
        field('notes', L.notes, { area: true, full: true });
    dlg.innerHTML = `
      <div class="rq__panel">
        <button type="button" class="rq__x" aria-label="${L.close}"></button>
        <div class="rq__form-wrap">
          <p class="rq__kicker"><i aria-hidden="true"></i>${M.kicker}</p>
          <h2 class="rq__title" id="rqTitle">${M.title}</h2>
          <p class="rq__lead">${M.lead}</p>
          <form class="rq__form" novalidate>${body}
            <p class="form__msg full" role="status" aria-live="polite"></p>
            <button class="btn btn--dark btn--ico full" type="submit"><span>${L.send}</span><i class="btn__ico" aria-hidden="true"></i></button>
            <p class="rq__note full">${L.note}</p>
          </form>
        </div>
        <div class="rq__ok" hidden>
          <span class="rq__check" aria-hidden="true"></span>
          <h2 class="rq__title">${L.okTitle}</h2>
          <p class="rq__lead">${L.okText}</p>
          <a class="rq__mail" href="#">${L.okMail}</a>
          <button type="button" class="btn btn--dark rq__done">${L.close}</button>
        </div>
      </div>`;
    const form = dlg.querySelector('form');
    form.addEventListener('input', e => { e.target.classList.remove('is-invalid'); form.querySelector('.form__msg').textContent = ''; });
    form.addEventListener('submit', e => { e.preventDefault(); submit(form, L); });
    dlg.querySelector('.rq__x').addEventListener('click', () => dlg.close());
    dlg.querySelector('.rq__done').addEventListener('click', () => dlg.close());
  }

  function submit(form, L) {
    const f = new FormData(form);
    const get = k => (f.get(k) || '').toString().trim();
    const missing = [...form.querySelectorAll('[required]')].filter(i => !i.value.trim());
    missing.forEach(i => i.classList.add('is-invalid'));
    const msg = form.querySelector('.form__msg');
    if (missing.length) { msg.classList.add('is-err'); msg.textContent = L.err; missing[0].focus(); return; }
    const lab = k => {
      const el = form.querySelector(`[name="${k}"]`), fs = el && el.closest('fieldset');
      const t = fs ? fs.querySelector('legend').textContent : el?.closest('label')?.querySelector('span')?.textContent;
      return (t || k).replace(/\s*\((اختياري|optional)\)\s*/, '');
    };
    const keys = mode === 'invest' ? ['name', 'phone', 'email', 'org', 'type', 'size', 'notes'] : ['brand', 'activity', 'zone', 'area', 'contact', 'phone', 'notes'];
    const lines = [mode === 'invest' ? L.msgInvest : L.msgLease, ''].concat(keys.filter(get).map(k => `${lab(k)}: ${get(k)}`));
    const text = lines.join('\n');
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    const ok = dlg.querySelector('.rq__ok');
    ok.querySelector('.rq__mail').href = `mailto:${MAIL}?subject=${encodeURIComponent(lines[0])}&body=${encodeURIComponent(text)}`;
    dlg.querySelector('.rq__form-wrap').hidden = true;
    ok.hidden = false;
  }

  function open(m, zone) {
    mode = m === 'lease' ? 'lease' : 'invest';
    render(zone);
    dlg.showModal();
    document.documentElement.classList.add('rq-open');
    setTimeout(() => dlg.querySelector('input')?.focus(), 60);
  }
  dlg.addEventListener('close', () => document.documentElement.classList.remove('rq-open'));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });       // click on the backdrop

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rq]');
    if (!b) return;
    e.preventDefault();
    const zone = b.hasAttribute('data-rq-zone') ? (document.getElementById('zName')?.textContent || '') : '';
    open(b.dataset.rq, zone);
  });
})();
