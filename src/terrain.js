// SkyKraken — "Relief & ondes" scene.
// A night topographic relief drawn as contour lines, with radio wavefronts
// propagating across it from a SkyKraken sensor. A drone is detected,
// identified and linked to its pilot. Demonstration data is synthetic.
//
// Source of assets/terrain.js (bundled with esbuild, see README in src/).
import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Mesh,
  Vector2, Vector3, Vector4, Color, BufferGeometry, Float32BufferAttribute, Line, LineLoop,
  LineBasicMaterial, LineDashedMaterial, Group, BoxGeometry, MeshBasicMaterial,
  CatmullRomCurve3, MathUtils,
} from 'three';

/* ------------------------------------------------------------------ */
/* Noise (deterministic gradient noise)                                */
/* ------------------------------------------------------------------ */
const perm = new Uint8Array(512);
(() => {
  const p = [...Array(256).keys()];
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
const grad = (h, x, y) => {
  const g = h & 7;
  const u = g < 4 ? x : y, v = g < 4 ? y : x;
  return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v);
};
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function noise(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = perm[X] + Y, b = perm[X + 1] + Y;
  return MathUtils.lerp(
    MathUtils.lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
    MathUtils.lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 0.25;
}
function fbm(x, y) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < 5; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; }
  return s;
}

/* ------------------------------------------------------------------ */
/* World layout (units ≈ km)                                            */
/* ------------------------------------------------------------------ */
const SIZE = 30;
const SITE = new Vector2(0.9, -0.7);       // protected site
const ZONE_R = 1.0;
const ASSETS = {
  horizon: new Vector2(-1.1, 1.7),
  mobile: new Vector2(3.1, 2.9),
  sk1: new Vector2(0.9, 3.3),
};
const PILOT = new Vector2(3.6, 1.2);
const CAMS = [
  { p: new Vector2(-0.1, 0.2), a: -0.55 },
  { p: new Vector2(2.2, 0.1), a: -2.35 },
  { p: new Vector2(1.1, -2.3), a: 1.65 },
];
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x, z) {
  let h = fbm(x * 0.085 + 3.1, z * 0.085 - 1.7) * 3.2;
  h += fbm(x * 0.32, z * 0.32) * 0.35;
  h += bump(x, z, ASSETS.horizon.x, ASSETS.horizon.y, 1.6, 0.55);   // the mast stands on a hill
  h -= bump(x, z, SITE.x, SITE.y, 1.7, 0.25);                        // the site sits in a shallow basin
  h += bump(x, z, -7, -6, 4, 0.9) + bump(x, z, 8, -7, 3.5, 0.7);
  return h * 0.9;
}

/* ------------------------------------------------------------------ */
/* i18n for map labels                                                  */
/* ------------------------------------------------------------------ */
const FR = (document.documentElement.lang || '').toLowerCase().startsWith('fr');
const T = FR ? {
  signal: 'Signal radio · 2,4 GHz', sim: 'Simulation · données illustratives',
  pilot: 'Pilote', takeoff: 'Décollage', threat: 'Menace', lvl: ['faible', 'moyen', 'élevé', 'critique'],
  zone: 'Zone protégée', horizon: 'Horizon · station fixe', mobile: 'Mobile · valise', sk1: 'SK-1 · agent',
  pause: 'Pause', play: 'Lecture', pauseLabel: 'Mettre en pause l’animation de la carte',
  cam: 'Caméra', confirmed: 'drone confirmé', fpv: 'FPV · 5 865 MHz · −62 dBm', noid: 'sans identifiant',
  range: 'portée jusqu’à 10 km',
} : {
  signal: 'Radio signal · 2.4 GHz', sim: 'Simulation · illustrative data',
  pilot: 'Pilot', takeoff: 'Take-off', threat: 'Threat', lvl: ['low', 'medium', 'high', 'critical'],
  zone: 'Protected zone', horizon: 'Horizon · fixed station', mobile: 'Mobile · case', sk1: 'SK-1 · agent',
  pause: 'Pause', play: 'Play', pauseLabel: 'Pause the map animation',
  cam: 'Camera', confirmed: 'drone confirmed', fpv: 'FPV · 5,865 MHz · −62 dBm', noid: 'no identifier',
  range: 'range up to 10 km',
};
const num = (v, d) => FR ? v.toFixed(d).replace('.', ',') : v.toFixed(d);
const toLatLon = (x, z) => {
  const lat = 44.8296 - z * 0.009;
  const lon = -0.7048 + x * 0.0127;
  return `${num(Math.abs(lat), 4)}° N  ${num(Math.abs(lon), 4)}° W`;
};

/* ------------------------------------------------------------------ */
/* Modes (camera framings and what the map shows)                       */
/* ------------------------------------------------------------------ */
const MODES = {
  home:    { cam: [5.4, 7.0, 12.6], target: [1.3, 0, 0.4], origin: 'horizon', range: 0, cones: 0, story: 'id', zone: 1 },
  mobile:  { cam: [7.6, 3.6, 8.2], target: [2.4, 0, 1.2], origin: 'mobile', range: 0, cones: 0, story: 'id', zone: 1 },
  horizon: { cam: [2.6, 12.5, 16.0], target: [-0.6, 0, -1.6], origin: 'horizon', range: 10, cones: 0, story: 'id', zone: 1 },
  sk1:     { cam: [4.2, 2.8, 7.8], target: [1.0, 0, 1.9], origin: 'sk1', range: 0, cones: 0, story: 'fpv', zone: 0 },
  eyes:    { cam: [4.4, 4.0, 4.6], target: [1.0, 0, -0.9], origin: 'horizon', range: 0, cones: 1, story: 'id', zone: 1 },
};

/* ------------------------------------------------------------------ */
/* Shaders                                                              */
/* ------------------------------------------------------------------ */
const vert = /* glsl */`
  varying vec3 vPos;
  varying float vDepth;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const frag = /* glsl */`
  uniform float uTime, uHalf, uRange, uZoneOn, uZoneHot, uConesOn, uWaveGain;
  uniform vec2 uOrigin, uSite;
  uniform float uZoneR;
  uniform vec3 uBg, uInk, uRed;
  uniform vec4 uCones[3];
  varying vec3 vPos;
  varying float vDepth;
  float aaLine(float v, float w){ float f = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4); return 1.0 - smoothstep(0.0, w, f); }
  void main(){
    float h = vPos.y;
    float minor = aaLine(h / 0.09, 1.0);
    float major = aaLine(h / 0.45, 1.3);
    // map graticule every 2 km
    float gx = aaLine(vPos.x / 2.0, 0.8), gz = aaLine(vPos.z / 2.0, 0.8);
    float grid = max(gx, gz) * 0.05;

    // radio wavefronts from the active sensor
    float d = distance(vPos.xz, uOrigin);
    float w = fract((uTime * 1.9 - d) / 2.6);
    float front = exp(-w * 7.0) * smoothstep(0.0, 0.015, w);
    float atten = 1.0 - smoothstep(2.0, 13.0, d);
    float glow = front * atten * uWaveGain;

    float ink = minor * (0.13 + 0.9 * glow) + major * (0.32 + 0.75 * glow) + grid;
    ink += front * atten * 0.06 * uWaveGain;       // faint wash on the wavefront itself
    vec3 col = mix(uBg, uInk, clamp(ink, 0.0, 1.0));

    // range ring (Horizon, up to 10 km)
    if (uRange > 0.0) {
      float ang = atan(vPos.z - uOrigin.y, vPos.x - uOrigin.x);
      float dash = step(0.5, fract(ang * 30.0));
      float ring = (1.0 - smoothstep(0.0, fwidth(d) * 1.6, abs(d - uRange))) * dash;
      col = mix(col, uInk, ring * 0.75);
    }
    // protected zone
    if (uZoneOn > 0.0) {
      float dz = distance(vPos.xz, uSite);
      float ang = atan(vPos.z - uSite.y, vPos.x - uSite.x);
      float dash = step(0.42, fract(ang * 9.0));
      float edge = (1.0 - smoothstep(0.0, fwidth(dz) * 1.8, abs(dz - uZoneR))) * dash;
      float inside = 1.0 - smoothstep(uZoneR - 0.02, uZoneR, dz);
      // hatching inside the zone, like a restricted area on a chart
      float hatch = aaLine((vPos.x + vPos.z) / 0.18, 0.9) * inside;
      float k = uZoneOn * (0.55 + 0.45 * uZoneHot);
      col = mix(col, uRed, edge * k);
      col = mix(col, uRed, hatch * (0.10 + 0.22 * uZoneHot) * uZoneOn);
    }
    // camera fields of view (Eyes)
    if (uConesOn > 0.0) {
      for (int i = 0; i < 3; i++) {
        vec4 c = uCones[i];
        vec2 v = vPos.xz - c.xy;
        float r = length(v);
        float a = atan(v.y, v.x) - c.z;
        a = atan(sin(a), cos(a));
        float inA = 1.0 - smoothstep(0.30, 0.32, abs(a));
        float inR = 1.0 - smoothstep(2.1, 2.15, r);
        float m = inA * inR;
        float rim = m * (1.0 - smoothstep(0.0, fwidth(a) * 2.0, abs(abs(a) - 0.31)));
        vec3 tint = mix(uInk, uRed, c.w);
        col = mix(col, tint, (m * (0.07 + 0.08 * c.w) + rim * 0.55) * uConesOn);
      }
    }
    // fade into the night at the sheet edges and with distance
    float edgeF = 1.0 - smoothstep(0.55, 0.97, max(abs(vPos.x), abs(vPos.z)) / uHalf);
    float fog = 1.0 - smoothstep(14.0, 34.0, vDepth);
    col = mix(uBg, col, edgeF * fog);
    gl_FragColor = vec4(col, 1.0);
  }`;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const CREAM = new Color('#F5F2EA');
const RED = new Color('#E04848');
const BG = new Color('#0A0E1A');
const ground = (v2, lift = 0) => new Vector3(v2.x, height(v2.x, v2.y) + lift, v2.y);

function ringGeo(r, seg = 48) {
  const pts = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pts, 3)); return g;
}
function lineGeo(points) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(points.flatMap((p) => [p.x, p.y, p.z]), 3));
  return g;
}

/* ------------------------------------------------------------------ */
/* Scene                                                                */
/* ------------------------------------------------------------------ */
export function mountTerrain(host, opts = {}) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.innerWidth < 760;
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    host.classList.add('no-webgl');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(BG, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const labels = document.createElement('div');
  labels.className = 'map-labels';
  labels.setAttribute('aria-hidden', 'true');
  host.appendChild(labels);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 80);

  /* terrain */
  const seg = small ? 150 : 230;
  const geo = new PlaneGeometry(SIZE, SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeBoundingSphere();
  const uni = {
    uTime: { value: 0 }, uHalf: { value: SIZE / 2 }, uRange: { value: 0 },
    uZoneOn: { value: 1 }, uZoneHot: { value: 0 }, uConesOn: { value: 0 }, uWaveGain: { value: 1 },
    uOrigin: { value: ASSETS.horizon.clone() }, uSite: { value: SITE.clone() }, uZoneR: { value: ZONE_R },
    // raw sRGB values: the shader blends in display space, like ink on a printed sheet
    uBg: { value: new Vector3(10 / 255, 14 / 255, 26 / 255) }, uInk: { value: new Vector3(245 / 255, 242 / 255, 234 / 255) }, uRed: { value: new Vector3(224 / 255, 72 / 255, 72 / 255) },
    uCones: { value: CAMS.map((c) => new Vector4(c.p.x, c.p.y, c.a, 0)) },
  };
  const terrain = new Mesh(geo, new ShaderMaterial({ uniforms: uni, vertexShader: vert, fragmentShader: frag }));
  scene.add(terrain);

  /* sensors on the ground */
  const inkMat = new LineBasicMaterial({ color: CREAM, transparent: true, opacity: 0.9 });
  const sensors = {};
  // Horizon: mast + box
  {
    const g = new Group(); const base = ground(ASSETS.horizon);
    g.position.copy(base);
    g.add(new Line(lineGeo([new Vector3(0, 0, 0), new Vector3(0, 0.62, 0)]), inkMat));
    const box = new Mesh(new BoxGeometry(0.12, 0.17, 0.06), new MeshBasicMaterial({ color: CREAM }));
    box.position.y = 0.6; g.add(box);
    for (const dx of [-0.04, 0, 0.04]) g.add(new Line(lineGeo([new Vector3(dx, 0.68, 0), new Vector3(dx, 0.8 + (dx === 0 ? 0.03 : 0), 0)]), inkMat));
    scene.add(g); sensors.horizon = { g, anchor: new Vector3(0, 0.85, 0) };
  }
  // Mobile: case on the ground
  {
    const g = new Group(); g.position.copy(ground(ASSETS.mobile));
    const box = new Mesh(new BoxGeometry(0.2, 0.07, 0.14), new MeshBasicMaterial({ color: CREAM }));
    box.position.y = 0.04; g.add(box);
    g.add(new LineLoop(ringGeo(0.22), inkMat));
    scene.add(g); sensors.mobile = { g, anchor: new Vector3(0, 0.12, 0) };
  }
  // SK-1: agent marker
  {
    const g = new Group(); g.position.copy(ground(ASSETS.sk1));
    g.add(new Line(lineGeo([new Vector3(0, 0, 0), new Vector3(0, 0.2, 0)]), inkMat));
    const box = new Mesh(new BoxGeometry(0.08, 0.09, 0.03), new MeshBasicMaterial({ color: CREAM }));
    box.position.y = 0.22; g.add(box);
    g.add(new LineLoop(ringGeo(0.14), inkMat));
    scene.add(g); sensors.sk1 = { g, anchor: new Vector3(0, 0.3, 0) };
  }
  // Eyes: cameras on poles
  const camMarks = CAMS.map((c) => {
    const g = new Group(); g.position.copy(ground(c.p));
    g.add(new Line(lineGeo([new Vector3(0, 0, 0), new Vector3(0, 0.22, 0)]), inkMat));
    const box = new Mesh(new BoxGeometry(0.1, 0.05, 0.05), new MeshBasicMaterial({ color: CREAM }));
    box.position.y = 0.23; box.rotation.y = -c.a; g.add(box);
    g.visible = false; scene.add(g); return g;
  });

  /* drone */
  const redMat = new LineBasicMaterial({ color: RED });
  const drone = new Group();
  {
    const arm = 0.09;
    drone.add(new Line(lineGeo([new Vector3(-arm, 0, -arm), new Vector3(arm, 0, arm)]), redMat));
    drone.add(new Line(lineGeo([new Vector3(-arm, 0, arm), new Vector3(arm, 0, -arm)]), redMat));
    for (const [x, z] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) {
      const r = new LineLoop(ringGeo(0.045, 20), redMat); r.position.set(x * arm, 0, z * arm); drone.add(r);
    }
    const body = new Mesh(new BoxGeometry(0.05, 0.02, 0.05), new MeshBasicMaterial({ color: RED }));
    drone.add(body);
  }
  drone.scale.setScalar(1.7);
  scene.add(drone);
  const dropMat = new LineDashedMaterial({ color: CREAM, dashSize: 0.04, gapSize: 0.04, transparent: true, opacity: 0.6 });
  const drop = new Line(lineGeo([new Vector3(), new Vector3()]), dropMat); scene.add(drop);
  const shadow = new LineLoop(ringGeo(0.05, 16), new LineBasicMaterial({ color: CREAM, transparent: true, opacity: 0.6 })); scene.add(shadow);
  const TRAIL_N = 70;
  const trailGeo = new BufferGeometry(); trailGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
  const trail = new Line(trailGeo, new LineBasicMaterial({ color: RED, transparent: true, opacity: 0.55 })); scene.add(trail);
  const trailPts = [];

  /* pilot & take-off */
  const pilot = new Group(); pilot.position.copy(ground(PILOT, 0.01));
  const pilotRing = new LineLoop(ringGeo(0.16), new LineBasicMaterial({ color: RED, transparent: true, opacity: 1 }));
  const pilotRing2 = new LineLoop(ringGeo(0.16), new LineBasicMaterial({ color: RED, transparent: true, opacity: 1 }));
  pilot.add(pilotRing, pilotRing2);
  const pilotDot = new Mesh(new BoxGeometry(0.05, 0.05, 0.05), new MeshBasicMaterial({ color: RED })); pilotDot.position.y = 0.03; pilot.add(pilotDot);
  scene.add(pilot);
  const linkMat = new LineDashedMaterial({ color: RED, dashSize: 0.07, gapSize: 0.05, transparent: true, opacity: 0.95 });
  const link = new Line(lineGeo([new Vector3(), new Vector3()]), linkMat); scene.add(link);
  const TAKEOFF = new Vector2(PILOT.x - 0.35, PILOT.y - 0.25);
  const takeoff = new LineLoop(lineGeo([new Vector3(0, 0, -0.1), new Vector3(0.09, 0, 0.06), new Vector3(-0.09, 0, 0.06)]), inkMat);
  takeoff.position.copy(ground(TAKEOFF, 0.01)); scene.add(takeoff);

  /* flight paths */
  const lift = 0.42;
  const pathFor = (pts) => new CatmullRomCurve3(pts.map(([x, z, a]) => new Vector3(x, height(x, z) + (a ?? lift), z)), false, 'centripetal');
  const PATHS = {
    id: pathFor([[TAKEOFF.x, TAKEOFF.y, 0.02], [TAKEOFF.x - 0.2, TAKEOFF.y - 0.2, 0.3], [3.0, 0.2], [1.9, -0.4], [1.1, -1.2], [0.2, -0.9], [0.4, 0.0], [1.6, 0.3], [3.4, 0.8], [TAKEOFF.x, TAKEOFF.y, 0.02]]),
    fpv: pathFor([[7.2, 0.4, 0.22], [5.4, 1.4, 0.18], [3.6, 2.3, 0.2], [2.0, 2.8, 0.16], [1.5, 3.9, 0.18], [2.7, 4.9, 0.22], [4.6, 5.7, 0.2]]),
  };

  /* HTML labels */
  const mk = (cls) => { const el = document.createElement('div'); el.className = `map-label ${cls}`; labels.appendChild(el); return el; };
  const L = {
    drone: mk('is-drone'), pilot: mk('is-pilot'), sensor: mk('is-asset'), zone: mk('is-zone'),
    takeoff: mk('is-small'), cam: mk('is-asset is-cam'), sim: document.createElement('div'),
  };
  L.sim.className = 'map-sim'; L.sim.textContent = T.sim; host.appendChild(L.sim);
  // WCAG 2.2.2: the looping scene can be paused
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.className = 'map-pause';
  let userPaused = false;
  const ICON_P = '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="3" height="8"/><rect x="6" y="1" width="3" height="8"/></svg>';
  const ICON_R = '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M2 1l7 4-7 4z"/></svg>';
  const paintPause = () => {
    pauseBtn.innerHTML = (userPaused ? ICON_R : ICON_P) + `<span>${userPaused ? T.play : T.pause}</span>`;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', T.pauseLabel);
  };

  /* state */
  let mode = MODES[opts.mode] ? opts.mode : 'home';
  const camPos = new Vector3(...MODES[mode].cam);
  const camTgt = new Vector3(...MODES[mode].target);
  const wantPos = camPos.clone(), wantTgt = camTgt.clone();
  const pointer = new Vector2(), pointerS = new Vector2();
  let storyT0 = 0;
  let viewShift = 0, viewShiftWant = opts.shift ?? 0;

  function setMode(m) {
    if (!MODES[m] || m === mode) return;
    const prevStory = MODES[mode].story;
    mode = m;
    wantPos.set(...MODES[m].cam); wantTgt.set(...MODES[m].target);
    if (MODES[m].story !== prevStory) { storyT0 = clock; trailPts.length = 0; }
  }
  function setShift(s) { viewShiftWant = s; if (reduce) { viewShift = s; resize(); } }

  /* sizing */
  let W = 1, H = 1;
  function resize() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    camera.aspect = W / H;
    // shift the optical centre so the action sits beside the copy
    if (Math.abs(viewShift) > 0.001) camera.setViewOffset(W, H, -viewShift * W, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  window.addEventListener('pointermove', (e) => {
    pointer.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  /* projection of labels */
  const tmp = new Vector3();
  function place(el, v3, show) {
    if (!show) { el.style.opacity = '0'; return; }
    tmp.copy(v3).project(camera);
    if (tmp.z > 1 || tmp.x < -1.2 || tmp.x > 1.2 || tmp.y < -1.2 || tmp.y > 1.2) { el.style.opacity = '0'; return; }
    const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.style.opacity = '1';
  }
  const SERIAL = '1581F5FHD23A0098';
  function scramble(text, k) {
    if (k >= 1) return text;
    const n = Math.floor(text.length * k);
    const glyphs = '0123456789ABCDEF';
    let out = text.slice(0, n);
    for (let i = n; i < text.length; i++) out += text[i] === ' ' || text[i] === '·' ? text[i] : glyphs[(Math.random() * 16) | 0];
    return out;
  }

  /* frame */
  let clock = 0, last = performance.now(), running = false, visible = true;
  const dP = new Vector3();
  function frame(dt) {
    clock += dt;
    const M = MODES[mode];
    const t = clock - storyT0;
    uni.uTime.value = clock;

    // camera easing + pointer lean
    const k = 1 - Math.pow(0.0025, dt);
    if (reduce) { camPos.copy(wantPos); camTgt.copy(wantTgt); } else { camPos.lerp(wantPos, k * 0.9); camTgt.lerp(wantTgt, k * 0.9); }
    if (!reduce) pointerS.lerp(pointer, 1 - Math.pow(0.02, dt));
    camera.position.set(camPos.x + pointerS.x * 0.9, camPos.y - pointerS.y * 0.5, camPos.z);
    camera.lookAt(camTgt);
    if (Math.abs(viewShift - viewShiftWant) > 0.0005) { viewShift += (viewShiftWant - viewShift) * k; resize(); }

    // active sensor & map layers
    const o = ASSETS[M.origin];
    uni.uOrigin.value.lerp(o, 1 - Math.pow(0.001, dt));
    uni.uRange.value += (M.range - uni.uRange.value) * k;
    uni.uZoneOn.value += (M.zone - uni.uZoneOn.value) * k;
    uni.uConesOn.value += (M.cones - uni.uConesOn.value) * k;
    camMarks.forEach((g) => { g.visible = uni.uConesOn.value > 0.05; });

    // story
    const fpv = M.story === 'fpv';
    const CYCLE = fpv ? 9 : 17;
    const tc = t % CYCLE;
    const path = PATHS[M.story];
    const u = MathUtils.clamp(tc / (CYCLE - 0.6), 0, 1);
    const dp = path.getPointAt(u);
    drone.position.copy(dp);
    drone.rotation.y += dt * 0.6;
    const alive = tc < CYCLE - 0.4;
    drone.visible = alive;
    if (tc < 0.05) trailPts.length = 0;
    trailPts.push(dp.clone()); if (trailPts.length > TRAIL_N) trailPts.shift();
    const ta = trailGeo.attributes.position;
    for (let i = 0; i < TRAIL_N; i++) { const p = trailPts[Math.min(i, trailPts.length - 1)] || dp; ta.setXYZ(i, p.x, p.y, p.z); }
    ta.needsUpdate = true;
    const g = height(dp.x, dp.z);
    drop.geometry.attributes.position.setXYZ(0, dp.x, dp.y, dp.z);
    drop.geometry.attributes.position.setXYZ(1, dp.x, g + 0.005, dp.z);
    drop.geometry.attributes.position.needsUpdate = true; drop.computeLineDistances();
    shadow.position.set(dp.x, g + 0.006, dp.z);

    // identification & threat
    const detected = tc > 1.4;
    const idK = fpv ? 1 : MathUtils.clamp((tc - 2.2) / 0.9, 0, 1);
    const located = !fpv && tc > 3.6;
    const inZone = !fpv && dP.set(dp.x - SITE.x, 0, dp.z - SITE.y).length() < ZONE_R;
    uni.uZoneHot.value += ((inZone ? 1 : 0) - uni.uZoneHot.value) * k;
    const altM = Math.max(0, (dp.y - g) * 280);
    let score = 38, lvl = 1;
    if (inZone) { score = 78 + Math.round(Math.sin(clock) * 2); lvl = 2; }
    if (inZone && altM < 70) { score = 88; lvl = 3; }

    pilot.visible = located; link.visible = located && alive; takeoff.visible = !fpv;
    if (located) {
      const s = (clock * 0.7) % 1;
      pilotRing2.scale.setScalar(1 + s * 2.2); pilotRing2.material.opacity = 1 - s;
      const lp = link.geometry.attributes.position;
      const grow = MathUtils.clamp((tc - 3.6) / 0.8, 0, 1);
      const pg = pilot.position;
      lp.setXYZ(0, pg.x, pg.y + 0.03, pg.z);
      lp.setXYZ(1, MathUtils.lerp(pg.x, dp.x, grow), MathUtils.lerp(pg.y, dp.y, grow), MathUtils.lerp(pg.z, dp.z, grow));
      lp.needsUpdate = true; link.computeLineDistances();
    }

    // labels
    if (fpv) {
      L.drone.innerHTML = `<b>${T.fpv}</b><span>${T.noid} · ${T.threat} ${lvl === 1 ? '64' : score} · ${T.lvl[2]}</span>`;
    } else if (!detected) {
      L.drone.innerHTML = '';
    } else {
      const head = idK < 1 && tc < 2.2 ? T.signal : `DJI Mavic 3 · SN ${scramble(SERIAL, idK)}`;
      L.drone.innerHTML = `<b>${head}</b><span>ALT ${Math.round(altM)} m · ${T.threat} ${score} · <em class="lvl-${lvl}">${T.lvl[lvl]}</em></span>`;
    }
    place(L.drone, dP.copy(dp).add(new Vector3(0, 0.12, 0)), alive && (detected || fpv));
    if (located) {
      const dist = Math.round(dp.distanceTo(pilot.position) * 1000 / 10) * 10;
      L.pilot.innerHTML = `<b>${T.pilot} · ${FR ? dist.toLocaleString('fr-FR') : dist.toLocaleString('en-US')} m</b><span>${toLatLon(PILOT.x, PILOT.y)}</span>`;
    }
    place(L.pilot, pilot.position, located && alive);
    L.takeoff.textContent = T.takeoff;
    place(L.takeoff, takeoff.position, !fpv && tc > 4.2 && alive);
    const sensor = sensors[M.origin];
    L.sensor.innerHTML = `<b>${T[M.origin]}</b>${M.range ? `<span>${T.range}</span>` : ''}`;
    place(L.sensor, dP.copy(sensor.g.position).add(sensor.anchor), M.cones < 0.5);
    L.zone.textContent = T.zone;
    place(L.zone, new Vector3(SITE.x - ZONE_R * 0.7, height(SITE.x - ZONE_R * 0.7, SITE.y + ZONE_R * 0.7), SITE.y + ZONE_R * 0.7), M.zone > 0.5);

    // Eyes: which camera sees the drone
    let seen = -1;
    CAMS.forEach((c, i) => {
      const vx = dp.x - c.p.x, vz = dp.z - c.p.y;
      let a = Math.atan2(vz, vx) - c.a; a = Math.atan2(Math.sin(a), Math.cos(a));
      const on = M.cones && Math.abs(a) < 0.31 && Math.hypot(vx, vz) < 2.1 && alive ? 1 : 0;
      if (on && seen < 0) seen = i;
      const cv = uni.uCones.value[i]; cv.w += (on - cv.w) * k;
    });
    if (M.cones && seen >= 0) {
      L.cam.innerHTML = `<b>${T.cam} 0${seen + 1}</b><span>${T.confirmed}</span>`;
      place(L.cam, dP.copy(camMarks[seen].position).add(new Vector3(0, 0.3, 0)), true);
    } else place(L.cam, dp, false);

    renderer.render(scene, camera);
  }
  function renderOnce() { frame(0); }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    frame(dt);
    requestAnimationFrame(loop);
  }
  function start() { if (running || userPaused) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }

  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible && !document.hidden ? start() : stop(); }, { threshold: 0 });
  io.observe(host);
  document.addEventListener('visibilitychange', () => { (!document.hidden && visible) ? start() : stop(); });

  {
    paintPause(); host.appendChild(pauseBtn);
    pauseBtn.addEventListener('click', () => { userPaused = !userPaused; paintPause(); userPaused ? stop() : (visible && start()); });
  }
  // reduced motion: the scene still lives (waves, drone), but the camera never flies
  // and the pointer does not move it; the pause button stops everything
  if (reduce) { viewShift = viewShiftWant; resize(); }
  storyT0 = -1.0;
  start();
  host.classList.add('is-live');
  return { setMode, setShift, get mode() { return mode; } };
}

/* auto-mount */
function boot() {
  document.querySelectorAll('[data-terrain]').forEach((host) => {
    const api = mountTerrain(host, { mode: host.dataset.terrain, shift: parseFloat(host.dataset.shift || '0') });
    if (!api) return;
    host._terrain = api;
    const mq = window.matchMedia('(min-width: 900px)');
    const applyShift = () => api.setShift(mq.matches ? parseFloat(host.dataset.shift || '0') : 0);
    mq.addEventListener('change', applyShift); applyShift();
    // chapters that steer this map
    const chapters = document.querySelectorAll(`[data-map-mode][data-map="${host.id}"]`);
    if (chapters.length) {
      const co = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) api.setMode(e.target.dataset.mapMode); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      chapters.forEach((c) => co.observe(c));
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
