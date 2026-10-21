import { DROP, TRACK } from './airScene';

/*
 * Illustrated layer of the Chubut scene, drawn on its own canvas above the map: flames, smoke, an
 * air tanker with its shadow, and the water it drops. Seen from above, like the map, with depth from
 * shadows and altitude (the plane flies up and to the left of its shadow, toward the light of the
 * relief, which comes from the north-west).
 *
 * Determinism: every position comes from the scroll progress and fixed seeds. The only free motion
 * is the flicker of the flames and the drift of the smoke, driven by `time`, which is frozen under
 * reduced motion (and in the visual tests).
 */
type Proj = (lon: number, lat: number) => [number, number];
export type Flame = { lon: number; lat: number; w: number; seed: number };

const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Flames on the cells with the most detections up to the current week: one flame per cluster
 * (cells closer than `gap` degrees merge), at most `max`. Their size barely varies: they say
 * "the detections piled up here", never how much land burned.
 */
export function pickFlames(cells: [number, number, number, number][], week: number, max = 9, gap = 0.15): Flame[] {
  const acc = new Map<string, [number, number, number]>();
  for (const [lon, lat, wk, n] of cells) {
    if (wk >= week) continue;
    const k = lon + ',' + lat;
    const c = acc.get(k);
    if (c) c[2] += n; else acc.set(k, [lon, lat, n]);
  }
  const all = [...acc.values()].sort((a, b) => b[2] - a[2]);
  const top = all.length ? all[0][2] : 1;
  const out: Flame[] = [];
  for (const [lon, lat, n] of all) {
    if (out.length >= max || n < top * 0.08) break;
    if (out.some((f) => Math.hypot((f.lon - lon) * 0.74, f.lat - lat) < gap)) continue;
    out.push({ lon, lat, w: Math.log(n + 1) / Math.log(top + 1), seed: out.length + 1 });
  }
  return out;
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

/** One tongue of fire: a teardrop from a wide base to a pointed tip, leaning with the wind. */
function tongue(g: CanvasRenderingContext2D, x: number, y: number, hh: number, ww: number, lean: number) {
  const tx = x + lean * hh, ty = y - hh;
  g.beginPath();
  g.moveTo(x - ww, y);
  g.bezierCurveTo(x - ww * 1.2, y - hh * 0.42, tx - ww * 0.3, ty + hh * 0.38, tx, ty);
  g.bezierCurveTo(tx + ww * 0.2, ty + hh * 0.42, x + ww * 1.25, y - hh * 0.38, x + ww, y);
  g.quadraticCurveTo(x, y + ww * 0.6, x - ww, y);
}

/*
 * One fire: a few tongues of different heights side by side, each in three nested layers (deep red
 * outside, orange, a pale core), the inner ones added as light. Each tongue sways on its own.
 */
function fire(g: CanvasRenderingContext2D, x: number, y: number, h: number, seed: number, t: number) {
  const tongues = [
    [0, 1, 0],
    [-0.22, 0.66, 1.3],
    [0.24, 0.78, 2.6],
  ];
  for (const [ox, k, ph] of tongues) {
    const hh = h * k * (1 + 0.1 * Math.sin(t * (6.1 + ph) + seed * 2.3 + ph));
    const ww = h * 0.19 * (0.7 + 0.3 * k);
    const lean = 0.22 + 0.1 * Math.sin(t * 3.7 + seed + ph);
    const bx = x + ox * h * 0.55;
    const outer = g.createLinearGradient(bx, y, bx, y - hh);
    outer.addColorStop(0, 'rgba(200, 52, 24, 0.85)');
    outer.addColorStop(0.45, 'rgba(240, 90, 36, 0.6)');
    outer.addColorStop(1, 'rgba(255, 130, 60, 0)');
    g.globalCompositeOperation = 'source-over';
    g.filter = `blur(${Math.max(1, h * 0.07).toFixed(1)}px)`; // a soft edge: fire has no outline
    tongue(g, bx, y, hh, ww, lean);
    g.fillStyle = outer;
    g.fill();
    g.filter = 'none';
    g.globalCompositeOperation = 'lighter';
    const mid = g.createLinearGradient(bx, y, bx, y - hh * 0.7);
    mid.addColorStop(0, 'rgba(255, 140, 40, 0.9)');
    mid.addColorStop(1, 'rgba(255, 170, 60, 0)');
    g.filter = `blur(${Math.max(0.5, h * 0.03).toFixed(1)}px)`;
    tongue(g, bx, y, hh * 0.7, ww * 0.68, lean);
    g.fillStyle = mid;
    g.fill();
    g.filter = 'none';
    const core = g.createLinearGradient(bx, y, bx, y - hh * 0.4);
    core.addColorStop(0, 'rgba(255, 236, 190, 0.7)');
    core.addColorStop(1, 'rgba(255, 220, 140, 0)');
    tongue(g, bx, y, hh * 0.4, ww * 0.42, lean * 0.6);
    g.fillStyle = core;
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

export type FxInput = {
  proj: Proj;
  /** CSS px per degree of latitude on screen (camera scale). */
  scale: number;
  w: number;
  h: number;
  dpr: number;
  /** Map band [left, right] in CSS px, to centre the vignette on it. */
  band: [number, number];
  zoom: number;
  plane: number;
  show: number;
  flames: Flame[];
  time: number;
  /** Reduced motion: the plane is a still picture over the fire line and no water falls. */
  reduced?: boolean;
};

/** Seeded water particles: track position of release and lateral offset (fraction of the wingspan). */
const DROPS = Array.from({ length: 150 }, (_, i) => ({
  s: DROP[0] + (DROP[1] - DROP[0]) * hash(i + 3),
  side: (hash(i + 401) - 0.5) * 0.8,
  r: 0.6 + hash(i + 977) * 0.8,
}));

export function drawFx(g: CanvasRenderingContext2D, f: FxInput) {
  g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  g.clearRect(0, 0, f.w, f.h);
  if (f.zoom <= 0.001) return;
  const z = f.zoom;
  const [ax, ay] = f.proj(TRACK[0][0], TRACK[0][1]);
  const [bx, by] = f.proj(TRACK[1][0], TRACK[1][1]);
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len; // along the track
  const nx = -uy, ny = ux; // across it
  const span = Math.min(150, Math.max(72, 0.16 * Math.min(f.band[1] - f.band[0], f.h))); // wingspan, px
  const at = (s: number): [number, number] => [ax + dx * s, ay + dy * s];

  // a slow vignette: the close-up feels like a lens, not a zoomed atlas
  const cx = (f.band[0] + f.band[1]) / 2, cy = f.h / 2;
  const vg = g.createRadialGradient(cx, cy, Math.min(f.w, f.h) * 0.25, cx, cy, Math.max(f.w, f.h) * 0.75);
  vg.addColorStop(0, 'rgba(5, 4, 3, 0)');
  vg.addColorStop(1, `rgba(5, 4, 3, ${(0.55 * z).toFixed(3)})`);
  g.fillStyle = vg;
  g.fillRect(0, 0, f.w, f.h);
  // a fine grain over the close-up: the relief reads as a printed plate, not as an enlarged image
  g.globalAlpha = 0.2 * z;
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(grain(), 'repeat')!;
  g.fillRect(0, 0, f.w, f.h);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  // where each flame meets the drop: its place along the track and its distance across it
  const douse = f.flames.map((fl) => {
    const [x, y] = f.proj(fl.lon, fl.lat);
    const s = ((x - ax) * ux + (y - ay) * uy) / len;
    const d = Math.abs((x - ax) * nx + (y - ay) * ny);
    if (s < DROP[0] - 0.02 || s > DROP[1] + 0.02 || d > span * 0.75) return 0;
    return seg01((f.plane - s - 0.04) / 0.16) * (1 - 0.4 * Math.max(0, d / span - 0.35));
  });

  // 1. water on the ground: a wet, cool band left where the load landed
  g.globalCompositeOperation = 'multiply';
  const wet = blob('92, 118, 132', 0.4);
  for (const p of DROPS) {
    const age = (f.plane - p.s) / 0.1;
    if (age <= 1) continue;
    const [gx, gy] = at(p.s);
    const sx = gx + nx * p.side * span * 1.1, sy = gy + ny * p.side * span * 1.1;
    g.globalAlpha = z * 0.22 * Math.min(1, (age - 1) * 2);
    stamp(g, wet, sx, sy, span * 0.2 * p.r);
  }
  g.globalCompositeOperation = 'source-over';

  // 2. flames: a warm glow on the ground, embers rising, then the fire itself
  g.globalCompositeOperation = 'lighter';
  const glow = blob('255, 104, 36', 0.3);
  const spark = blob('255, 200, 120', 0.2);
  f.flames.forEach((fl, i) => {
    const k = 1 - 0.85 * douse[i];
    const [x, y] = f.proj(fl.lon, fl.lat);
    const h = span * (0.26 + 0.08 * fl.w) * k;
    g.globalAlpha = z * 0.5 * k;
    stamp(g, glow, x, y - h * 0.15, h * 2.1, h * 1.3);
    for (let j = 0; j < 4; j++) {
      const a = (f.time * 0.35 + hash(fl.seed * 7 + j)) % 1; // rise and fade, then start again
      g.globalAlpha = z * k * 0.9 * (1 - a);
      stamp(g, spark, x + (hash(fl.seed * 3 + j) - 0.3) * h * 0.8 + a * h * 0.6, y - h * (0.6 + 1.6 * a), 1.6 + 1.2 * (1 - a));
    }
  });
  g.globalAlpha = z;
  f.flames.forEach((fl, i) => {
    const k = 1 - 0.85 * douse[i];
    if (k < 0.05) return;
    const [x, y] = f.proj(fl.lon, fl.lat);
    fire(g, x, y, span * (0.32 + 0.1 * fl.w) * k, fl.seed, f.time);
  });

  // 3. smoke: plumes from the strongest flames, carried east by the wind; steam where water lands
  const smoke = blob('58, 52, 48', 0.5);
  const steam = blob('236, 240, 242', 0.5);
  f.flames.slice(0, 7).forEach((fl, i) => {
    const k = 1 - 0.85 * douse[fl.seed - 1];
    const [x, y] = f.proj(fl.lon, fl.lat);
    for (let j = 0; j < 7; j++) {
      const a = (j + ((f.time * 0.18 + hash(i) ) % 1)) / 7; // 0 at the flame, 1 at the plume's end
      const px = x + a * span * 1.6 + Math.sin(a * 5 + i) * span * 0.08;
      const py = y - span * 0.22 - a * span * 0.35;
      g.globalAlpha = z * 0.34 * k * Math.sin(Math.PI * Math.min(1, a * 1.15));
      stamp(g, smoke, px, py, span * (0.12 + 0.3 * a));
    }
    const d = douse[fl.seed - 1];
    if (d > 0 && d < 1) {
      for (let j = 0; j < 4; j++) {
        g.globalAlpha = z * 0.9 * d * (1 - d) * 2.2;
        stamp(g, steam, x + (hash(i * 9 + j) - 0.3) * span * 0.3, y - span * (0.1 + 0.12 * j) * (0.5 + d), span * (0.1 + 0.05 * j));
      }
    }
  });

  if (f.show <= 0.001 || f.plane <= 0 || f.plane >= 1) { g.globalAlpha = 1; return; }

  // the plane: ground point on the track, the aircraft up and to the left of it (toward the light)
  const [gx, gy] = at(f.reduced ? (DROP[0] + DROP[1]) / 2 : f.plane);
  const alt = span * 0.55;
  const ex = -0.55 * alt, ey = -0.8 * alt; // from the shadow to the plane
  const ang = Math.atan2(uy, ux);
  const bank = 0.04 * Math.sin(f.plane * 9);

  // 4. falling water: from the plane's belly down to the ground point, spreading as it falls
  const fall = blob('214, 232, 242', 0.35);
  for (const p of f.reduced ? [] : DROPS) {
    const age = (f.plane - p.s) / 0.1;
    if (age <= 0 || age > 1.2) continue;
    const a = Math.min(1, age);
    const e = 1 - (1 - a) * (1 - a);
    const [px0, py0] = at(p.s);
    const spread = p.side * span * (0.25 + 0.85 * e);
    const x = px0 + ex * (1 - e) + nx * spread - ux * span * 0.25 * a;
    const y = py0 + ey * (1 - e) + ny * spread - uy * span * 0.25 * a;
    g.globalAlpha = f.show * z * 0.62 * (age > 1 ? (1.2 - age) / 0.2 : 1) * (0.55 + 0.45 * (1 - a));
    stamp(g, fall, x, y, span * 0.07 * p.r * (1 + 1.8 * e));
  }

  // 5. shadow on the terrain, then the aircraft
  g.globalAlpha = f.show * z;
  plane(g, gx, gy, span * 0.98, ang, bank, true);
  plane(g, gx + ex, gy + ey, span, ang, bank, false);
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

const seg01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

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

function plane(g: CanvasRenderingContext2D, x: number, y: number, span: number, ang: number, bank: number, shadow: boolean) {
  PLANE ??= planePath();
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.scale(span, span * (1 - Math.abs(bank)));
  if (shadow) {
    g.fillStyle = 'rgba(8, 5, 3, 0.42)';
    g.fill(PLANE, 'nonzero');
    g.restore();
    return;
  }
  // body: warm white lit from the north-west, darker on the far side
  // the light direction (from the north-west of the screen) in the plane's own coordinates
  const lx = -Math.SQRT1_2 * (Math.cos(ang) + Math.sin(ang)), ly = Math.SQRT1_2 * (Math.sin(ang) - Math.cos(ang));
  const lit = g.createLinearGradient(0.5 * lx, 0.5 * ly, -0.5 * lx, -0.5 * ly);
  lit.addColorStop(0, '#f4efe4');
  lit.addColorStop(0.5, '#ddd5c6');
  lit.addColorStop(1, '#a89d8b');
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
  g.restore();
}
