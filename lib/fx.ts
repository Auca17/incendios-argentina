import { DROP, ROUTE, ROUTE_N } from './airScene';

/*
 * Illustrated layer of the story scenes, drawn on its own canvas above the map. This file holds the
 * shared pieces (fire sites, fire, smoke, the lens) and the Chubut scene: an air tanker with its
 * shadow, its route, and the water it drops (lib/fxGround.ts holds the Mendoza ground crew). Seen from above, like the map, with depth from
 * shadows and altitude (the plane flies up and to the left of its shadow, toward the light of the
 * relief, which comes from the north-west).
 *
 * Determinism: every position comes from the scroll progress and fixed seeds. The only free motion
 * is the flicker of the flames, the embers and the drift of the smoke, driven by `time`, which is
 * frozen under reduced motion (and in the visual tests).
 */
export type Proj = (lon: number, lat: number) => [number, number];
type Cells = [number, number, number, number][];

export const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/*
 * Fire sites: the places where the detections of the episode piled up, one per cluster of cells.
 * Each site keeps its detections per week, so its fire can rise and fall with the weeks.
 */
export type Site = { lon: number; lat: number; weeks: number[]; seed: number };
export type Sites = { list: Site[]; ref: number; w0: number };

/** Sites from the cells of weeks [w0, w1), optionally only inside a box (minLon, maxLon, minLat, maxLat). */
export function fireSites(cells: Cells, w0: number, w1: number, max = 8, gap = 0.16, box?: number[], share = 0.05): Sites {
  const inside = (lon: number, lat: number, wk: number) =>
    wk >= w0 && wk < w1 && (!box || (lon >= box[0] && lon <= box[1] && lat >= box[2] && lat <= box[3]));
  const acc = new Map<string, [number, number, number]>();
  for (const [lon, lat, wk, n] of cells) {
    if (!inside(lon, lat, wk)) continue;
    const k = lon + ',' + lat;
    const c = acc.get(k);
    if (c) c[2] += n; else acc.set(k, [lon, lat, n]);
  }
  const all = [...acc.values()].sort((a, b) => b[2] - a[2]);
  const list: Site[] = [];
  for (const [lon, lat, n] of all) {
    if (list.length >= max || n < all[0][2] * share) break;
    if (list.some((s) => Math.hypot((s.lon - lon) * 0.74, s.lat - lat) < gap)) continue;
    list.push({ lon, lat, weeks: new Array(w1 - w0).fill(0), seed: list.length + 1 });
  }
  // every cell feeds its nearest site (within reach), week by week
  for (const [lon, lat, wk, n] of cells) {
    if (!inside(lon, lat, wk)) continue;
    let best: Site | null = null, bd = gap * 1.2;
    for (const s of list) {
      const d = Math.hypot((s.lon - lon) * 0.74, s.lat - lat);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) best.weeks[wk - w0] += n;
  }
  let ref = 1;
  for (const s of list) for (const v of s.weeks) if (v > ref) ref = v;
  return { list, ref, w0 };
}

/** Strength of a site at the continuous week wf (0..1, log scale against the strongest site-week). */
export function strength(s: Site, wf: number, sites: Sites) {
  let I = 0;
  for (let wk = 0; wk < s.weeks.length; wk++) I += s.weeks[wk] * Math.max(0, 1 - Math.abs(wf - (sites.w0 + wk + 0.5)));
  return I <= 0 ? 0 : Math.log(I + 1) / Math.log(sites.ref + 1);
}

/** Sprite cache: soft round blobs of one colour. */
const blobs = new Map<string, HTMLCanvasElement>();
export function blob(color: string, mid = 0.45): HTMLCanvasElement {
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
export const stamp = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, rx: number, ry = rx) =>
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

/* ---------- the route, projected to the screen every frame (it follows the camera exactly) ---------- */
type Route = { x: Float32Array; y: Float32Array };
const project = (proj: Proj): Route => {
  const x = new Float32Array(ROUTE_N + 1), y = new Float32Array(ROUTE_N + 1);
  ROUTE.forEach(([lon, lat], i) => { const p = proj(lon, lat); x[i] = p[0]; y[i] = p[1]; });
  return { x, y };
};
const at = (R: Route, s: number): [number, number] => {
  const v = clamp01(s) * ROUTE_N, i = Math.min(ROUTE_N - 1, Math.floor(v)), f = v - i;
  return [R.x[i] + (R.x[i + 1] - R.x[i]) * f, R.y[i] + (R.y[i + 1] - R.y[i]) * f];
};
const heading = (R: Route, s: number) => {
  const [x0, y0] = at(R, s - 0.004), [x1, y1] = at(R, s + 0.004);
  return Math.atan2(y1 - y0, x1 - x0);
};
/** Roll of the plane from how fast it turns (radians, + = right wing down). */
const roll = (R: Route, s: number) => {
  let d = heading(R, s + 0.015) - heading(R, s - 0.015);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.max(-0.55, Math.min(0.55, d * 1.4));
};
/** Altitude factor: it comes down for the drop and climbs away after it. */
const altitude = (s: number) => 1 - 0.42 * clamp01((s - DROP[0] + 0.05) / 0.05) * (1 - clamp01((s - DROP[1]) / 0.06));
/** Trace the route between s0 and s1 as one path. */
const trace = (g: CanvasRenderingContext2D, R: Route, s0: number, s1: number) => {
  if (s1 <= s0) return false;
  const [x0, y0] = at(R, s0);
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = Math.ceil(s0 * ROUTE_N); i < s1 * ROUTE_N; i++) g.lineTo(R.x[i], R.y[i]);
  const [x1, y1] = at(R, s1);
  g.lineTo(x1, y1);
  return true;
};

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
  routeIn: number;
  routeDim: number;
  ill: number;
  sites: Sites;
  time: number;
  /** Reduced motion: the plane is a still picture over the fire line and no water falls. */
  reduced?: boolean;
};

/** Seeded water particles: route position of release, lateral offset (fraction of span), size. */
const DROPS = Array.from({ length: 240 }, (_, i) => ({
  s: DROP[0] + (DROP[1] - DROP[0]) * hash(i + 3),
  side: (hash(i + 401) - 0.5) * 0.9,
  r: 0.5 + hash(i + 977) * 0.9,
}));
const FALL = 0.025; // route length a drop takes to reach the ground

export function drawFx(g: CanvasRenderingContext2D, f: FxInput) {
  g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  g.clearRect(0, 0, f.w, f.h);
  if (f.zoom <= 0.001) return;
  const z = f.zoom;
  const span = Math.min(150, Math.max(72, 0.16 * Math.min(f.band[1] - f.band[0], f.h))); // wingspan, px
  const R = project(f.proj);
  const normal = (s: number): [number, number] => { const a = heading(R, s); return [-Math.sin(a), Math.cos(a)]; };
  // from the ground point up to the plane, toward the light (north-west)
  const lift = (s: number): [number, number] => { const a = span * 0.62 * altitude(s); return [-0.55 * a, -0.8 * a]; };
  const flying = !f.reduced && f.plane > 0 && f.plane < 1;

  lens(g, f.w, f.h, f.band, z);

  // each site: its strength this week, and how much water reached it (place along the drop, distance)
  const sites = f.sites.list.map((st) => {
    const [x, y] = f.proj(st.lon, st.lat);
    let best = 0, bd = Infinity;
    for (let i = 0; i <= ROUTE_N; i += 2) {
      const d = Math.hypot(R.x[i] - x, R.y[i] - y);
      if (d < bd) { bd = d; best = i / ROUTE_N; }
    }
    let knock = 0, wetting = 0;
    if (best >= DROP[0] - 0.01 && best <= DROP[1] + 0.01 && bd < span * 0.7) {
      // knocked down when the water lands, then it partly recovers: one drop does not put a fire out
      const hit = clamp01((f.plane - best - FALL * 0.6) / 0.04), back = clamp01((f.plane - best - 0.12) / 0.2);
      knock = hit * (1 - 0.45 * back) * (1 - 0.5 * clamp01(bd / span - 0.3));
      wetting = hit * (1 - clamp01((f.plane - best - 0.06) / 0.05));
    }
    return { x, y, seed: st.seed, s: strength(st, f.wf, f.sites), douse: knock, wetting };
  });

  // 1. wet ground: water darkens and cools the land where the load landed
  g.globalCompositeOperation = 'multiply';
  const wet = blob('84, 92, 98', 0.35);
  for (const p of DROPS) {
    const age = (f.plane - p.s) / FALL;
    if (age <= 1) continue;
    const [gx, gy] = at(R, p.s), [nx, ny] = normal(p.s);
    const off = p.side * Math.abs(p.side) * 2 * span; // most water near the line, a ragged fringe
    g.globalAlpha = z * 0.16 * Math.min(1, (age - 1) * 2) * (1 - Math.abs(p.side));
    stamp(g, wet, gx + nx * off, gy + ny * off, span * 0.16 * p.r);
  }
  g.globalCompositeOperation = 'source-over';

  // 2. the route: a cartographic annotation. A faint dashed line drawn ahead (with a dark casing so
  // it reads on any terrain), small chevrons for the direction, the flown part in warm amber and a
  // short bright wake right behind the plane.
  const ra = z * f.routeDim;
  if (f.routeIn > 0) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (trace(g, R, 0, f.routeIn)) {
      g.globalAlpha = ra * 0.55;
      g.strokeStyle = 'rgba(10, 6, 3, 0.8)';
      g.lineWidth = 4;
      g.stroke();
      g.globalAlpha = ra * 0.85;
      g.setLineDash([7, 7]);
      g.strokeStyle = 'rgba(255, 236, 208, 0.75)';
      g.lineWidth = 1.6;
      g.stroke();
      g.setLineDash([]);
    }
    for (let s = 0.05; s < f.routeIn - 0.02; s += 0.07) {
      if (s < f.plane + 0.02) continue;
      const [x, y] = at(R, s);
      g.save();
      g.translate(x, y);
      g.rotate(heading(R, s));
      g.globalAlpha = ra * 0.8;
      g.strokeStyle = 'rgba(255, 226, 180, 0.9)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-4, -4.5);
      g.lineTo(1.5, 0);
      g.lineTo(-4, 4.5);
      g.stroke();
      g.restore();
    }
    const flown = f.reduced ? Math.min(f.plane, (DROP[0] + DROP[1]) / 2) : f.plane;
    if (trace(g, R, 0, flown)) {
      g.globalAlpha = ra * 0.35;
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = '#ff9a3a';
      g.lineWidth = 7;
      g.stroke();
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = ra;
      g.strokeStyle = '#ffb24a';
      g.lineWidth = 2.4;
      g.stroke();
    }
    if (flying) {
      // the wake: brighter and wider just behind the plane, fading back along the route
      for (let k = 0; k < 6; k++) {
        const s1 = f.plane - k * 0.008, s0 = s1 - 0.008;
        if (!trace(g, R, Math.max(0, s0), Math.max(0, s1))) continue;
        g.globalAlpha = ra * (1 - k / 6) * 0.9;
        g.strokeStyle = '#fff1c4';
        g.lineWidth = 3.2 - k * 0.3;
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }

  // 3. the fires, their smoke and the steam where the water lands
  drawFires(g, sites, z, span, f.time);

  // 5. falling water: released from the plane's belly, it keeps some speed, spreads and falls
  const fall = blob('214, 232, 242', 0.35);
  if (flying) {
    for (const p of DROPS) {
      const age = (f.plane - p.s) / FALL;
      if (age <= 0 || age > 1.25) continue;
      const a = Math.min(1, age), e = 1 - (1 - a) * (1 - a);
      const [gx, gy] = at(R, p.s), [nx, ny] = normal(p.s), [lx, ly] = lift(p.s);
      const ha = heading(R, p.s), fwd = span * 0.5 * a * (1 - 0.5 * a);
      const spread = p.side * span * (0.2 + 0.95 * e);
      const x = gx + lx * (1 - e) + nx * spread + Math.cos(ha) * fwd;
      const y = gy + ly * (1 - e) + ny * spread + Math.sin(ha) * fwd;
      g.globalAlpha = z * 0.6 * (age > 1 ? (1.25 - age) / 0.25 : 1) * (0.5 + 0.5 * (1 - a));
      stamp(g, fall, x, y, span * 0.06 * p.r * (1 + 1.9 * e));
    }
  }

  // 6. shadow on the terrain, then the aircraft. It is drawn whenever it is on the route: the route
  // starts and ends outside the frame, so it flies in and out instead of fading. Under reduced
  // motion it is a still picture over the drop, shown while the illustration note is.
  const sp = f.reduced ? (DROP[0] + DROP[1]) / 2 : f.plane;
  if (flying || (f.reduced && f.ill > 0.5)) {
    const [gx, gy] = at(R, sp), [lx, ly] = lift(sp);
    const ang = heading(R, sp), rl = f.reduced ? 0 : roll(R, sp);
    const dropping = flying && f.plane > DROP[0] && f.plane < DROP[1];
    g.globalAlpha = z;
    plane(g, gx, gy, span * 0.98, ang, rl, true, false);
    plane(g, gx + lx, gy + ly, span * (1 + 0.08 * (altitude(sp) - 0.58)), ang, rl, false, dropping);
  }
  g.globalAlpha = 1;
}

/** A vignette and a fine grain: the close-up reads as a lens on a printed plate. */
export function lens(g: CanvasRenderingContext2D, w: number, h: number, band: [number, number], z: number) {
  const cx = (band[0] + band[1]) / 2, cy = h / 2;
  const vg = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(5, 4, 3, 0)');
  vg.addColorStop(1, `rgba(5, 4, 3, ${(0.55 * z).toFixed(3)})`);
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.2 * z;
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(grain(), 'repeat')!;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

/** A fire to draw: screen position, strength (0..1), seed, how knocked down it is and its steam. */
export type FireItem = { x: number; y: number; s: number; seed: number; douse: number; wetting: number };

/** Glow on the ground and rising embers, the fires, then smoke drifting east and white steam. */
export function drawFires(g: CanvasRenderingContext2D, sites: FireItem[], z: number, span: number, time: number) {
  const f = { time };
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
      const a = (f.time * 0.4 + hash(c.seed * 7 + j)) % 1;
      g.globalAlpha = z * k * (1 - a);
      stamp(g, spark, c.x + (hash(c.seed * 3 + j) - 0.4) * h + a * h * 0.9, c.y - h * (0.5 + 1.8 * a), 1.4 + 1.4 * (1 - a));
    }
  }
  g.globalCompositeOperation = 'source-over';
  for (const c of sites) {
    const vis = clamp01((c.s - 0.08) / 0.12);
    if (vis <= 0) continue;
    // under the water the fire is knocked flat and pushed back, then partly comes back
    const knock = c.douse;
    g.globalAlpha = z * vis * (1 - 0.55 * knock);
    fire(g, c.x, c.y, fireH(c.s) * (1 - 0.72 * knock), c.s * (1 - 0.6 * knock), c.seed, f.time, lean + 0.5 * knock);
  }

  // smoke drifting east from each fire; white steam where the water hits it
  const smoke = blob('104, 96, 90', 0.5);
  const steam = blob('236, 240, 242', 0.5);
  for (const c of sites) {
    if (c.s < 0.15) continue;
    const k = c.s * (1 - 0.7 * c.douse);
    const h = fireH(c.s);
    for (let j = 0; j < 8; j++) {
      const a = (j + ((f.time * 0.16 + hash(c.seed)) % 1)) / 8; // 0 at the fire, 1 at the plume's end
      const px = c.x + h * 0.4 + a * span * (1 + 1.4 * c.s) + Math.sin(a * 5 + c.seed) * span * 0.08;
      const py = c.y - h * 0.9 - a * span * 0.3;
      g.globalAlpha = z * 0.36 * k * Math.sin(Math.PI * Math.min(1, a * 1.1));
      stamp(g, smoke, px, py, span * (0.1 + 0.32 * a) * (0.6 + 0.6 * c.s));
    }
    const d = c.wetting;
    if (d > 0) {
      for (let j = 0; j < 6; j++) {
        const a = (j / 6 + d * 0.6) % 1;
        g.globalAlpha = z * Math.min(1, 4 * d * (1 - d) + 0.2 * d) * 0.75 * (1 - a);
        stamp(g, steam, c.x + (hash(c.seed * 9 + j) - 0.3) * span * 0.35 + a * span * 0.3, c.y - span * (0.08 + 0.45 * a), span * (0.09 + 0.16 * a));
      }
    }
  }

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
