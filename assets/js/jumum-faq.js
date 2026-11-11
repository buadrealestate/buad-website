/* «الأسئلة الشائعة»: search + section chips (jumum_faq.py) */
(function () {
  const root = document.getElementById('faq'); if (!root) return;
  const $$ = s => [...root.querySelectorAll(s)], q = root.querySelector('.jfaq__s'), none = root.querySelector('.jfaq__none');
  const norm = s => s.replace(/[\u064B-\u0652]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  let group = '*';
  function filter() {
    const needle = norm(q.value.trim()); let any = false;
    $$('.jfaq__g').forEach(g => {
      let vis = 0;
      g.querySelectorAll('details').forEach(d => { const m = !needle || norm(d.textContent).includes(needle); d.hidden = !m; if (m) vis++; if (needle && m) d.open = true; });
      const show = (group === '*' || g.dataset.g === group) && vis > 0; g.hidden = !show; any = any || show;
    });
    none.hidden = any;
  }
  q.addEventListener('input', filter);
  $$('.jfaq__c button').forEach(b => b.addEventListener('click', () => { group = b.dataset.f; $$('.jfaq__c button').forEach(x => x.classList.toggle('on', x === b)); filter(); }));
})();
