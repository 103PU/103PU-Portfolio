/* Cursor tracked glass form for the hero.
   Three.js is pinned and loaded from a CDN because this project has no
   bundler and no package.json. All three panes are tinted glass lit by a
   generated environment rather than transmissive: the canvas clears to
   transparent, so there is no backdrop for real refraction to sample. */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const lightScheme = window.matchMedia('(prefers-color-scheme: light)');
const coarse = window.matchMedia('(pointer: coarse)');

/* A rounded rectangle profile, extruded and bevelled into a glass slab. */
function slabGeometry(w, h, r, depth) {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);

  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    curveSegments: 22,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: depth * 0.42,
    bevelThickness: depth * 0.42
  });
  g.center();
  return g;
}

/* Environment for the refraction. Built on a canvas so no HDR file is
   needed; the band of accent blue is what the glass edges pick up. */
function environmentTexture(isLight) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  /* A dim room, not a bright one. Glass only reads as glass when most of
     what it reflects is dark and the few bright sources are hard edged.
     A pale all over gradient is what makes a slab look like milk plastic. */
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  if (isLight) {
    /* Still a dim room, only with a lit ceiling. A light page does not mean a
       bright environment: bright everywhere is exactly what makes the slab
       read as pale plastic instead of glass. */
    grad.addColorStop(0.00, '#e6eaf1');
    grad.addColorStop(0.32, '#8b94a4');
    grad.addColorStop(0.54, '#454c57');
    grad.addColorStop(1.00, '#22262d');
  } else {
    grad.addColorStop(0.00, '#1b202a');
    grad.addColorStop(0.44, '#0d1016');
    grad.addColorStop(0.58, '#07080c');
    grad.addColorStop(1.00, '#040507');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  /* Softboxes. Rectangular sources are what put a clean straight highlight
     down a bevel; a round spot only ever gives a smear. */
  function softbox(x, y, w, h, alpha) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0.00, 'rgba(255,255,255,0)');
    g.addColorStop(0.18, 'rgba(255,255,255,' + alpha + ')');
    g.addColorStop(0.82, 'rgba(255,255,255,' + alpha + ')');
    g.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.filter = 'blur(6px)';
    ctx.fillRect(x, y, w, h);
    ctx.filter = 'none';
  }
  softbox(74, 18, 92, 116, 1);
  softbox(298, 34, 46, 92, isLight ? 0.9 : 0.85);
  /* A narrow full height slit. This is the one that rakes the vertical
     bevels and gives the slab a hard edge instead of a soft glow. */
  softbox(430, 6, 16, 150, 1);

  /* One accent band near the horizon. This is the blue the edges pick up. */
  const band = ctx.createLinearGradient(0, 118, 0, 168);
  const accent = isLight ? '0,102,204' : '10,132,255';
  band.addColorStop(0.0, 'rgba(' + accent + ',0)');
  band.addColorStop(0.5, 'rgba(' + accent + ',0.85)');
  band.addColorStop(1.0, 'rgba(' + accent + ',0)');
  ctx.fillStyle = band;
  ctx.fillRect(186, 118, 250, 50);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function mount(host) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  host.insertBefore(renderer.domElement, host.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  /* ---- environment ---- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  function applyEnvironment() {
    const source = environmentTexture(lightScheme.matches);
    const next = pmrem.fromEquirectangular(source);
    source.dispose();
    if (envRT) envRT.dispose();
    envRT = next;
    scene.environment = next.texture;
  }
  pmrem.compileEquirectangularShader();

  /* ---- lights: one key for the specular edge, one accent fill ---- */
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3.4, 4.2, 5.0);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x0a84ff, 0.9);
  fill.position.set(-4.2, -2.0, 2.4);
  scene.add(fill);

  /* Rim from behind. Without it the silhouette dissolves into the page. */
  const rim = new THREE.DirectionalLight(0xd6e6ff, 2.4);
  rim.position.set(-3.2, 1.6, -3.0);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  /* ---- the stack: one transmissive focal slab, two frosted companions ---- */
  const group = new THREE.Group();
  scene.add(group);

  const focal = new THREE.Mesh(
    slabGeometry(3.05, 3.85, 0.62, 0.30),
    new THREE.MeshPhysicalMaterial({
      /* No transmission. A transmissive slab refracts the transmission
         backdrop, and this canvas is cleared to transparent, so there is
         nothing behind it to refract: it renders as a flat pale sheet and
         costs an extra pass to do it. Tinted glass lit by the environment
         is both cheaper and the look Apple actually uses on dark ground:
         mostly dark body, hard bright rim on the bevel. */
      color: 0x46566d,
      transparent: true,
      opacity: 0.26,
      ior: 1.5,
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 3.2,
      specularIntensity: 1,
      iridescence: 0.45,
      iridescenceIOR: 1.35,
      side: THREE.DoubleSide
    })
  );
  focal.position.z = 0.32;
  group.add(focal);

  function companion(w, h, r, opacity, tint) {
    return new THREE.Mesh(
      slabGeometry(w, h, r, 0.16),
      new THREE.MeshPhysicalMaterial({
        color: tint,
        transparent: true,
        opacity,
        roughness: 0.09,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 2.7,
        side: THREE.DoubleSide
      })
    );
  }

  const behind = companion(2.35, 3.05, 0.5, 0.17, 0x39485c);
  behind.position.set(-0.92, 0.46, -0.72);
  group.add(behind);

  const front = companion(1.62, 2.05, 0.36, 0.13, 0x2b3746);
  front.position.set(0.98, -0.66, 1.02);
  group.add(front);

  const bead = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 40, 28),
    new THREE.MeshPhysicalMaterial({
      color: 0x1E90FF,
      roughness: 0.07,
      metalness: 1,
      clearcoat: 1,
      envMapIntensity: 2.6
    })
  );
  bead.position.set(-1.06, -1.32, 1.20);
  group.add(bead);

  /* ---- per scheme tuning ---- */
  /* One tint cannot serve both grounds. On a near white page the body has to
     be darker and more opaque than on black, or the slab loses its mass and
     goes back to looking like milk plastic. */
  const SCHEME = {
    dark:  { exposure: 1.18, focal: [0x46566d, 0.26], behind: [0x39485c, 0.17], front: [0x2b3746, 0.13] },
    light: { exposure: 1.00, focal: [0x33405a, 0.42], behind: [0x2c3b52, 0.30], front: [0x223047, 0.24] }
  };

  function applyScheme() {
    const isLight = lightScheme.matches;
    applyEnvironment();
    const c = isLight ? SCHEME.light : SCHEME.dark;
    renderer.toneMappingExposure = c.exposure;
    [[focal, c.focal], [behind, c.behind], [front, c.front]].forEach(function (pair) {
      pair[0].material.color.setHex(pair[1][0]);
      pair[0].material.opacity = pair[1][1];
    });
  }
  applyScheme();

  const layers = [
    { mesh: focal,  pull: 1.00, drift: 0.00 },
    { mesh: behind, pull: 0.58, drift: 0.55 },
    { mesh: front,  pull: 1.46, drift: 1.10 },
    { mesh: bead,   pull: 1.90, drift: 1.70 }
  ];
  layers.forEach((l) => { l.home = l.mesh.position.clone(); });

  /* ---- pointer target. Coarse pointers get an idle drift instead. ---- */
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let usePointer = !coarse.matches;

  function onPointerMove(event) {
    target.x = (event.clientX / window.innerWidth) * 2 - 1;
    target.y = (event.clientY / window.innerHeight) * 2 - 1;
  }
  if (usePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });

  function onPointerKind() {
    const nowCoarse = coarse.matches;
    if (nowCoarse === !usePointer) return;
    usePointer = !nowCoarse;
    if (usePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
    else window.removeEventListener('pointermove', onPointerMove);
  }
  coarse.addEventListener('change', onPointerKind);

  /* ---- sizing ---- */
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const cap = coarse.matches ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* Keep the stack the same apparent size on narrow viewports. */
    camera.position.z = w < 460 ? 8.6 : 7.4;
    camera.updateProjectionMatrix();
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(host);
  resize();

  /* ---- frame loop, paused when off screen or on a hidden tab ---- */
  let onScreen = true;
  let running = false;
  let raf = 0;
  let t = 0;

  const MAX_TILT = 0.30;

  function frame() {
    raf = requestAnimationFrame(frame);
    t += 0.006;

    if (!usePointer) {
      target.x = Math.sin(t * 0.9) * 0.55;
      target.y = Math.cos(t * 0.7) * 0.40;
    }

    eased.x += (target.x - eased.x) * 0.055;
    eased.y += (target.y - eased.y) * 0.055;

    group.rotation.y = eased.x * MAX_TILT;
    group.rotation.x = eased.y * MAX_TILT;
    group.rotation.z = eased.x * 0.05;
    group.position.y = Math.sin(t * 1.1) * 0.07;

    layers.forEach((l) => {
      l.mesh.position.x = l.home.x + eased.x * 0.30 * l.pull;
      l.mesh.position.y = l.home.y - eased.y * 0.30 * l.pull + Math.sin(t * 1.3 + l.drift) * 0.05;
    });

    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function sync() {
    if (onScreen && !document.hidden) start();
    else stop();
  }

  const viewObserver = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }, { threshold: 0 });
  viewObserver.observe(host);

  document.addEventListener('visibilitychange', sync);
  lightScheme.addEventListener('change', applyScheme);

  sync();

  /* ---- teardown, exported so the caller can release the context ---- */
  return function unmount() {
    stop();
    viewObserver.disconnect();
    sizeObserver.disconnect();
    document.removeEventListener('visibilitychange', sync);
    lightScheme.removeEventListener('change', applyScheme);
    coarse.removeEventListener('change', onPointerKind);
    window.removeEventListener('pointermove', onPointerMove);
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (envRT) envRT.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
