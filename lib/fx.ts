import { DROP, PATH } from './airScene';

/*
 * Illustrated layer of the Chubut scene, drawn on its own canvas above the map: fire, smoke, an air
 * tanker with its shadow, and the water it drops. Seen from above, like the map, with depth from
 * shadows and altitude (the plane flies up and to the left of its shadow, toward the light of the
 * relief, which comes from the north-west).
 *
 * Determinism: every position comes from the scroll progress and fixed seeds. The only free motion
 * is the flicker of the flames, the embers and the drift of the smoke, driven by `time`, which is
 * frozen under reduced motion (and in the visual tests).
 */
type Proj = (lon: number, lat: number) => [number, number];
type Cells = [number, number, number, number][];

const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/*
 * Fire sites: the places where the detections of the episode piled up, one per cluster of cells.
 * Each site keeps its detections per week, so its fire can rise and fall with the weeks.
 */
export type Site = { lon: number; lat: number; weeks: number[]; seed: number };
export type Sites = { list: Site[]; ref: number };

export function fireSites(cells: Cells, lastWeek: number, max = 8, gap = 0.16): Sites {
  const acc = new Map<string, [number, number, number]>();
  for (const [lon, lat, wk, n] of cells) {
    if (wk >= lastWeek) continue;
    const k = lon + ',' + lat;
    const c = acc.get(k);
    if (c) c[2] += n; else acc.set(k, [lon, lat, n]);
  }
  const all = [...acc.values()].sort((a, b) => b[2] - a[2]);
  const list: Site[] = [];
  for (const [lon, lat, n] of all) {
    if (list.length >= max || n < all[0][2] * 0.05) break;
    if (list.some((s) => Math.hypot((s.lon - lon) * 0.74, s.lat - lat) < gap)) continue;
    list.push({ lon, lat, weeks: new Array(lastWeek).fill(0), seed: list.length + 1 });
  }
  // every cell feeds its nearest site (within reach), week by week
  for (const [lon, lat, wk, n] of cells) {
    if (wk >= lastWeek) continue;
    let best: Site | null = null, bd = gap * 1.2;
    for (const s of list) {
      const d = Math.hypot((s.lon - lon) * 0.74, s.lat - lat);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) best.weeks[wk] += n;
  }
  let ref = 1;
  for (const s of list) for (const v of s.weeks) if (v > ref) ref = v;
  return { list, ref };
}

/** Strength of a site at the continuous week wf (0..1, log scale against the strongest site-week). */
function strength(s: Site, wf: number, ref: number) {
  let I = 0;
  for (let wk = 0; wk < s.weeks.length; wk++) I += s.weeks[wk] * Math.max(0, 1 - Math.abs(wf - (wk + 0.5)));
  return I <= 0 ? 0 : Math.log(I + 1) / Math.log(ref + 1);
}

/** Sprite cache: soft round blobs of one colour. */
const blobs = new Map<string, HTMLCanvasElement>();
function blob(color: string, mid = 0.45): HTMLCanvasElement {
  const key = color + mid;
  let c = blobs.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${color}, 1)`);
    gr.addColorStop(mid, `rgba(${color}, 0.5)`);
    gr.addColorStop(1, `rgba(${color}, 0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    blobs.set(key, c);
  }
  return c;
}
const stamp = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, rx: number, ry = rx) =>
  g.drawImage(img, x - rx, y - ry, 2 * rx, 2 * ry);

/*
 * One tongue of fire: a body that narrows from a rounded base to a fine tip and snakes in an S as it
 * rises (the snake travels upward with time, which is what makes fire read as fire).
 */
function tongue(g: CanvasRenderingContext2D, x: number, y: number, h: number, w: number, lean: number, ph: number, t: number) {
  const N = 9;
  const L: [number, number][] = [], R: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const cx = x + lean * h * k * k + Math.sin(k * 4.2 - t * 6 + ph) * w * 0.55 * k;
    const cy = y - h * k;
    const hw = w * Math.pow(1 - k, 0.85) * (k < 0.18 ? 0.72 + 1.55 * k : 1);
    L.push([cx - hw, cy]);
    R.push([cx + hw, cy]);
  }
  g.beginPath();
  g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= N; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = N - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.quadraticCurveTo(x, y + w * 0.7, L[0][0], L[0][1]);
}

/*
 * A fire: several tongues of different heights spread over a base, more of them where the
 * detections are stronger. Each in three layers: deep red-orange outside (with a feathered halo,
 * since fire has no outline), orange, and a pale yellow core added as light. Small detached flames
 * break off the tips now and then.
 */
function fire(g: CanvasRenderingContext2D, x: number, y: number, h: number, s: number, seed: number, t: number, lean: number) {
  const n = 2 + Math.round(3 * s);
  const base = h * (0.22 + 0.3 * s);
  // tongues scattered over an uneven bed, not in a row: a random place across and in depth, the
  // tallest near the middle; the ones further back are drawn first
  const tongues = Array.from({ length: n }, (_, j) => {
    const r = hash(seed * 13 + j), q = hash(seed * 29 + j * 7);
    const off = j === 0 ? 0 : (r - 0.5) * 2 * base;
    const k = j === 0 ? 1 : 0.42 + 0.5 * q * (1 - Math.abs(off) / (base * 1.4));
    return { off, dy: j === 0 ? 0 : (q - 0.5) * h * 0.22, k, ph: r * 6.28, w: h * (0.17 + 0.09 * q) };
  }).sort((a, b) => a.dy - b.dy);
  // the burning bed the tongues rise from
  const ga0 = g.globalAlpha;
  g.globalCompositeOperation = 'lighter';
  const bed = g.createRadialGradient(x, y, 0, x, y, base * 1.5 + h * 0.2);
  bed.addColorStop(0, 'rgba(255, 140, 56, 0.4)');
  bed.addColorStop(0.45, 'rgba(220, 64, 22, 0.16)');
  bed.addColorStop(1, 'rgba(200, 40, 16, 0)');
  g.fillStyle = bed;
  g.beginPath();
  g.ellipse(x, y, base * 1.5 + h * 0.2, (base * 1.5 + h * 0.2) * 0.4, 0, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = ga0;
  const pass = (fill: (bx: number, by: number, hh: number) => string | CanvasGradient, kh: number, kw: number, op: GlobalCompositeOperation, a: number) => {
    g.globalCompositeOperation = op;
    for (const tg of tongues) {
      const bx = x + tg.off, by = y + tg.dy;
      const hh = h * tg.k * kh * (1 + 0.1 * Math.sin(t * 5.3 + tg.ph));
      g.globalAlpha = a;
      tongue(g, bx, by, hh, tg.w * kw, lean * (0.8 + 0.4 * tg.k), tg.ph, t);
      g.fillStyle = fill(bx, by, hh);
      g.fill();
    }
  };
  const outer = (bx: number, by: number, hh: number) => {
    const gr = g.createLinearGradient(bx, by, bx, by - hh);
    gr.addColorStop(0, 'rgba(190, 44, 20, 1)');
    gr.addColorStop(0.5, 'rgba(236, 84, 30, 0.9)');
    gr.addColorStop(1, 'rgba(255, 120, 50, 0)');
    return gr;
  };
  const ga = g.globalAlpha;
  pass(outer, 1.12, 1.45, 'source-over', ga * 0.28); // feathered edge
  pass(outer, 1, 1, 'source-over', ga * 0.92);
  pass((bx, by, hh) => {
    const gr = g.createLinearGradient(bx, by, bx, by - hh);
    gr.addColorStop(0, 'rgba(255, 150, 40, 0.95)');
    gr.addColorStop(1, 'rgba(255, 190, 70, 0)');
    return gr;
  }, 0.74, 0.62, 'lighter', ga * 0.85);
  pass((bx, by, hh) => {
    const gr = g.createLinearGradient(bx, by, bx, by - hh);
    gr.addColorStop(0, 'rgba(255, 246, 214, 0.95)');
    gr.addColorStop(1, 'rgba(255, 226, 150, 0)');
    return gr;
  }, 0.44, 0.34, 'lighter', ga * 0.8);
  // detached flames: they break off the tallest tip, rise and vanish
  g.globalCompositeOperation = 'lighter';
  for (let j = 0; j < Math.min(2, n); j++) {
    const a = (t * 1.1 + hash(seed * 31 + j)) % 1;
    const tg = tongues[j];
    const hh = h * tg.k;
    g.globalAlpha = ga * 0.7 * Math.sin(Math.PI * a);
    tongue(g, x + tg.off + lean * hh * (1 + a * 0.5), y + tg.dy - hh * (0.95 + 0.5 * a), hh * 0.22 * (1 - 0.5 * a), tg.w * 0.35, lean, tg.ph, t);
    g.fillStyle = 'rgba(255, 140, 50, 0.9)';
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = ga;
}

/* ---------- the plane's track: a cubic curve in screen space ---------- */
type Track = { p: [number, number][] };
const bez = (T: Track, s: number): [number, number] => {
  const [a, b, c, d] = T.p, m = 1 - s;
  return [
    m * m * m * a[0] + 3 * m * m * s * b[0] + 3 * m * s * s * c[0] + s * s * s * d[0],
    m * m * m * a[1] + 3 * m * m * s * b[1] + 3 * m * s * s * c[1] + s * s * s * d[1],
  ];
};
const heading = (T: Track, s: number) => {
  const [x0, y0] = bez(T, Math.max(0, s - 0.005)), [x1, y1] = bez(T, Math.min(1, s + 0.005));
  return Math.atan2(y1 - y0, x1 - x0);
};
/** Roll of the plane from how fast it turns (radians, + = right wing down). */
const roll = (T: Track, s: number) => {
  let d = heading(T, Math.min(1, s + 0.04)) - heading(T, Math.max(0, s - 0.04));
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.max(-0.55, Math.min(0.55, d * 1.6));
};
/** Altitude factor: it comes down for the drop and climbs away after it. */
const altitude = (s: number) => 1 - 0.42 * clamp01((s - DROP[0] + 0.12) / 0.12) * (1 - clamp01((s - DROP[1]) / 0.14));

export type FxInput = {
  proj: Proj;
  w: number;
  h: number;
  dpr: number;
  /** Map band [left, right] in CSS px, to centre the vignette on it. */
  band: [number, number];
  zoom: number;
  wf: number;
  plane: number;
  show: number;
  sites: Sites;
  time: number;
  /** Reduced motion: the plane is a still picture over the fire line and no water falls. */
  reduced?: boolean;
};

/** Seeded water particles: track position of release, lateral offset (fraction of span), size. */
const DROPS = Array.from({ length: 240 }, (_, i) => ({
  s: DROP[0] + (DROP[1] - DROP[0]) * hash(i + 3),
  side: (hash(i + 401) - 0.5) * 0.9,
  r: 0.5 + hash(i + 977) * 0.9,
}));
const FALL = 0.07; // track length a drop takes to reach the ground

export function drawFx(g: CanvasRenderingContext2D, f: FxInput) {
  g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  g.clearRect(0, 0, f.w, f.h);
  if (f.zoom <= 0.001) return;
  const z = f.zoom;
  const span = Math.min(150, Math.max(72, 0.16 * Math.min(f.band[1] - f.band[0], f.h))); // wingspan, px
  const T: Track = { p: PATH.map(([lon, lat]) => f.proj(lon, lat)) };
  const normal = (s: number): [number, number] => { const a = heading(T, s); return [-Math.sin(a), Math.cos(a)]; };
  // from the ground point up to the plane, toward the light (north-west)
  const lift = (s: number): [number, number] => { const a = span * 0.62 * altitude(s); return [-0.55 * a, -0.8 * a]; };

  // a slow vignette and a fine grain: the close-up reads as a lens on a printed plate
  const cx = (f.band[0] + f.band[1]) / 2, cy = f.h / 2;
  const vg = g.createRadialGradient(cx, cy, Math.min(f.w, f.h) * 0.25, cx, cy, Math.max(f.w, f.h) * 0.75);
  vg.addColorStop(0, 'rgba(5, 4, 3, 0)');
  vg.addColorStop(1, `rgba(5, 4, 3, ${(0.55 * z).toFixed(3)})`);
  g.fillStyle = vg;
  g.fillRect(0, 0, f.w, f.h);
  g.globalAlpha = 0.2 * z;
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(grain(), 'repeat')!;
  g.fillRect(0, 0, f.w, f.h);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  // each site: its strength this week, and how much water reached it (place along the drop, distance)
  const sites = f.sites.list.map((st) => {
    const [x, y] = f.proj(st.lon, st.lat);
    let best = 0, bd = Infinity;
    for (let i = 0; i <= 40; i++) {
      const s = i / 40, [px, py] = bez(T, s), d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = s; }
    }
    let douse = 0;
    if (best >= DROP[0] - 0.03 && best <= DROP[1] + 0.03 && bd < span * 0.7) {
      douse = clamp01((f.plane - best - FALL * 0.6) / 0.12) * (1 - 0.5 * clamp01(bd / span - 0.3));
    }
    return { st, x, y, s: strength(st, f.wf, f.sites.ref), douse };
  });

  // 1. wet ground: water darkens and cools the land where the load landed
  g.globalCompositeOperation = 'multiply';
  const wet = blob('84, 92, 98', 0.35);
  for (const p of DROPS) {
    const age = (f.plane - p.s) / FALL;
    if (age <= 1) continue;
    const [gx, gy] = bez(T, p.s), [nx, ny] = normal(p.s);
    const off = p.side * Math.abs(p.side) * 2 * span; // most water near the line, a ragged fringe
    g.globalAlpha = z * 0.16 * Math.min(1, (age - 1) * 2) * (1 - Math.abs(p.side));
    stamp(g, wet, gx + nx * off, gy + ny * off, span * 0.16 * p.r);
  }
  g.globalCompositeOperation = 'source-over';

  // 2. glow on the ground and rising embers, then the fire
  const glow = blob('255, 104, 36', 0.3);
  const spark = blob('255, 200, 120', 0.2);
  const lean = 0.32; // the westerlies push the flames east
  const fireH = (s: number) => span * (0.26 + 0.34 * s);
  g.globalCompositeOperation = 'lighter';
  for (const c of sites) {
    if (c.s < 0.08) continue;
    const k = c.s * (1 - 0.8 * c.douse);
    const h = fireH(c.s);
    g.globalAlpha = z * 0.55 * k;
    stamp(g, glow, c.x + h * 0.15, c.y - h * 0.1, h * (1.4 + 1.2 * c.s), h * (0.9 + 0.6 * c.s));
    for (let j = 0; j < 2 + Math.round(4 * c.s); j++) {
      const a = (f.time * 0.4 + hash(c.st.seed * 7 + j)) % 1;
      g.globalAlpha = z * k * (1 - a);
      stamp(g, spark, c.x + (hash(c.st.seed * 3 + j) - 0.4) * h + a * h * 0.9, c.y - h * (0.5 + 1.8 * a), 1.4 + 1.4 * (1 - a));
    }
  }
  g.globalCompositeOperation = 'source-over';
  for (const c of sites) {
    const vis = clamp01((c.s - 0.08) / 0.12);
    if (vis <= 0) continue;
    // under the water the fire is knocked flat and pushed back, down to embers
    const knock = c.douse;
    g.globalAlpha = z * vis * (1 - 0.55 * knock);
    fire(g, c.x, c.y, fireH(c.s) * (1 - 0.72 * knock), c.s * (1 - 0.6 * knock), c.st.seed, f.time, lean + 0.5 * knock);
  }

  // 3. smoke drifting east from each fire; white steam where the water hits it
  const smoke = blob('104, 96, 90', 0.5);
  const steam = blob('236, 240, 242', 0.5);
  for (const c of sites) {
    if (c.s < 0.15) continue;
    const k = c.s * (1 - 0.7 * c.douse);
    const h = fireH(c.s);
    for (let j = 0; j < 8; j++) {
      const a = (j + ((f.time * 0.16 + hash(c.st.seed)) % 1)) / 8; // 0 at the fire, 1 at the plume's end
      const px = c.x + h * 0.4 + a * span * (1 + 1.4 * c.s) + Math.sin(a * 5 + c.st.seed) * span * 0.08;
      const py = c.y - h * 0.9 - a * span * 0.3;
      g.globalAlpha = z * 0.36 * k * Math.sin(Math.PI * Math.min(1, a * 1.1));
      stamp(g, smoke, px, py, span * (0.1 + 0.32 * a) * (0.6 + 0.6 * c.s));
    }
    const d = c.douse;
    if (d > 0 && d < 1) {
      for (let j = 0; j < 6; j++) {
        const a = (j / 6 + d * 0.6) % 1;
        g.globalAlpha = z * Math.min(1, 4 * d * (1 - d)) * 0.75 * (1 - a);
        stamp(g, steam, c.x + (hash(c.st.seed * 9 + j) - 0.3) * span * 0.35 + a * span * 0.3, c.y - span * (0.08 + 0.45 * a), span * (0.09 + 0.16 * a));
      }
    }
  }

  if (f.show <= 0.001 || (!f.reduced && (f.plane <= 0 || f.plane >= 1))) { g.globalAlpha = 1; return; }
  const sp = f.reduced ? (DROP[0] + DROP[1]) / 2 : f.plane;

  // 4. falling water: released from the plane's belly, it keeps some speed, spreads and falls
  const fall = blob('214, 232, 242', 0.35);
  if (!f.reduced) {
    for (const p of DROPS) {
      const age = (f.plane - p.s) / FALL;
      if (age <= 0 || age > 1.25) continue;
      const a = Math.min(1, age), e = 1 - (1 - a) * (1 - a);
      const [gx, gy] = bez(T, p.s), [nx, ny] = normal(p.s), [lx, ly] = lift(p.s);
      const ha = heading(T, p.s), fwd = span * 0.5 * a * (1 - 0.5 * a);
      const spread = p.side * span * (0.2 + 0.95 * e);
      const x = gx + lx * (1 - e) + nx * spread + Math.cos(ha) * fwd;
      const y = gy + ly * (1 - e) + ny * spread + Math.sin(ha) * fwd;
      g.globalAlpha = f.show * z * 0.6 * (age > 1 ? (1.25 - age) / 0.25 : 1) * (0.5 + 0.5 * (1 - a));
      stamp(g, fall, x, y, span * 0.06 * p.r * (1 + 1.9 * e));
    }
  }

  // 5. shadow on the terrain, then the aircraft (banking into the turn, lower during the drop)
  const [gx, gy] = bez(T, sp), [lx, ly] = lift(sp);
  const ang = heading(T, sp), rl = f.reduced ? 0 : roll(T, sp);
  const dropping = !f.reduced && f.plane > DROP[0] && f.plane < DROP[1];
  g.globalAlpha = f.show * z;
  plane(g, gx, gy, span * 0.98, ang, rl, true, false);
  plane(g, gx + lx, gy + ly, span * (1 + 0.08 * (altitude(sp) - 0.58)), ang, rl, false, dropping);
  g.globalAlpha = 1;
}

let GRAIN: HTMLCanvasElement | null = null;
function grain() {
  if (GRAIN) return GRAIN;
  GRAIN = document.createElement('canvas');
  GRAIN.width = GRAIN.height = 128;
  const g = GRAIN.getContext('2d')!;
  const im = g.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const v = 128 + (hash(i) - 0.5) * 70;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
    im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return GRAIN;
}

/*
 * A single-engine air tanker seen from above (an agricultural / fire-fighting monoplane: long
 * straight wing, slim fuselage, big radial nose, horizontal tail). Unit wingspan, nose toward +x.
 */
function planePath(): Path2D {
  const p = new Path2D();
  // fuselage
  p.moveTo(0.44, 0);
  p.bezierCurveTo(0.44, -0.045, 0.36, -0.06, 0.24, -0.055);
  p.lineTo(-0.3, -0.03);
  p.bezierCurveTo(-0.44, -0.022, -0.5, -0.012, -0.52, 0);
  p.bezierCurveTo(-0.5, 0.012, -0.44, 0.022, -0.3, 0.03);
  p.lineTo(0.24, 0.055);
  p.bezierCurveTo(0.36, 0.06, 0.44, 0.045, 0.44, 0);
  p.closePath();
  // wing, slightly tapered with rounded tips
  p.moveTo(0.15, -0.06);
  p.lineTo(0.13, -0.47);
  p.quadraticCurveTo(0.12, -0.5, 0.08, -0.5);
  p.lineTo(0.03, -0.5);
  p.quadraticCurveTo(0.0, -0.5, 0.0, -0.47);
  p.lineTo(-0.01, -0.06);
  p.lineTo(-0.01, 0.06);
  p.lineTo(0.0, 0.47);
  p.quadraticCurveTo(0.0, 0.5, 0.03, 0.5);
  p.lineTo(0.08, 0.5);
  p.quadraticCurveTo(0.12, 0.5, 0.13, 0.47);
  p.lineTo(0.15, 0.06);
  p.closePath();
  // tailplane
  p.moveTo(-0.39, -0.025);
  p.lineTo(-0.42, -0.17);
  p.quadraticCurveTo(-0.43, -0.185, -0.46, -0.18);
  p.lineTo(-0.49, -0.17);
  p.lineTo(-0.49, 0.17);
  p.lineTo(-0.46, 0.18);
  p.quadraticCurveTo(-0.43, 0.185, -0.42, 0.17);
  p.lineTo(-0.39, 0.025);
  p.closePath();
  return p;
}
let PLANE: Path2D | null = null;

function plane(g: CanvasRenderingContext2D, x: number, y: number, span: number, ang: number, rl: number, shadow: boolean, dropping: boolean) {
  PLANE ??= planePath();
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  // banking foreshortens the wing; the lower wing shifts slightly toward the turn
  g.scale(span, span * Math.cos(rl));
  g.translate(0, Math.sin(rl) * 0.04);
  if (shadow) {
    g.fillStyle = 'rgba(8, 5, 3, 0.42)';
    g.fill(PLANE, 'nonzero');
    g.restore();
    return;
  }
  // body: warm white lit from the north-west; the wing turned away from the light goes darker
  const lx = -Math.SQRT1_2 * (Math.cos(ang) + Math.sin(ang)), ly = Math.SQRT1_2 * (Math.sin(ang) - Math.cos(ang)) - rl * 0.8;
  const lit = g.createLinearGradient(0.5 * lx, 0.5 * ly, -0.5 * lx, -0.5 * ly);
  lit.addColorStop(0, '#f4efe4');
  lit.addColorStop(0.5, '#ddd5c6');
  lit.addColorStop(1, '#a1968a');
  g.fillStyle = lit;
  g.fill(PLANE, 'nonzero');
  g.lineWidth = 1.2 / span;
  g.strokeStyle = 'rgba(30, 20, 12, 0.55)';
  g.stroke(PLANE);
  // red wing tips and tail tips, the usual high-visibility marking of fire aircraft
  g.save();
  g.clip(PLANE);
  g.fillStyle = '#c8321f';
  g.fillRect(-0.02, -0.52, 0.18, 0.08);
  g.fillRect(-0.02, 0.44, 0.18, 0.08);
  g.fillRect(-0.5, -0.19, 0.1, 0.045);
  g.fillRect(-0.5, 0.145, 0.1, 0.045);
  g.restore();
  // canopy and engine cowling
  g.fillStyle = 'rgba(24, 34, 44, 0.85)';
  g.beginPath();
  g.ellipse(0.2, 0, 0.05, 0.03, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4a443c';
  g.beginPath();
  g.ellipse(0.425, 0, 0.022, 0.05, 0, 0, Math.PI * 2);
  g.fill();
  // propeller disc: a faint blur in front of the nose
  g.fillStyle = 'rgba(40, 36, 32, 0.22)';
  g.beginPath();
  g.ellipse(0.455, 0, 0.012, 0.12, 0, 0, Math.PI * 2);
  g.fill();
  // open hopper doors while it drops: a pale veil leaving the belly
  if (dropping) {
    const gr = g.createLinearGradient(0.02, 0, -0.5, 0);
    gr.addColorStop(0, 'rgba(225, 238, 246, 0.85)');
    gr.addColorStop(1, 'rgba(225, 238, 246, 0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0.02, -0.06);
    g.lineTo(-0.55, -0.16);
    g.lineTo(-0.55, 0.16);
    g.lineTo(0.02, 0.06);
    g.closePath();
    g.fill();
  }
  g.restore();
}
