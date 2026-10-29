/* BUAD — requests from visitors (home page + jumum.html):
   [data-rq="invest"]  request the Phase One investment memorandum
   [data-rq="summary"] request the executive summary of the opportunity
   [data-rq="masterplan"] request the masterplan
   [data-rq="docs"]    request the official documents (user 2026-10-29: request only, the documents themselves are not shown on the site;
                        the list below = the site documents + the masterplan + the Ministry of Energy approval)
   [data-rq="lease"]   leasing for brands and operators ([data-rq-zone] prefills the zone shown on the masterplan card)
   The site is static, so a request is sent as a ready-made message to BUAD, by WhatsApp or by e-mail (two buttons, user 2026-10-29).
   Nothing is stored. Return figures are deliberately not shown publicly; they are in the memorandum sent on request. */
(() => {
  'use strict';
  const WA = '966550000126', MAIL = 'info@buad-r.sa';
  const en = () => document.documentElement.lang === 'en';
  const T = {
    ar: {
      invest: { kicker: 'فرص الإستثمار', title: 'اطلب الملف الإستثماري', lead: 'الملف الإستثماري للمرحلة الأولى من مشروع واجهة الجموم متاح للمستثمرين المهتمين اترك بياناتك ويتواصل معك فريق علاقات المستثمرين' },
      summary: { kicker: 'فرص الإستثمار', title: 'اطلب الملخص التنفيذي', lead: 'الملخص التنفيذي لفرصة الإستثمار في مشروع واجهة الجموم يُرسل للمهتمين اترك بياناتك ويتواصل معك فريقنا' },
      masterplan: { kicker: 'فرص الإستثمار', title: 'اطلب الماستر بلان', lead: 'المخطط العام لمشروع واجهة الجموم يُرسل للمهتمين اترك بياناتك ويتواصل معك فريقنا' },
      docs: { kicker: 'فرص الإستثمار', title: 'اطلب المستندات النظامية', lead: 'المستندات النظامية لمشروع واجهة الجموم تُرسل للمهتمين عند الطلب اختر ما تحتاجه واترك بياناتك ويتواصل معك فريقنا' },
      docsL: 'المستندات المطلوبة', docsList: ['الكروكي التنظيمي', 'التقرير المساحي', 'كروكي التأشير', 'رخصة تجهيز الموقع', 'رخصة بناء السور', 'كروكي الإشتراطات', 'الماستر بلان', 'موافقة وزارة الطاقة'],
      lease: { kicker: 'فرص الإستئجار والتشغيل', title: 'فرص الإستئجار للعلامات التجارية', lead: 'للعلامات التجارية والمشغّلين الراغبين في موقع ضمن مراحل المشروع: مطاعم أسواق محلات ترفيه خدمات وغيرها' },
      name: 'الاسم', phone: 'رقم الجوال', email: 'البريد الإلكتروني (إختياري)', org: 'الجهة / الشركة (إختياري)',
      type: 'صفة المستثمر', types: ['فرد', 'شركة', 'صندوق أو جهة إستثمارية', 'وسيط'],
      size: 'حجم المشاركة المتوقعة (إختياري)', sizes: ['أقل من 500 ألف', '500 ألف – 2 مليون', '2 – 10 ملايين', 'أكثر من 10 ملايين'],
      brand: 'اسم العلامة التجارية / الشركة', activity: 'النشاط', zone: 'المنطقة المطلوبة (إختياري)', area: 'المساحة التقريبية بالمتر المربع (إختياري)',
      contact: 'اسم المسؤول', notes: 'ملاحظات (إختياري)', actsNote: 'الأنشطة المهتم بها: ',
      send: 'إرسال الطلب عبر الواتساب', sendMail: 'إرسال الطلب عبر البريد الإلكتروني', note: 'يُفتح الواتساب أو بريدك الإلكتروني برسالة جاهزة إلى فريق بُعد ولا نحفظ بياناتك في الموقع',
      err: 'فضلاً أكمل الحقول المطلوبة', okTitle: 'جهّزنا طلبك', okText: 'أكمل الإرسال في الواتساب وسيتواصل معك فريقنا قريباً', okTextMail: 'أكمل الإرسال من بريدك الإلكتروني وسيتواصل معك فريقنا قريباً', okMail: 'أو أرسله بالبريد الإلكتروني', okWa: 'أو أرسله عبر الواتساب', close: 'إغلاق',
      msgInvest: 'طلب الملف الإستثماري — مشروع واجهة الجموم', msgSummary: 'طلب الملخص التنفيذي — مشروع واجهة الجموم', msgMasterplan: 'طلب الماستر بلان — مشروع واجهة الجموم', msgDocs: 'طلب المستندات النظامية — مشروع واجهة الجموم', msgLease: 'طلب إستئجار — مشروع واجهة الجموم'
    },
    en: {
      invest: { kicker: 'Investment Opportunities', title: 'Request the Investment Memorandum', lead: 'The Phase One investment memorandum of Al Jumum Interface is available to interested investors. Leave your details and our investor relations team will contact you.' },
      summary: { kicker: 'Investment Opportunities', title: 'Request the Executive Summary', lead: 'The executive summary of the Al Jumum Interface opportunity is sent to interested parties. Leave your details and our team will contact you.' },
      masterplan: { kicker: 'Investment Opportunities', title: 'Request the Masterplan', lead: 'The Al Jumum Interface masterplan is sent to interested parties. Leave your details and our team will contact you.' },
      docs: { kicker: 'Investment Opportunities', title: 'Request the Official Documents', lead: 'The official documents of Al Jumum Interface are sent to interested parties on request. Choose what you need, leave your details and our team will contact you.' },
      docsL: 'Documents requested', docsList: ['Planning kroki', 'Survey report', 'Marking kroki', 'Site preparation permit', 'Fence building permit', 'Requirements kroki', 'The masterplan', 'Ministry of Energy approval'],
      lease: { kicker: 'Leasing & Operations', title: 'Leasing for Brands', lead: 'For brands and operators looking for a space within the project’s phases: restaurants, markets, retail, entertainment, services and more.' },
      name: 'Name', phone: 'Mobile number', email: 'E-mail (optional)', org: 'Organization (optional)',
      type: 'Investor type', types: ['Individual', 'Company', 'Fund or investment entity', 'Broker'],
      size: 'Expected participation (optional)', sizes: ['Under SAR 500K', 'SAR 500K – 2M', 'SAR 2 – 10M', 'Over SAR 10M'],
      brand: 'Brand / company name', activity: 'Activity', zone: 'Preferred zone (optional)', area: 'Approximate area in m² (optional)',
      contact: 'Contact person', notes: 'Notes (optional)', actsNote: 'Activities of interest: ',
      send: 'Send the request on WhatsApp', sendMail: 'Send the request by e-mail', note: 'WhatsApp or your e-mail opens with a ready message to the BUAD team; nothing is stored on this site.',
      err: 'Please complete the required fields.', okTitle: 'Your request is ready', okText: 'Finish sending it on WhatsApp and our team will contact you shortly.', okTextMail: 'Finish sending it from your e-mail and our team will contact you shortly.', okMail: 'Or send it by e-mail', okWa: 'Or send it on WhatsApp', close: 'Close',
      msgInvest: 'Investment memorandum request — Al Jumum Interface', msgSummary: 'Executive summary request — Al Jumum Interface', msgMasterplan: 'Masterplan request — Al Jumum Interface', msgDocs: 'Official documents request — Al Jumum Interface', msgLease: 'Leasing request — Al Jumum Interface'
    }
  };

  const dlg = document.createElement('dialog');
  dlg.className = 'rq';
  dlg.setAttribute('aria-labelledby', 'rqTitle');
  document.body.appendChild(dlg);

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const field = (name, label, opts = {}) => `<label class="fl${opts.full ? ' full' : ''}">${opts.area
    ? `<textarea name="${name}" rows="3" placeholder=" ">${esc(opts.value || '')}</textarea>`
    : `<input name="${name}" placeholder=" "${opts.req ? ' required' : ''}${opts.type ? ` type="${opts.type}"` : ''}${opts.dir ? ` dir="${opts.dir}"` : ''}${opts.mode ? ` inputmode="${opts.mode}"` : ''}${opts.ac ? ` autocomplete="${opts.ac}"` : ''} value="${esc(opts.value || '')}">`}<span>${label}</span></label>`;
  const chips = (name, legend, list, first) => `<fieldset class="needs full"><legend>${legend}</legend>${list.map((t, i) =>
    `<label class="need"><input type="radio" name="${name}" value="${esc(t)}"${first && i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>`;

  let mode = 'invest';
  function render(zone, acts) {
    const L = T[en() ? 'en' : 'ar'], M = L[mode];
    const docList = mode === 'docs' ? `<fieldset class="needs full"><legend>${L.docsL}</legend>${L.docsList.map(t =>
      `<label class="need"><input type="checkbox" name="docs" value="${esc(t)}" checked><span>${t}</span></label>`).join('')}</fieldset>` : '';
    const body = (mode === 'summary' || mode === 'masterplan' || mode === 'docs')
      ? docList + field('name', L.name, { req: true, ac: 'name' }) + field('phone', L.phone, { req: true, dir: 'ltr', mode: 'tel', ac: 'tel' }) +
        field('email', L.email, { type: 'email', dir: 'ltr', ac: 'email' }) + field('org', L.org, { ac: 'organization' }) +
        chips('type', L.type, L.types, true) + field('notes', L.notes, { area: true, full: true })
      : mode === 'invest'
      ? field('name', L.name, { req: true, ac: 'name' }) + field('phone', L.phone, { req: true, dir: 'ltr', mode: 'tel', ac: 'tel' }) +
        field('email', L.email, { type: 'email', dir: 'ltr', ac: 'email' }) + field('org', L.org, { ac: 'organization' }) +
        chips('type', L.type, L.types, true) + chips('size', L.size, L.sizes, false) + field('notes', L.notes, { area: true, full: true, value: acts ? L.actsNote + acts : '' })
      : field('brand', L.brand, { req: true, ac: 'organization' }) + field('activity', L.activity, { req: true, value: acts || '' }) +
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
            <div class="rq__send full">
              <button class="btn btn--dark btn--ico" type="submit" value="wa"><span>${L.send}</span><i class="btn__ico" aria-hidden="true"></i></button>
              <button class="btn rq__btn-mail" type="submit" value="mail"><span>${L.sendMail}</span></button>
            </div>
            <p class="rq__note full">${L.note}</p>
          </form>
        </div>
        <div class="rq__ok" hidden>
          <span class="rq__check" aria-hidden="true"></span>
          <h2 class="rq__title">${L.okTitle}</h2>
          <p class="rq__lead rq__ok-text">${L.okText}</p>
          <a class="rq__mail" href="#">${L.okMail}</a>
          <button type="button" class="btn btn--dark rq__done">${L.close}</button>
        </div>
      </div>`;
    const form = dlg.querySelector('form');
    form.addEventListener('input', e => { e.target.classList.remove('is-invalid'); form.querySelector('.form__msg').textContent = ''; });
    form.addEventListener('submit', e => { e.preventDefault(); submit(form, L, e.submitter?.value === 'mail' ? 'mail' : 'wa'); });
    dlg.querySelector('.rq__x').addEventListener('click', () => dlg.close());
    dlg.querySelector('.rq__done').addEventListener('click', () => dlg.close());
  }

  function submit(form, L, via) {
    const f = new FormData(form);
    const get = k => (f.get(k) || '').toString().trim();
    const missing = [...form.querySelectorAll('[required]')].filter(i => !i.value.trim());
    missing.forEach(i => i.classList.add('is-invalid'));
    const msg = form.querySelector('.form__msg');
    if (missing.length) { msg.classList.add('is-err'); msg.textContent = L.err; missing[0].focus(); return; }
    const lab = k => {
      const el = form.querySelector(`[name="${k}"]`), fs = el && el.closest('fieldset');
      const t = fs ? fs.querySelector('legend').textContent : el?.closest('label')?.querySelector('span')?.textContent;
      return (t || k).replace(/\s*\((إختياري|optional)\)\s*/, '');
    };
    const keys = (mode === 'summary' || mode === 'masterplan' || mode === 'docs') ? ['name', 'phone', 'email', 'org', 'type', 'notes'] : mode === 'invest' ? ['name', 'phone', 'email', 'org', 'type', 'size', 'notes'] : ['brand', 'activity', 'zone', 'area', 'contact', 'phone', 'notes'];
    const lines = [mode === 'masterplan' ? L.msgMasterplan : mode === 'docs' ? L.msgDocs : mode === 'summary' ? L.msgSummary : mode === 'invest' ? L.msgInvest : L.msgLease, ''].concat(keys.filter(get).map(k => `${lab(k)}: ${get(k)}`));
    if (mode === 'docs') { const d = f.getAll('docs'); if (d.length) lines.splice(2, 0, `${L.docsL}: ${d.join('، ')}`, ''); }
    const text = lines.join('\n');
    const wa = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
    const mail = `mailto:${MAIL}?subject=${encodeURIComponent(lines[0])}&body=${encodeURIComponent(text)}`;
    if (via === 'mail') location.href = mail; else window.open(wa, '_blank', 'noopener');
    const ok = dlg.querySelector('.rq__ok'), alt = ok.querySelector('.rq__mail');   // the other channel as a fallback link
    ok.querySelector('.rq__ok-text').textContent = via === 'mail' ? L.okTextMail : L.okText;
    alt.textContent = via === 'mail' ? L.okWa : L.okMail;
    alt.href = via === 'mail' ? wa : mail;
    if (via === 'mail') { alt.target = '_blank'; alt.rel = 'noopener'; }
    dlg.querySelector('.rq__form-wrap').hidden = true;
    ok.hidden = false;
  }

  function open(m, zone, acts) {
    mode = ['lease', 'summary', 'masterplan', 'docs'].includes(m) ? m : 'invest';
    render(zone, acts);
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
    const acts = b.hasAttribute('data-rq-acts') && window.jumumPicked ? window.jumumPicked() : '';   // ticked activities («أنشطة المشروع»)
    open(b.dataset.rq, zone, acts);
  });
})();
