/* BUAD — Arabic line justification with kashida (user rule 2026-10-26): the lines of a paragraph that are nearly full are
   stretched with «ـ» between joining letters until they all reach the same width («السـلام عليكــم / وعليكم السلام»).
   The last line of a paragraph (the short one) is left as it is. Applies to [data-kashida] in Arabic only,
   and runs again when the width or the language changes. */
(() => {
  'use strict';
  const els = [...document.querySelectorAll('[data-kashida]')];
  if (!els.length && !document.querySelector('[data-fit]')) return;
  const html = document.documentElement;
  const T = 'ـ';
  const NJ = new Set([...'اأإآٱدذرزوؤةىء']);            // letters that never join the next one
  const LETTER = /[ؠ-يٱ-ۓ]/, MARK = /[ً-ٰٟ]/;
  const ALEF = /[اأإآٱ]/;

  // places in a word where a «ـ» may go: after a joining letter (and its marks), before another letter, never inside لا
  function slots(w) {
    const c = [...w], out = [];
    for (let i = 0; i < c.length - 1; i++) {
      if (!LETTER.test(c[i]) || NJ.has(c[i])) continue;
      let j = i + 1; while (j < c.length && MARK.test(c[j])) j++;
      if (j >= c.length || !LETTER.test(c[j])) continue;
      if (c[i] === 'ل' && ALEF.test(c[j])) continue;
      out.push(j);                                         // insert before index j
    }
    // middle of the word first: it reads best
    // short words stay as they are (no «مـن»); at most three places per word, the middle ones first: it reads best
    if (c.filter(ch => LETTER.test(ch)).length < 4) return [];
    const mid = (c.length - 1) / 2;
    return out.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid)).slice(0, 3);
  }
  const build = (w, counts) => { const c = [...w]; let s = ''; c.forEach((ch, i) => { if (counts[i]) s += T.repeat(counts[i]); s += ch; }); return s; };

  function justify(el) {
    el.style.textAlign = ''; el.style.textAlignLast = '';
    if (html.lang === 'en') return;                          // English keeps its own text (i18n)
    if (el.dataset.kOrig === undefined) el.dataset.kOrig = el.textContent.replace(/ـ/g, '').replace(/\s+/g, ' ').trim();
    const W = el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight);
    if (W < 40) return;
    el.style.textAlign = 'start';
    const words = el.dataset.kOrig.split(/\s+/).filter(Boolean);
    el.textContent = '';
    const spans = words.map((w, i) => { if (i) el.append(' '); const s = document.createElement('span'); s.textContent = w; el.append(s); return s; });
    const top = s => Math.round(s.offsetTop);
    // the lines as the browser breaks them
    const lines = []; let cur = null;
    spans.forEach((s, i) => { const t = top(s); if (!cur || Math.abs(t - cur.t) > 4) lines.push(cur = { t, idx: [] }); cur.idx.push(i); });
    const probe = document.createElement('span'); probe.textContent = T.repeat(20); el.append(probe);
    const tw = probe.getBoundingClientRect().width / 20; probe.remove();
    const width = ids => { let l = Infinity, r = -Infinity; ids.forEach(i => { const b = spans[i].getBoundingClientRect(); l = Math.min(l, b.left); r = Math.max(r, b.right); }); return r - l; };
    lines.slice(0, -1).forEach(line => {
      let w = width(line.idx);
      if (!tw) return;                                       // every line but the last is stretched; the last one stays as it is
      let need = Math.floor((W - w) / tw);
      const words2 = line.idx.map(i => ({ i, w: words[i], s: slots(words[i]), n: {}, k: 0 })).filter(o => o.s.length);
      if (!words2.length) return;
      words2.sort((a, b) => b.w.length - a.w.length);       // longer words take the stretch first
      let guard = 0;
      while (need > 0 && guard++ < 900) {
        const o = words2[guard % words2.length];
        const pos = o.s[o.k % o.s.length]; o.k++;
        if ((o.n[pos] || 0) >= 8) continue;
        o.n[pos] = (o.n[pos] || 0) + 1;
        spans[o.i].textContent = build(o.w, o.n);
        if (top(spans[line.idx[line.idx.length - 1]]) !== line.t || top(spans[line.idx[0]]) !== line.t) {   // went too far: undo and stop
          o.n[pos]--; spans[o.i].textContent = build(o.w, o.n); break;
        }
        need--;
      }
    });
    el.style.textAlign = 'justify'; el.style.textAlignLast = 'start';   // the last few pixels go to the spaces
  }
  // one-line headings in a row ([data-fit="group"]): every heading of the group takes the size of the one that needs the smallest,
  // so the titles stay on one row, the same size, and none spills out of its card (user 2026-10-26)
  function fit() {
    const groups = {};
    document.querySelectorAll('[data-fit]').forEach(h => (groups[h.dataset.fit] = groups[h.dataset.fit] || []).push(h));
    Object.values(groups).forEach(hs => {
      hs.forEach(h => { h.style.fontSize = ''; });
      if (getComputedStyle(hs[0]).whiteSpace !== 'nowrap') return;
      let size = Math.min(...hs.map(h => parseFloat(getComputedStyle(h).fontSize)));
      const over = () => hs.some(h => h.scrollWidth > h.clientWidth + 1);
      hs.forEach(h => { h.style.fontSize = size + 'px'; });
      while (over() && size > 12) { size -= .5; hs.forEach(h => { h.style.fontSize = size + 'px'; }); }
    });
  }
  const run = () => { fit(); els.forEach(el => { if (el.offsetParent !== null || el.getClientRects().length) justify(el); }); };
  let lastW = innerWidth, timer = 0;
  addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(timer); timer = setTimeout(run, 180); });
  document.addEventListener('buad:lang', () => setTimeout(run, 30));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(run, 50));
})();
