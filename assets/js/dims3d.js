/* BUAD — six dimensions, cinematic 3D.
   The vector mark (read from the SVG already in the page) is extruded in bronze and lit like an object on a stage:
   a warm key light, a rim light from behind, a light that drifts with the scroll, dust in the beam and a soft bloom.
   For each dimension its bar leaves the mark, turns, and grows until it fills the screen and becomes the backdrop
   of that dimension's text; scrolling on shrinks it back into the mark and the next bar takes its turn.
   Three.js loads only when the section comes near; without WebGL the 2D scene in main.js stays in charge. */
(() => {
  'use strict';
  const sec = document.getElementById('dimensions');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
  const LIBS = ['build/three.min.js', 'examples/js/loaders/SVGLoader.js', 'examples/js/environments/RoomEnvironment.js',
    'examples/js/shaders/CopyShader.js', 'examples/js/shaders/LuminosityHighPassShader.js', 'examples/js/shaders/GammaCorrectionShader.js',
    'examples/js/postprocessing/EffectComposer.js', 'examples/js/postprocessing/RenderPass.js',
    'examples/js/postprocessing/ShaderPass.js', 'examples/js/postprocessing/UnrealBloomPass.js'];
  const load = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = CDN + src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!hasGL) return;
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try { for (const l of LIBS) await load(l); start(); } catch (err) { /* keep the 2D scene */ }
  }, { rootMargin: '1800px 0px' });
  io.observe(sec);

  function start() {
    const T = window.THREE;
    const pin = sec.querySelector('.dimx__pin');
    const cards = [...sec.querySelectorAll('.dcard')];
    const head = document.getElementById('dxHead'), motto = document.getElementById('dxMotto');
    const navEl = document.getElementById('dxNav'), navBtns = [...navEl.querySelectorAll('button')];
    const P0 = .1, P1 = .9, SLOT = (P1 - P0) / 6;        // intro | six dimensions | outro
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---------------------------------------------------------------- renderer + stage
    const canvas = document.createElement('canvas');
    canvas.className = 'dimx__gl';
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
    catch (err) { return; }
    if (window.buadDimx) window.buadDimx.disable();          // the 2D scene steps aside
    sec.classList.add('dimx--3d');
    pin.insertBefore(canvas, pin.firstChild);
    const veil = document.createElement('div'); veil.className = 'dimx__veil'; canvas.after(veil);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .9;
    const scene = new T.Scene();
    scene.background = new T.Color(0x140e0b);
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), .04).texture;
    const CAMZ = 700;
    const camera = new T.PerspectiveCamera(28, 1, 1, 4000);
    camera.position.set(0, 0, CAMZ);

    // backdrop: a warm pool of light behind the mark, computed per pixel (smooth, dithered: no banding rings)
    const back = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
      toneMapped: false, depthWrite: false,
      uniforms: { uGlow: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uGlow;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 q = (vUv - .5) * vec2(1.6, 1.0);
          float d = length(q);
          vec3 edge = vec3(.075, .055, .045), mid = vec3(.15, .105, .08), core = vec3(.26, .185, .14);
          vec3 c = mix(core, mid, smoothstep(0., .28, d));
          c = mix(c, edge, smoothstep(.2, .75, d));
          c = mix(edge, c, uGlow);
          c = pow(c, vec3(2.2));                    // authored in sRGB; the final pass re-applies gamma
          c += (hash(gl_FragCoord.xy) - .5) / 900.;
          gl_FragColor = vec4(c, 1.);
        }`
    }));
    back.position.z = -600; scene.add(back);

    // lights
    scene.add(new T.HemisphereLight(0x8a6448, 0x0b0705, .35));
    const key = new T.SpotLight(0xffd6a3, 0, 2400, .55, .85, 1.2);
    key.position.set(-320, 420, 520); scene.add(key); scene.add(key.target);
    const rim = new T.DirectionalLight(0xffb36e, 0); rim.position.set(380, 160, -360); scene.add(rim);
    const sweep = new T.PointLight(0xfff0d8, 0, 1400, 1.4); scene.add(sweep);

    // dust in the beam
    const N = innerWidth < 900 ? 220 : 420;
    const dpos = new Float32Array(N * 3), dseed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      dpos[i * 3] = (Math.random() - .5) * 520; dpos[i * 3 + 1] = (Math.random() - .5) * 360; dpos[i * 3 + 2] = (Math.random() - .5) * 300 + 40;
      dseed[i] = Math.random() * 100;
    }
    const dgeo = new T.BufferGeometry(); dgeo.setAttribute('position', new T.BufferAttribute(dpos, 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 64;
    const dg = dot.getContext('2d'), dr = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
    dr.addColorStop(0, 'rgba(255,236,205,1)'); dr.addColorStop(1, 'rgba(255,236,205,0)');
    dg.fillStyle = dr; dg.fillRect(0, 0, 64, 64);
    const dustMat = new T.PointsMaterial({ size: 3.2, map: new T.CanvasTexture(dot), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, color: 0xffe2b8 });
    const dust = new T.Points(dgeo, dustMat); scene.add(dust);

    // ---------------------------------------------------------------- the mark, extruded from the page's own SVG paths
    const svgEl = sec.querySelector('.dimx__svg');
    const bodyD = [...svgEl.querySelectorAll('#dxBody path')].map(p => p.getAttribute('d'));
    const barD = [...svgEl.querySelectorAll('.lgbar')].map(p => p.getAttribute('d'));
    const svg = d => `<svg xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1 0 0 -1 0 135)">${d.map(x => `<path d="${x}" fill-rule="evenodd" fill="#000"/>`).join('')}</g></svg>`;
    const loader = new T.SVGLoader();
    const shapesOf = d => loader.parse(svg(d)).paths.flatMap(p => T.SVGLoader.createShapes(p));
    const DEPTH = 10;
    const opts = b => ({ depth: DEPTH, bevelEnabled: true, bevelThickness: b, bevelSize: b * .6, bevelSegments: 5, curveSegments: 12 });
    const bronze = new T.MeshPhysicalMaterial({ color: 0x8f6544, metalness: .9, roughness: .3, clearcoat: .45, clearcoatRoughness: .22, envMapIntensity: .55 });
    const gold = new T.MeshPhysicalMaterial({ color: 0xc0925f, metalness: .9, roughness: .26, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .6 });
    const mark = new T.Group(), inner = new T.Group();
    inner.position.set(-67.5, -67.5, -DEPTH / 2);
    mark.add(inner); scene.add(mark);
    inner.add(new T.Mesh(new T.ExtrudeGeometry(shapesOf(bodyD), opts(1.4)), bronze));
    const BAR_ANG = Math.PI / 4;                          // the bars run at 45° in the mark
    const bars = barD.map(d => {
      const g = new T.ExtrudeGeometry(shapesOf([d]), opts(.5));
      g.computeBoundingBox();
      const c = new T.Vector3(); g.boundingBox.getCenter(c);
      g.translate(-c.x, -c.y, -c.z);
      g.rotateZ(-BAR_ANG);                               // lie the bar along x so it can stretch into a panel
      g.computeBoundingBox();
      const mesh = new T.Mesh(g, gold);
      mesh.position.copy(c); mesh.rotation.z = BAR_ANG;
      inner.add(mesh);
      return mesh;
    });
    const barSize = new T.Vector3(); bars[0].geometry.boundingBox.getSize(barSize);

    // the panel: a copy of the active bar that leaves the mark and fills the screen
    const panelMat = new T.MeshPhysicalMaterial({ color: 0x7d5639, metalness: .86, roughness: .4, clearcoat: .6, clearcoatRoughness: .28, envMapIntensity: .5 });
    const panel = new T.Mesh(bars[0].geometry, panelMat);
    panel.visible = false; scene.add(panel);

    // ---------------------------------------------------------------- post: soft bloom on the highlights
    let W = 0, H = 0, mob = false;
    const composer = new T.EffectComposer(renderer);
    composer.addPass(new T.RenderPass(scene, camera));
    const bloom = new T.UnrealBloomPass(new T.Vector2(512, 512), .22, .3, .9);
    composer.addPass(bloom);
    composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
    function resize() {
      W = pin.clientWidth; H = pin.clientHeight; mob = W < 900;
      const pr = Math.min(devicePixelRatio, mob ? 1.5 : 2);
      renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
      composer.setPixelRatio(pr); composer.setSize(W, H);
      bloom.enabled = !mob;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      const vh = 2 * (CAMZ + 600) * Math.tan(T.MathUtils.degToRad(14));
      back.scale.set(vh * camera.aspect * 1.1, vh * 1.1, 1);
    }
    resize();
    addEventListener('resize', resize);
    const visAt = z => { const h = 2 * (CAMZ - z) * Math.tan(T.MathUtils.degToRad(camera.fov / 2)); return [h * camera.aspect, h]; };

    navBtns.forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k, r = sec.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top + (sec.offsetHeight - innerHeight) * (P0 + SLOT * (k + .5)), behavior: 'smooth' });
    }));
    let tx = 0, ty = 0, cx = 0, cy = 0;
    sec.addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });

    let visible = false, P = 0, shown = -1, last = performance.now();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '300px 0px' }).observe(sec);
    const target = () => { const r = sec.getBoundingClientRect(); return clamp(-r.top / (sec.offsetHeight - innerHeight)); };

    // reusable maths objects
    const hp = new T.Vector3(), hq = new T.Quaternion(), hs = new T.Vector3();
    const ap = new T.Vector3(), aq = new T.Quaternion();
    const tq = new T.Quaternion(), e3 = new T.Euler();

    function tick(now) {
      requestAnimationFrame(tick);
      if (!visible) { last = now; return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      P = lerp(P, target(), 1 - Math.pow(.0009, dt));      // weighted follow, frame-rate independent
      cx = lerp(cx, tx, 1 - Math.pow(.02, dt)); cy = lerp(cy, ty, 1 - Math.pow(.02, dt));
      const p = P, t = now / 1000;
      const [vw0, vh0] = visAt(0);

      // ---- intro: the stage lights up and the mark turns into place; outro: one full turn, motto
      const a = easeOut(clamp(p / P0)), o = ease(clamp((p - P1) / (1 - P1)));
      const lights = clamp(p / (P0 * .7));
      key.intensity = 2.5 * lights; rim.intensity = 2.4 * lights; dustMat.opacity = .5 * lights;
      back.material.uniforms.uGlow.value = lights;
      const s = (mob ? Math.min(vw0 * .62, vh0 * .42) : vh0 * .5) / 135;
      mark.scale.setScalar(s * lerp(.82, 1, a));
      mark.position.set(0, mob ? vh0 * .1 : vh0 * .02, 0);
      mark.rotation.y = lerp(-Math.PI * 1.1, 0, a) + o * Math.PI * 2 + Math.sin(t * .35) * .22 * a + cx * .55;
      mark.rotation.x = lerp(.6, 0, a) + Math.sin(t * .27) * .06 + cy * .35;
      mark.rotation.z = lerp(-.35, 0, a);
      sweep.position.set(Math.sin(t * .4 + p * 9) * 260, 120 + Math.cos(t * .3) * 110, 260);
      sweep.intensity = 1.6 * lights;
      key.target.position.set(0, 0, 0);

      // dust drifts upward through the beam
      const arr = dgeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        arr[i * 3 + 1] += dt * (6 + (dseed[i] % 5));
        arr[i * 3] += Math.sin(t * .5 + dseed[i]) * dt * 3;
        if (arr[i * 3 + 1] > 190) arr[i * 3 + 1] = -190;
      }
      dgeo.attributes.position.needsUpdate = true;

      // ---- the six dimensions: one bar at a time grows into the backdrop
      let active = -1, g = 0;
      if (p >= P0 && p < P1) {
        active = Math.min(5, Math.floor((p - P0) / SLOT));
        const sl = (p - P0) / SLOT - active;               // 0..1 inside the slot
        g = sl < .3 ? clamp(sl / .3) : sl > .74 ? 1 - clamp((sl - .74) / .26) : 1;
      }
      bars.forEach((b, i) => { b.visible = !(i === active && g > .001); });
      panel.visible = active >= 0 && g > .001;
      if (panel.visible) {
        const bar = bars[active];
        mark.updateMatrixWorld(true);
        bar.getWorldPosition(hp); bar.getWorldQuaternion(hq); bar.getWorldScale(hs);
        // step 1: the bar slides out of the mark towards the viewer and turns level
        const g1 = ease(clamp(g / .38)), g2 = ease(clamp((g - .3) / .7));
        e3.set(0, mob ? 0 : (document.documentElement.dir === 'rtl' ? .1 : -.1), 0); tq.setFromEuler(e3);
        ap.copy(hp).add(new T.Vector3(0, 0, 70 * g1));
        aq.copy(hq).slerp(tq, g1);
        // step 2: it grows until it covers the whole screen
        const zF = 260, [fw, fh] = visAt(zF);
        const sx = fw * 1.3 / barSize.x, sy = fh * 1.3 / barSize.y, sz = 3.2;
        panel.position.copy(ap).lerp(new T.Vector3(0, 0, zF), g2);
        panel.quaternion.copy(aq);
        panel.scale.set(hs.x * Math.pow(sx / hs.x, g2), hs.y * Math.pow(sy / hs.y, g2), lerp(hs.z, sz, g2));
      }
      key.target.position.set(0, 0, panel.visible ? 200 * g : 0);
      veil.style.opacity = (active >= 0 ? clamp((g - .55) / .45) : 0).toFixed(3);

      composer.render();

      // ---- text
      const want = active >= 0 && g > .9 ? active : -1;
      if (want !== shown) { cards.forEach((c, i) => c.classList.toggle('is-show', i === want)); shown = want; }
      navBtns.forEach((b, i) => b.classList.toggle('is-active', i === active));
      navEl.classList.toggle('is-on', p > P0 - .02 && p < P1 + .01);
      sec.classList.toggle('is-panel', g > .6);
      const h0 = clamp((p - P0 * .55) / (P0 * .4));
      head.style.opacity = (1 - h0).toFixed(3);
      head.style.transform = `translate3d(0, ${(-h0 * 30).toFixed(1)}px, 0)`;
      head.style.visibility = p > P0 ? 'hidden' : 'visible';
      motto.style.opacity = clamp((p - (P1 + .04)) / .05).toFixed(3);
    }
    requestAnimationFrame(tick);
  }
})();
