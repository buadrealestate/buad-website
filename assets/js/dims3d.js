/* BUAD — six dimensions in 3D.
   The vector mark (read from the SVG already in the page) is extruded with Three.js. Scroll turns it in space,
   moves it aside, and pushes its six bars forward one by one while the card of that dimension appears beside it.
   Three.js loads only when the section comes near; without WebGL the 2D scene in main.js stays in charge. */
(() => {
  'use strict';
  const sec = document.getElementById('dimensions');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const LIBS = ['build/three.min.js', 'examples/js/loaders/SVGLoader.js', 'examples/js/environments/RoomEnvironment.js'];
  const load = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = CDN + src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!hasGL) return;
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try { for (const l of LIBS) await load(l); start(); } catch (err) { /* keep the 2D scene */ }
  }, { rootMargin: '1600px 0px' });
  io.observe(sec);

  function start() {
    const T = window.THREE;
    const pin = sec.querySelector('.dimx__pin');
    const cards = [...sec.querySelectorAll('.dcard')];
    const head = document.getElementById('dxHead'), motto = document.getElementById('dxMotto');
    const navEl = document.getElementById('dxNav'), navBtns = [...navEl.querySelectorAll('button')];
    const T0 = .22, SLOT = .11;
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---- renderer, camera, light
    const canvas = document.createElement('canvas');
    canvas.className = 'dimx__gl';
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (err) { return; }
    if (window.buadDimx) window.buadDimx.disable();          // the 2D scene steps aside
    sec.classList.add('dimx--3d');
    pin.querySelector('.dimx__glow').after(canvas);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), .04).texture;
    const camera = new T.PerspectiveCamera(30, 1, 1, 5000);
    camera.position.set(0, 0, 600);
    scene.add(new T.AmbientLight(0xffe8cc, .12));
    const key = new T.DirectionalLight(0xffe2b8, 2.1); key.position.set(-320, 380, 300); scene.add(key);
    const rim = new T.DirectionalLight(0xc9a27a, 1.1); rim.position.set(300, -120, -260); scene.add(rim);
    const sweep = new T.PointLight(0xffd7a0, 1.2, 900, 1.6); scene.add(sweep);

    // ---- the mark: body + dot, and six bars, extruded from the page's own SVG paths
    const svgEl = sec.querySelector('.dimx__svg');
    const bodyD = [...svgEl.querySelectorAll('#dxBody path')].map(p => p.getAttribute('d'));
    const barD = [...svgEl.querySelectorAll('.lgbar')].map(p => p.getAttribute('d'));
    const svg = d => `<svg xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1 0 0 -1 0 135)">${d.map(x => `<path d="${x}" fill-rule="evenodd" fill="#000"/>`).join('')}</g></svg>`;
    const loader = new T.SVGLoader();
    const shapesOf = d => loader.parse(svg(d)).paths.flatMap(p => T.SVGLoader.createShapes(p));
    const DEPTH = 9;
    const bodyMat = new T.MeshStandardMaterial({ color: 0xd6b081, metalness: .62, roughness: .34, envMapIntensity: .5 });
    const geoOpts = b => ({ depth: DEPTH, bevelEnabled: true, bevelThickness: b, bevelSize: b * .6, bevelSegments: 4, curveSegments: 10 });
    const mark = new T.Group(), inner = new T.Group();
    inner.position.set(-67.5, -67.5, -DEPTH / 2);
    mark.add(inner); scene.add(mark);
    const bodyGeo = new T.ExtrudeGeometry(shapesOf(bodyD), geoOpts(1.3));
    inner.add(new T.Mesh(bodyGeo, bodyMat));
    const bars = barD.map(d => {
      const g = new T.ExtrudeGeometry(shapesOf([d]), geoOpts(.45));
      g.computeBoundingBox();
      const c = new T.Vector3(); g.boundingBox.getCenter(c);
      g.translate(-c.x, -c.y, -c.z);
      const m = new T.MeshStandardMaterial({ color: 0xa8845f, metalness: .55, roughness: .36, envMapIntensity: .5, emissive: 0xffc27a, emissiveIntensity: 0 });
      const mesh = new T.Mesh(g, m);
      mesh.position.copy(c); mesh.userData.home = c.clone();
      inner.add(mesh);
      return mesh;
    });
    const BAR_DIM = new T.Color(0xa8845f), BAR_LIT = new T.Color(0xf6e2c0);
    const OUT = new T.Vector3(-.7071, -.7071, 0);   // away from the mark (down-left in the flipped space)
    const ALONG = new T.Vector3(.7071, -.7071, 0);  // along the stack of bars

    // ---- size + cards
    let W = 0, H = 0, mob = false;
    function resize() {
      W = pin.clientWidth; H = pin.clientHeight; mob = W < 900;
      renderer.setPixelRatio(Math.min(devicePixelRatio, mob ? 1.6 : 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      const cw = mob ? W - 32 : Math.min(560, W * .4);
      cards.forEach(c => c.style.setProperty('--cw', `${cw}px`));
    }
    resize();
    addEventListener('resize', resize);
    const visH = () => 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2));   // world units seen at z = 0

    navBtns.forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k, r = sec.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top + (sec.offsetHeight - innerHeight) * (T0 + SLOT * (k + .5)), behavior: 'smooth' });
    }));

    // pointer tilt
    let tx = 0, ty = 0, cx = 0, cy = 0;
    sec.addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); });

    let visible = false, P = 0, shown = -1;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px 0px' }).observe(sec);
    function target() {
      const r = sec.getBoundingClientRect();
      return clamp(-r.top / (sec.offsetHeight - innerHeight));
    }
    function tick() {
      requestAnimationFrame(tick);
      if (!visible) return;
      P = lerp(P, target(), .14);                     // a soft follow makes the scroll feel weighted
      cx = lerp(cx, tx, .06); cy = lerp(cy, ty, .06);
      const p = P, rtl = document.documentElement.dir === 'rtl';
      const vh = visH(), vw = vh * camera.aspect;

      const a = ease(clamp(p / .15)), z = ease(clamp((p - .15) / .08)), o = ease(clamp((p - .88) / .1));
      const k = z * (1 - o);                          // 0 = centred, 1 = aside next to the cards
      const sideX = mob ? 0 : (rtl ? -.24 : .24) * vw, sideY = mob ? vh * .2 : 0;
      const sBig = (mob ? Math.min(vw * .8, vh * .5) : vh * .56) / 135, sSide = (mob ? vh * .25 : vh * .58) / 135;
      mark.position.set(lerp(0, sideX, k), lerp(mob ? vh * .08 : vh * .07, sideY, k), 0);
      mark.scale.setScalar(lerp(sBig * lerp(.75, 1, a), sSide, k));
      const idle = Math.sin(p * Math.PI * 6) * .12 * k;
      mark.rotation.y = lerp(-Math.PI * 1.15, 0, a) + o * Math.PI * 2 + (rtl ? .42 : -.42) * k + idle + cx * .5;
      mark.rotation.x = lerp(.5, 0, a) + .08 * k + cy * .35;
      mark.rotation.z = lerp(-.4, 0, a);
      sweep.position.set(Math.cos(p * Math.PI * 4) * 260, 160 + Math.sin(p * Math.PI * 3) * 120, 260);

      // bars: the active one slides forward, out from the mark, and glows
      let active = -1;
      bars.forEach((bar, i) => {
        const st = T0 + i * SLOT;
        const m = ease(clamp((p - st) / (SLOT * .3))) * (1 - ease(clamp((p - (st + SLOT * .8)) / (SLOT * .2))));
        if (p >= st && p < st + SLOT) active = i;
        const spread = (i - 2.5) * 1.6 * k;
        bar.position.copy(bar.userData.home)
          .addScaledVector(ALONG, spread)
          .addScaledVector(OUT, 3 * k + m * 24);
        bar.position.z += m * 46;
        bar.rotation.z = m * .12;
        bar.scale.set(1 + m * .25, 1 + m * .25, 1 + m * 1.6);
        bar.material.emissiveIntensity = m * .7;
        bar.material.color.lerpColors(BAR_DIM, BAR_LIT, m);
      });
      renderer.render(scene, camera);

      // cards, numbers, title and motto
      const want = active >= 0 && (p - (T0 + active * SLOT)) / SLOT > .1 && (p - (T0 + active * SLOT)) / SLOT < .88 ? active : -1;
      if (want !== shown) {
        cards.forEach((c, i) => c.classList.toggle('is-show', i === want));
        shown = want;
      }
      navBtns.forEach((b, i) => b.classList.toggle('is-active', i === active));
      navEl.classList.toggle('is-on', p > T0 - .02 && p < .9);
      const h0 = clamp((p - .08) / .07);
      head.style.opacity = (1 - h0).toFixed(3);
      head.style.transform = `translate3d(0, ${(-h0 * 40).toFixed(1)}px, 0)`;
      head.style.visibility = p > .16 ? 'hidden' : 'visible';
      motto.style.opacity = clamp((p - .94) / .05).toFixed(3);
    }
    tick();
  }
})();
