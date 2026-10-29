/* BUAD — the brand film on the home page (user 2026-10-29: after the Al Jumum sections).
   The film has sound, so it never plays by itself: the poster + play button load and start it on a click,
   with the 720p cut on phones and the 1080p cut elsewhere (sources built from _work/brand_film/source.mp4). */
(() => {
  'use strict';
  document.querySelectorAll('[data-bfilm]').forEach(box => {
    const v = box.querySelector('video'), btn = box.querySelector('.bfilm__play');
    btn.addEventListener('click', () => {
      if (!v.src) v.src = `assets/video/buad-film${innerWidth < 820 ? '-m' : ''}.mp4?v=1`;
      v.controls = true; box.classList.add('is-playing');
      v.play().catch(() => {});
    });
    v.addEventListener('ended', () => { box.classList.remove('is-playing'); v.controls = false; v.load(); });
  });
})();
