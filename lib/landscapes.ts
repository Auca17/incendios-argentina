/*
 * Establishing shots of the regions: an illustrated landscape that opens each story before the map
 * (components/Landscape.tsx). Canvas 2D, no images, no libraries. Each landscape is a few layers
 * painted once (sky, far, middle, near), placed every frame with a little parallax, and one live
 * element driven by the scroll: the smoke of the fire rising and the light turning warm.
 *
 * They are illustrations of the kind of place, not of the fire itself, and the page says so. Each one
 * has one idea:
 *  - misiones:   the dense, humid selva, and a smoke column rising out of it
 *  - corrientes: water and grass to the horizon, and a low fire front along it
 *  - cordoba:    the sierras in receding ridges, smoke settling in the valleys
 *  - delta:      the Paraná, its riachos and a lagoon among islands of pajonal, seen from above, under
 *                a curtain of smoke that turns the sun red
 *  - mendoza:    rows of vines under the Andes (a symbol of the province, not where it burned) and
 *                smoke on the piedemonte, where the fire of 2023 was
 * Everything is a pure function of the shot's progress k (0..1) and of a fixed seed per region: the
 * same scroll position always paints the same pixels.
 */

export type Layer = {
  c: HTMLCanvasElement;
  /** 0 = sky (does not move), 1 = nearest plane. */
  depth: number;
  /** Live element drawn right after this layer, in the same frame of reference. */
  after?: (g: CanvasRenderingContext2D, W: number, H: number, k: number) => void;
  /** Rises into view from below with k (Mendoza's vine rows). */
  rise?: boolean;
};
/**
 * The stretch of terrain where a scene's fire burns (lib/landFire.ts): the surface y(x) of one
 * layer, in the same CSS-pixel frame the layer is painted in, and the part of it [x0, x1] that is in
 * view (not hidden by a nearer plane). The fire, its smoke and the response are drawn on it, after
 * that layer and with its transform, so they stay on the ground whatever the camera does.
 */
export type Ground = { layer: number; y: (x: number) => number; x0: number; x1: number };
export type Land = {
  layers: Layer[];
  grade: (g: CanvasRenderingContext2D, W: number, H: number, k: number) => void;
  /** The main stretch of terrain of the scene's fire (its spot is there). */
  ground?: Ground;
  /** Other stretches in the same layer, at other depths (the Delta: far and near islands). */
  zones?: Ground[];
  /** Screen height of the horizon, where there is one (rain and its haze follow it). */
  horizon?: number;
  /** Width the layers were painted at, wider than the screen when the shot pans (the Delta). */
  wide?: number;
};

/* ---------- small deterministic tools ---------- */

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in 0..1, period 256. */
function noise1(seed: number) {
  const r = rng(seed);
  const v = Array.from({ length: 256 }, r);
  return (x: number) => {
    const i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return v[i & 255] * (1 - u) + v[(i + 1) & 255] * u;
  };
}
function fbm(seed: number, oct: number, ridged = false) {
  const ns = Array.from({ length: oct }, (_, i) => noise1(seed + i * 101));
  return (x: number) => {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) {
      const v = ns[i](x * f);
      s += a * (ridged ? 1 - Math.abs(2 * v - 1) : v);
      n += a; a *= 0.5; f *= 2.03;
    }
    return s / n;
  };
}

/** Pixels per CSS px of the painted layers (set by buildLand): soft paintings need no full resolution. */
let RES = 1;
const layer = (W: number, H: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * RES));
  c.height = Math.max(1, Math.round(H * RES));
  const g = c.getContext('2d')!;
  g.scale(RES, RES);
  return [c, g];
};
const vgrad = (g: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) => {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
};
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/** A ridge from y(x) down to the bottom, filled with a vertical gradient. */
function ridge(g: CanvasRenderingContext2D, W: number, H: number, y: (x: number) => number, fill: string | CanvasGradient) {
  g.beginPath();
  g.moveTo(-10, H + 10);
  for (let x = -10; x <= W + 10; x += 4) g.lineTo(x, y(x));
  g.lineTo(W + 10, H + 10);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

/** A band of mist at height y (soft on both sides). */
function mist(g: CanvasRenderingContext2D, W: number, y: number, h: number, color: string, a: number) {
  g.fillStyle = vgrad(g, y - h, y + h * 0.4, [[0, `rgba(${color},0)`], [0.7, `rgba(${color},${a})`], [1, `rgba(${color},0)`]]);
  g.fillRect(0, y - h, W, h * 1.4);
}

/** A soft round puff of smoke, pre-rendered once per colour. */
const puffs = new Map<string, HTMLCanvasElement>();
function puff(rgb: string) {
  let c = puffs.get(rgb);
  if (c) return c;
  const [cc, g] = layer(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},0.55)`);
  gr.addColorStop(0.45, `rgba(${rgb},0.32)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  puffs.set(rgb, cc);
  return cc;
}

/**
 * A smoke column from (x, y) rising to `height` with a lean, as far as `k` (0..1) has grown it.
 * Puffs widen and thin with height; positions come from the seed, so nothing moves on its own.
 */
function plume(g: CanvasRenderingContext2D, x: number, y: number, height: number, lean: number, width: number, k: number, seed: number, rgb = '92,88,84', glow = 0) {
  if (k <= 0) return;
  const r = rng(seed);
  const p = puff(rgb);
  const n = 34;
  for (let i = 0; i < n; i++) {
    const f = i / n; // along the column
    if (f > k) break;
    const fade = 1 - seg(f, k - 0.18, k); // the head of the column is still forming
    const h = height * f;
    const cx = x + lean * f * f * height + (r() - 0.5) * width * (0.4 + f);
    const cy = y - h + (r() - 0.5) * 18;
    const rad = width * (0.45 + 1.6 * f) * (0.8 + 0.4 * r());
    g.globalAlpha = (0.9 - 0.55 * f) * fade;
    g.drawImage(p, cx - rad, cy - rad, rad * 2, rad * 2);
  }
  g.globalAlpha = 1;
  if (glow > 0) {
    const gr = g.createRadialGradient(x, y, 0, x, y, width * 2.6);
    gr.addColorStop(0, `rgba(255,150,60,${0.55 * glow})`);
    gr.addColorStop(0.35, `rgba(255,96,32,${0.25 * glow})`);
    gr.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gr;
    g.fillRect(x - width * 2.6, y - width * 2.6, width * 5.2, width * 5.2);
  }
}

/** A warm, smoky grade over the whole frame as the fire grows. */
function warm(g: CanvasRenderingContext2D, W: number, H: number, k: number, smoke: string, sm: number, glow: number) {
  if (k <= 0) return;
  // a plain warm haze (a blend mode over the whole frame cost too much on modest devices)
  g.fillStyle = `rgba(${smoke},${sm * k})`;
  g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, H * 0.3, 0, H);
  gr.addColorStop(0, 'rgba(255,120,40,0)');
  gr.addColorStop(1, `rgba(255,110,40,${glow * 0.45 * k})`);
  g.fillStyle = gr;
  g.fillRect(0, H * 0.3, W, H * 0.7);
}

/* ---------- Misiones: the selva ---------- */

function crowns(g: CanvasRenderingContext2D, W: number, H: number, base: number, amp: number, rMin: number, rMax: number, dark: string, lit: string, seed: number) {
  const r = rng(seed);
  const n = fbm(seed + 7, 3);
  const pts: [number, number, number][] = [];
  for (let x = -rMax; x < W + rMax; ) {
    const rad = rMin + (rMax - rMin) * r();
    pts.push([x, base - n(x / 160) * amp - r() * rad * 0.5, rad]);
    x += rad * (0.7 + 0.5 * r());
  }
  g.fillStyle = dark;
  g.fillRect(0, base, W, H - base);
  // each crown is a cluster of lumps (a cauliflower outline, not a ball)
  const lumps: [number, number, number][] = [];
  pts.forEach(([x, y, rad]) => {
    g.fillStyle = dark;
    g.fillRect(x - rad * 0.8, y, rad * 1.6, base - y + 2);
    const n = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.05 + 0.9 * (i / (n - 1))) + (r() - 0.5) * 0.3;
      const d = rad * (0.45 + 0.2 * r());
      lumps.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 + rad * 0.15, rad * (0.38 + 0.22 * r())]);
    }
    lumps.push([x, y + rad * 0.2, rad * 0.7]);
  });
  lumps.forEach(([x, y, q]) => {
    g.beginPath();
    g.ellipse(x, y, q, q * 0.86, 0, 0, Math.PI * 2);
    g.fillStyle = dark;
    g.fill();
  });
  // light from the upper left on each lump, so the canopy reads as foliage
  lumps.forEach(([x, y, q]) => {
    const gr = g.createRadialGradient(x - q * 0.3, y - q * 0.45, 0, x - q * 0.3, y - q * 0.45, q);
    gr.addColorStop(0, lit);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, q, q * 0.86, 0, 0, Math.PI * 2);
    g.fill();
  });
}

function frond(g: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, bend: number, color: string) {
  g.strokeStyle = color;
  g.fillStyle = color;
  // the rib: a curve that bends down as it goes out
  const pts: [number, number][] = [[x, y]];
  let px0 = x, py0 = y;
  for (let i = 1; i <= 24; i++) {
    const a = ang + bend * (i / 24);
    px0 += (Math.cos(a) * len) / 24;
    py0 += (Math.sin(a) * len) / 24;
    pts.push([px0, py0]);
  }
  g.lineWidth = Math.max(2, len * 0.012);
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.stroke();
  // leaflets, longer in the middle
  for (let i = 2; i < pts.length - 1; i++) {
    const f = i / pts.length;
    const [px, py] = pts[i];
    const l = len * 0.24 * Math.sin(Math.PI * f);
    const dir = Math.atan2(pts[i + 1][1] - py, pts[i + 1][0] - px);
    for (const s of [-1, 1]) {
      const a = dir + s * 1.05 + 0.35;
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + Math.cos(a) * l * 0.6, py + Math.sin(a) * l * 0.6 - l * 0.1, px + Math.cos(a + 0.4) * l, py + Math.sin(a + 0.4) * l + l * 0.25);
      g.lineWidth = Math.max(1.5, len * 0.008);
      g.stroke();
    }
  }
}

function misiones(W: number, H: number): Land {
  const [sky, gs] = layer(W, H);
  gs.fillStyle = vgrad(gs, 0, H * 0.62, [[0, '#1d2e2c'], [0.55, '#4f6a60'], [1, '#a9b7a4']]);
  gs.fillRect(0, 0, W, H);
  // a pale sun behind the humid air
  const sg = gs.createRadialGradient(W * 0.3, H * 0.32, 0, W * 0.3, H * 0.32, H * 0.5);
  sg.addColorStop(0, 'rgba(235,236,210,0.55)');
  sg.addColorStop(1, 'rgba(235,236,210,0)');
  gs.fillStyle = sg;
  gs.fillRect(0, 0, W, H);

  const [far, gf] = layer(W, H);
  const nf = fbm(11, 4);
  ridge(gf, W, H, (x) => H * 0.5 - nf(x / 380) * H * 0.12, vgrad(gf, H * 0.36, H * 0.7, [[0, '#56705f'], [1, '#3c5547']]));
  crowns(gf, W, H, H * 0.53, H * 0.05, 8, 18, '#3f5a4b', 'rgba(150,175,150,0.35)', 12);
  mist(gf, W, H * 0.6, H * 0.1, '200,212,196', 0.55);

  const [mid, gm] = layer(W, H);
  crowns(gm, W, H, H * 0.68, H * 0.07, 22, 46, '#1f3428', 'rgba(110,150,105,0.45)', 21);
  // a few emergent trees above the canopy: a leaning trunk, branches, a broad flat crown of lumps
  const re = rng(23);
  for (const [fx, fh] of [[0.16, 0.42], [0.47, 0.47], [0.83, 0.44]] as [number, number][]) {
    const x = W * fx, top = H * fh, foot = H * 0.66, lean = (re() - 0.5) * 30;
    gm.fillStyle = '#18291f';
    gm.beginPath();
    gm.moveTo(x - 5, foot); gm.lineTo(x + lean - 2, top + 14); gm.lineTo(x + lean + 2, top + 14); gm.lineTo(x + 5, foot);
    gm.fill();
    gm.strokeStyle = '#18291f';
    gm.lineWidth = 2.5;
    for (const s of [-1, 1]) {
      gm.beginPath(); gm.moveTo(x + lean * 0.8, top + 22); gm.quadraticCurveTo(x + lean + s * 24, top + 12, x + lean + s * 46, top + 6); gm.stroke();
    }
    for (let j = 0; j < 9; j++) {
      const a = (j / 8) * Math.PI;
      gm.fillStyle = j % 2 ? '#1c3025' : '#213829';
      gm.beginPath();
      gm.ellipse(x + lean - Math.cos(a) * 52 * (0.7 + 0.3 * re()), top + 4 - Math.sin(a) * 14 * re(), 20 + 10 * re(), 9 + 4 * re(), 0, 0, Math.PI * 2);
      gm.fill();
    }
  }
  mist(gm, W, H * 0.74, H * 0.08, '170,190,170', 0.4);

  const [near, gn] = layer(W, H);
  crowns(gn, W, H, H * 0.86, H * 0.05, 40, 80, '#0d1913', 'rgba(70,105,72,0.35)', 31);
  frond(gn, -20, H * 0.98, W * 0.34, -0.75, 0.9, '#08110c');
  frond(gn, -10, H * 1.02, W * 0.28, -0.35, 0.6, '#0a140e');
  frond(gn, W + 20, H * 0.96, W * 0.3, -2.45, -0.8, '#08110c');

  return {
    layers: [
      { c: sky, depth: 0 },
      { c: far, depth: 0.25, after: (g, W2, H2, k) => plume(g, W2 * 0.7, H2 * 0.62, H2 * 0.62, 0.35, H2 * 0.05, smooth(seg(k, 0.15, 0.9)), 41, '120,116,108', smooth(seg(k, 0.3, 0.9))) },
      { c: mid, depth: 0.55 },
      { c: near, depth: 1 },
    ],
    grade: (g, W2, H2, k) => warm(g, W2, H2, smooth(seg(k, 0.3, 1)), '70,60,50', 0.16, 0.22),
  };
}

/* ---------- Corrientes: the Iberá ---------- */

function corrientes(W: number, H: number): Land {
  const hz = H * 0.6;
  const [sky, gs] = layer(W, H);
  gs.fillStyle = vgrad(gs, 0, hz, [[0, '#1b2a3d'], [0.6, '#5d6e80'], [0.92, '#c9b9a0'], [1, '#d8c3a0']]);
  gs.fillRect(0, 0, W, hz + 1);
  // the water mirrors the sky, darker
  gs.fillStyle = vgrad(gs, hz, H, [[0, '#9d9686'], [0.25, '#55606a'], [1, '#18222c']]);
  gs.fillRect(0, hz, W, H - hz);
  const rs = rng(51);
  for (let i = 0; i < 70; i++) {
    const y = hz + (H - hz) * Math.pow(rs(), 1.6);
    const x = rs() * W, l = 20 + rs() * 120 * (y / H);
    gs.fillStyle = `rgba(220,214,196,${0.05 + 0.1 * rs()})`;
    gs.fillRect(x, y, l, 1.2);
  }

  const [far, gf] = layer(W, H);
  // isletas: small islands of trees on the horizon
  const rf = rng(52);
  for (let i = 0; i < 9; i++) {
    const x = W * rf(), w = 40 + 140 * rf(), h = 6 + 12 * rf();
    gf.fillStyle = '#2e3a33';
    gf.beginPath();
    gf.moveTo(x - w / 2, hz + 1);
    for (let j = 0; j <= 12; j++) gf.lineTo(x - w / 2 + (w * j) / 12, hz - h * Math.sin((Math.PI * j) / 12) * (0.7 + 0.3 * rf()));
    gf.lineTo(x + w / 2, hz + 1);
    gf.fill();
    // its reflection: soft, fading downward and toward its ends (no box)
    const rg = gf.createRadialGradient(x, hz + 1, 0, x, hz + 1, w / 2);
    rg.addColorStop(0, 'rgba(46,58,51,0.4)');
    rg.addColorStop(1, 'rgba(46,58,51,0)');
    gf.save(); gf.translate(x, hz + 1); gf.scale(1, (h * 0.8) / (w / 2)); gf.translate(-x, -(hz + 1));
    gf.fillStyle = rg;
    gf.fillRect(x - w / 2, hz + 1, w, w / 2);
    gf.restore();
  }
  gf.fillStyle = 'rgba(50,58,50,0.9)';
  gf.fillRect(0, hz - 1.5, W, 2.5);

  const [mid, gm] = layer(W, H);
  // embalsados: floating mats of vegetation on the water
  const rm = rng(53);
  for (let i = 0; i < 16; i++) {
    const y = hz + (H - hz) * (0.12 + 0.55 * rm());
    const s = (y - hz) / (H - hz);
    const x = W * rm(), w = (60 + 260 * rm()) * (0.4 + s), h = (3 + 10 * rm()) * (0.4 + s);
    gm.fillStyle = `rgba(${48 + 20 * rm()},${62 + 16 * rm()},${44},0.95)`;
    gm.beginPath();
    gm.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    gm.fill();
    gm.fillStyle = 'rgba(190,180,140,0.18)';
    gm.fillRect(x - w * 0.7, y - h, w * 1.4, 1.5);
  }

  // a lomada in the middle distance: a long low island of firm ground and dry pajonal among the
  // esteros, where the fire of the scene burns (on land, not on the water)
  const ly = hz + (H - hz) * 0.3, lx0 = W * 0.3, lx1 = W * 1.06;
  const lomTop = (x: number) => ly - (H - hz) * 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (x - lx0) / (lx1 - lx0)))), 0.5) - 2;
  gm.fillStyle = vgrad(gm, ly - (H - hz) * 0.08, ly + 6, [[0, '#8a7850'], [0.5, '#66593a'], [1, '#3c3a2a']]);
  gm.beginPath();
  gm.moveTo(lx0, ly + 4);
  for (let x = lx0; x <= lx1; x += 4) gm.lineTo(x, lomTop(x) + Math.sin(x * 0.07) * 1.2);
  gm.lineTo(lx1, ly + 4);
  gm.closePath();
  gm.fill();
  // its reflection on the water, soft
  gm.fillStyle = vgrad(gm, ly + 4, ly + (H - hz) * 0.05, [[0, 'rgba(60,54,40,0.45)'], [1, 'rgba(60,54,40,0)']]);
  gm.fillRect(lx0 + 20, ly + 4, lx1 - lx0 - 40, (H - hz) * 0.05);
  // a monte on its far edge: a few trees along the crest, the fire runs in front of them
  const rt = rng(58);
  for (let x = lx0 + 40; x < lx1 - 20; x += 10 + 30 * rt()) {
    if (rt() < 0.35) continue;
    const r = 4 + 7 * rt(), y = lomTop(x) + 2;
    gm.fillStyle = rt() < 0.5 ? '#2e3a2a' : '#384430';
    gm.beginPath(); gm.ellipse(x, y - r, r * 1.2, r, 0, 0, Math.PI * 2); gm.fill();
    gm.fillRect(x - 0.8, y - r * 0.3, 1.6, r * 0.5);
  }
  // dry grass on it
  const rg = rng(57);
  gm.lineCap = 'round';
  for (let i = 0; i < 700; i++) {
    const x = lx0 + 10 + rg() * (lx1 - lx0 - 20), y = lomTop(x) + 4 + rg() * (ly - lomTop(x) - 2);
    gm.strokeStyle = rg() < 0.5 ? 'rgba(186,164,108,0.7)' : 'rgba(128,112,72,0.7)';
    gm.lineWidth = 1;
    gm.beginPath(); gm.moveTo(x, y); gm.lineTo(x + (rg() - 0.5) * 3, y - 3 - 6 * rg()); gm.stroke();
  }
  gm.lineCap = 'butt';

  const [near, gn] = layer(W, H);
  // pajonal in the foreground: tufts of tall grass
  const rn = rng(54);
  for (let i = 0; i < 260; i++) {
    const x = rn() * W, base = H * (0.9 + 0.12 * rn()), len = H * (0.08 + 0.14 * rn());
    const lean = (rn() - 0.4) * 0.5;
    gn.strokeStyle = rn() < 0.5 ? '#2a2a1c' : '#3a3522';
    gn.lineWidth = 1.2 + 1.6 * rn();
    gn.beginPath();
    gn.moveTo(x, base);
    gn.quadraticCurveTo(x + lean * len * 0.3, base - len * 0.6, x + lean * len, base - len);
    gn.stroke();
  }
  gn.fillStyle = vgrad(gn, H * 0.9, H, [[0, 'rgba(26,26,18,0)'], [0.5, '#1c1c13'], [1, '#13130d']]);
  gn.fillRect(0, H * 0.9, W, H * 0.1);

  return {
    layers: [
      { c: sky, depth: 0, after: (g, W2, H2, k) => {
        // a fire front along the horizon, low and long: grass burns wide, not tall
        const f = smooth(seg(k, 0.12, 0.85));
        if (f <= 0) return;
        const x0 = W2 * 0.45, len = W2 * 0.7 * f, y = hz - 2;
        // the glow over the front: an ellipse that fades toward its ends and upward (no box)
        const gr = g.createRadialGradient(x0, y, 0, x0, y, len / 2 + 40);
        gr.addColorStop(0, `rgba(255,140,60,${0.55 * f})`);
        gr.addColorStop(0.6, `rgba(255,110,40,${0.25 * f})`);
        gr.addColorStop(1, 'rgba(255,100,30,0)');
        g.save(); g.translate(x0, y); g.scale(1, 70 / (len / 2 + 40)); g.translate(-x0, -y);
        g.fillStyle = gr;
        g.fillRect(x0 - len / 2 - 40, y - len / 2 - 40, len + 80, len + 80);
        g.restore();
        for (let i = 0; i < 9; i++) plume(g, x0 - len / 2 + (len * (i + 0.5)) / 9, y - 2, H2 * (0.18 + 0.08 * (1 - Math.abs(i - 4) / 4)), 1.1, H2 * 0.03, f, 60 + i, '140,128,114', 0);
      } },
      { c: far, depth: 0.2, after: (g, W2, H2, k) => {
        const f = smooth(seg(k, 0.12, 0.85));
        if (f <= 0) return;
        const x0 = W2 * 0.3, len = W2 * 0.3 * f, y = hz - 1;
        // the burning line itself, over the horizon's edge: low tongues of flame, ragged, brighter in the middle of the front
        const rq = rng(66);
        g.globalCompositeOperation = 'lighter';
        for (let x = x0 - len / 2; x < x0 + len / 2; x += 3) {
          const mid = 1 - Math.abs(x - x0) / (len / 2);
          const h = (3 + 12 * rq() * (0.35 + 0.65 * mid)) * f;
          const fl = g.createLinearGradient(0, y - h, 0, y + 1);
          fl.addColorStop(0, 'rgba(255,220,140,0)');
          fl.addColorStop(0.5, `rgba(255,170,70,${0.8 * f})`);
          fl.addColorStop(1, `rgba(255,110,40,${0.9 * f})`);
          g.fillStyle = fl;
          g.beginPath(); g.moveTo(x - 3.5, y + 1); g.quadraticCurveTo(x - 1, y - h * 0.5, x + (rq() - 0.5) * 3, y - h); g.quadraticCurveTo(x + 1.5, y - h * 0.4, x + 3.5, y + 1); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      } },
      { c: mid, depth: 0.5, after: (g, W2, H2, k) => {
        // the fire on the lomada: a front that runs along it from the right, leaving black ground behind
        const f = smooth(seg(k, 0.1, 0.8));
        if (f <= 0) return;
        const xR = lx1 - 20, xL = xR - (xR - lx0 - 40) * f;
        // the burnt ground behind the front (to its right), black and smoking
        g.fillStyle = 'rgba(22,16,12,0.85)';
        g.beginPath();
        g.moveTo(xL + 14, ly + 2);
        for (let x = xL + 14; x <= xR; x += 4) g.lineTo(x, lomTop(x) + 6);
        g.lineTo(xR, ly + 2);
        g.closePath();
        g.fill();
        // the glow of the front on the ground and the water
        const gx = xL + 30, gy = lomTop(gx);
        const gl = g.createRadialGradient(gx, gy, 0, gx, gy, H2 * 0.16);
        gl.addColorStop(0, `rgba(255,140,60,${0.55 * f})`);
        gl.addColorStop(1, 'rgba(255,110,40,0)');
        g.save(); g.translate(gx, gy); g.scale(1.8, 0.6); g.translate(-gx, -gy);
        g.fillStyle = gl; g.fillRect(gx - H2 * 0.16, gy - H2 * 0.16, H2 * 0.32, H2 * 0.32);
        g.restore();
        // the flames: tall at the front, lower and broken behind it, where the grass is nearly gone
        const rq = rng(68);
        g.globalCompositeOperation = 'lighter';
        for (let x = xL; x < Math.min(xR, xL + W2 * 0.22); x += 4) {
          const d = (x - xL) / (W2 * 0.22);
          if (rq() < 0.15 + 0.5 * d) continue;
          const y = lomTop(x) + 1;
          const h = (16 + 46 * rq()) * (1 - 0.75 * d);
          const fl = g.createLinearGradient(0, y - h, 0, y);
          fl.addColorStop(0, 'rgba(255,220,140,0)');
          fl.addColorStop(0.45, 'rgba(255,170,70,0.85)');
          fl.addColorStop(1, 'rgba(255,100,30,0.95)');
          g.fillStyle = fl;
          g.beginPath(); g.moveTo(x - 4, y); g.quadraticCurveTo(x - 1, y - h * 0.5, x + (rq() - 0.5) * 4, y - h); g.quadraticCurveTo(x + 2, y - h * 0.4, x + 4, y); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 5; i++) plume(g, xL + 20 + i * 60, lomTop(xL + 20 + i * 60), H2 * (0.32 - 0.04 * i), 1.3, H2 * 0.04, f, 90 + i, '120,108,96', 0);
      } },
      { c: near, depth: 1 },
    ],
    grade: (g, W2, H2, k) => warm(g, W2, H2, smooth(seg(k, 0.3, 1)), '90,78,62', 0.12, 0.2),
  };
}

/* ---------- people's places: houses and trees ---------- */

/**
 * A small house seen from the front at dusk, `s` px wide, standing on (x, y): whitewashed wall, a
 * pitched or flat roof, a lit window or two. Deterministic per `r`.
 */
function house(g: CanvasRenderingContext2D, x: number, y: number, s: number, r: () => number, wall: string, roof: string) {
  const w = s * (0.8 + 0.5 * r()), h = s * (0.55 + 0.25 * r());
  g.fillStyle = wall;
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle = roof;
  g.beginPath();
  if (r() < 0.6) { g.moveTo(x - w * 0.58, y - h); g.lineTo(x, y - h - s * 0.32); g.lineTo(x + w * 0.58, y - h); }
  else { g.rect(x - w * 0.55, y - h - s * 0.08, w * 1.1, s * 0.1); }
  g.closePath(); g.fill();
  // the windows: warm light, some dark
  const n = w > s ? 2 : 1;
  for (let k = 0; k < n; k++) {
    if (r() < 0.25) continue;
    const wx = x - w / 2 + w * ((k + 0.5) / n) - s * 0.08;
    g.fillStyle = `rgba(255,${190 + 30 * r()},110,0.95)`;
    g.fillRect(wx, y - h * 0.62, s * 0.16, s * 0.16);
    g.fillStyle = 'rgba(255,170,80,0.18)';
    g.beginPath(); g.arc(wx + s * 0.08, y - h * 0.54, s * 0.4, 0, Math.PI * 2); g.fill();
  }
}

/** A Lombardy poplar (álamo), the windbreak of Mendoza's farms: a tall narrow flame of leaves. */
function poplar(g: CanvasRenderingContext2D, x: number, y: number, h: number, r: () => number, dark: string, lit: string) {
  const w = h * (0.14 + 0.05 * r());
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(x, y);
  g.bezierCurveTo(x - w, y - h * 0.25, x - w * 0.7, y - h * 0.8, x + w * 0.05, y - h);
  g.bezierCurveTo(x + w * 0.7, y - h * 0.8, x + w, y - h * 0.25, x, y);
  g.fill();
  // the evening light on its west side
  g.fillStyle = lit;
  g.beginPath();
  g.moveTo(x - w * 0.1, y - h * 0.15);
  g.bezierCurveTo(x - w * 0.8, y - h * 0.35, x - w * 0.5, y - h * 0.8, x + w * 0.02, y - h * 0.96);
  g.bezierCurveTo(x - w * 0.2, y - h * 0.7, x - w * 0.35, y - h * 0.35, x - w * 0.1, y - h * 0.15);
  g.fill();
}

/** An algarrobo or espinillo of the sierra: a short leaning trunk under a wide, flat, layered crown. */
function algarrobo(g: CanvasRenderingContext2D, x: number, y: number, s: number, r: () => number, dark: string) {
  const lean = (r() - 0.5) * s * 0.5;
  g.strokeStyle = dark;
  g.lineWidth = Math.max(1, s * 0.09);
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - s * 0.3, x + lean, y - s * 0.55); g.stroke();
  g.fillStyle = dark;
  for (let k = 0; k < 4; k++) {
    const cx = x + lean + (r() - 0.5) * s * 0.9, cy = y - s * (0.55 + 0.12 * r()), rw = s * (0.35 + 0.25 * r());
    g.beginPath(); g.ellipse(cx, cy, rw, rw * 0.38, 0, 0, Math.PI * 2); g.fill();
  }
}

/* ---------- Córdoba: the sierras ---------- */

function cordoba(W: number, H: number): Land {
  const [sky, gs] = layer(W, H);
  // dusk over the sierras: the sun gone behind them, the smoke of the season lit orange low down
  gs.fillStyle = vgrad(gs, 0, H * 0.6, [[0, '#231d2c'], [0.45, '#5e4250'], [0.8, '#b8714e'], [1, '#e9a868']]);
  gs.fillRect(0, 0, W, H);
  const sun = gs.createRadialGradient(W * 0.3, H * 0.5, 0, W * 0.3, H * 0.5, W * 0.45);
  sun.addColorStop(0, 'rgba(255,190,120,0.45)');
  sun.addColorStop(1, 'rgba(255,190,120,0)');
  gs.fillStyle = sun;
  gs.fillRect(0, 0, W, H);
  // a long band of smoke across the sky, from fires further off
  mist(gs, W, H * 0.3, H * 0.08, '150,96,80', 0.35);

  const ridges: { c: HTMLCanvasElement; depth: number; foot: number }[] = [];
  const crest: ((x: number) => number)[] = [];
  const cols = [['#8c8590', '#7a737e'], ['#6f6a6e', '#5e595d'], ['#55524d', '#46433f'], ['#3e3c33', '#2f2d26'], ['#272820', '#1b1c16']];
  cols.forEach(([top, bot], i) => {
    const [c, g] = layer(W, H);
    const n = fbm(70 + i * 9, 5);
    const base = H * (0.42 + i * 0.1), amp = H * (0.16 - i * 0.015);
    const yr = (x: number) => base - Math.pow(n(x / (520 - i * 60) + i * 3), 1.6) * amp * 1.8 + amp * 0.4;
    crest.push(yr);
    ridge(g, W, H, yr, vgrad(g, base - amp, base + H * 0.2, [[0, top], [1, bot]]));
    if (i === 3) {
      // the village on this ridge's face, between the two stretches that burn, just below its crest
      // (clear of the nearer ridge in front), its windows lit at dusk
      const rh = rng(91);
      for (let k = 0; k < 16; k++) {
        const x = W * (0.36 + 0.24 * rh());
        house(g, x, yr(x) + H * (0.022 + 0.03 * rh()), H * (0.02 + 0.008 * rh()), rh, rh() < 0.6 ? '#b9a387' : '#9c836a', '#5a3426');
      }
    }
    if (i === 2) {
      // algarrobos scattered along the crest of the middle ridge, small with distance
      const r = rng(77);
      for (let x = W * 0.02; x < W; x += W * (0.02 + 0.05 * r())) if (r() < 0.6) algarrobo(g, x, yr(x) + H * 0.006, H * (0.012 + 0.008 * r()), r, '#3c3a36');
    }
    if (i === cols.length - 1) {
      // the near slope: bushes and rocks of the bosque serrano
      const r = rng(88);
      for (let j = 0; j < 260; j++) {
        const x = r() * W, y = base + H * 0.04 + Math.pow(r(), 0.7) * H * 0.4, s = 1.5 + 6 * r() * (y / H);
        g.fillStyle = r() < 0.75 ? 'rgba(18,19,13,0.7)' : 'rgba(58,54,42,0.5)';
        g.beginPath(); g.ellipse(x, y, s * 1.4, s, 0, 0, Math.PI * 2); g.fill();
      }
      // a dirt road climbing from the foreground over the near ridge, toward the village
      const road = (t: number): [number, number] => [W * (0.62 - 0.14 * t + 0.05 * Math.sin(t * 7)), H - (H - yr(W * 0.48) - H * 0.005) * Math.pow(t, 0.8)];
      g.lineCap = 'round';
      for (let t = 0; t < 1; t += 0.01) {
        const [x0, y0] = road(t), [x1, y1] = road(t + 0.01);
        g.strokeStyle = `rgba(150,124,88,${0.7 * (1 - t * 0.4)})`;
        g.lineWidth = Math.max(1.2, 22 * Math.pow(1 - t, 1.6));
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
      g.lineCap = 'butt';
      // and algarrobos on the near slope, larger
      for (let x = W * 0.55; x < W; x += W * (0.03 + 0.06 * r())) if (r() < 0.55) algarrobo(g, x, yr(x) + H * (0.03 + 0.05 * r()), H * (0.03 + 0.02 * r()), r, '#14150f');
    }
    ridges.push({ c, depth: 0.15 + i * 0.2, foot: base + amp * 0.4 });
  });

  // the fire burns on the face of the third ridge, where it stands clear above the fourth one: the
  // widest such stretch in the right half of the frame (where the reader's fire starts), and the
  // widest one in the left half (where it spreads to), each at most a fifth of the width
  const face = (x: number) => crest[3](x) - crest[2](x);
  const widest = (from: number, to: number): [number, number] | null => {
    let best: [number, number] | null = null, run0 = -1;
    for (let x = from; x <= to; x += 4) {
      const open = face(x) > H * 0.07;
      if (open && run0 < 0) run0 = x;
      if ((!open || x + 4 > to) && run0 >= 0) { if (!best || x - run0 > best[1] - best[0]) best = [run0, x]; run0 = -1; }
    }
    return best;
  };
  const faceY = (x: number) => Math.min(crest[2](x) + H * 0.02, crest[3](x) - H * 0.015);
  const onFace = (run: [number, number]): Ground => {
    const mid = (run[0] + run[1]) / 2, half = Math.min((run[1] - run[0]) / 2 - 10, W * 0.1);
    return { layer: 3, y: faceY, x0: mid - half, x1: mid + half };
  };
  const ground = onFace(widest(W * 0.35, W * 0.92) ?? [W * 0.6, W * 0.7]);
  const left = widest(W * 0.04, W * 0.34);
  const zones = left && left[1] - left[0] > W * 0.06 ? [onFace(left)] : [];

  return {
    ground,
    zones,
    horizon: H * 0.45,
    layers: [
      { c: sky, depth: 0 },
      ...ridges.map((r, i): Layer => ({
        c: r.c,
        depth: r.depth,
        // smoke settles in the valley in front of each ridge
        after: i < 4 ? (g, W2, H2, k) => {
          const f = smooth(seg(k, 0.15 + i * 0.08, 0.8 + i * 0.04));
          if (f > 0) mist(g, W2, r.foot + H2 * 0.03, H2 * 0.09, '150,132,118', 0.55 * f);
          if (i === 2) plume(g, W2 * 0.62, r.foot - H2 * 0.05, H2 * 0.4, 0.5, H2 * 0.04, smooth(seg(k, 0.1, 0.85)), 95, '110,100,92', smooth(seg(k, 0.2, 0.85)));
        } : undefined,
      })),
    ],
    grade: (g, W2, H2, k) => warm(g, W2, H2, smooth(seg(k, 0.3, 1)), '80,64,52', 0.14, 0.24),
  };
}

/* ---------- Delta del Paraná: the river, its channels and the islands, seen from above ---------- */

/*
 * An elevated view over the delta, as from a high bank: the Paraná, wide, winding from the horizon to
 * the foreground; secondary channels (riachos) branching off it and a cross channel; a lagoon inside an
 * island; every island covered by pajonal, with willow woods along the banks. It is built on a ground
 * plane (g across, about -1..1; v depth, 0 = horizon, 1 = foreground) seen in perspective. An
 * illustration inspired by the islands in front of Rosario (one main channel, riachos, lagunas
 * inside the islands), not a map of a particular place.
 */
function delta(W: number, H: number): Land {
  const hz = H * 0.34;
  const cx = W * 0.56;
  const Y = (v: number) => hz + (H * 1.04 - hz) * Math.pow(v, 1.5);
  const S = (v: number) => W * (0.32 + 1.25 * Math.pow(v, 1.5));
  const X = (g: number, v: number) => cx + (g * S(v)) / 2;

  // the water: the river, two riachos, a cross channel and a lagoon, in ground coordinates
  const river = (v: number) => 0.3 - 0.62 * v + 0.1 * Math.sin(v * 5.5);
  const RW = 0.42;
  const chanA = (v: number) => river(v) + RW / 2 + (v - 0.2) * 1.6 + 0.09 * Math.sin(v * 13);
  const chanB = (v: number) => -0.55 - 0.15 * v + 0.13 * Math.sin(v * 12 + 1);
  const CW = 0.04;
  const crossV = (g: number) => 0.62 + 0.03 * Math.sin(g * 9);
  const LAG: [number, number, number, number] = [-0.36, 0.36, 0.13, 0.04];
  // the lagoon's shore is irregular: its radius wobbles with the angle
  const lagR = (a: number) => 1 + 0.16 * Math.sin(a * 3 + 0.5) + 0.08 * Math.sin(a * 7 + 2);
  const lagoon = (g: number, v: number) => {
    const dx = (g - LAG[0]) / LAG[2], dy = (v - LAG[1]) / LAG[3];
    return Math.hypot(dx, dy) / lagR(Math.atan2(dy, dx));
  };
  const wet = (g: number, v: number) =>
    Math.abs(g - river(v)) < RW / 2 ||
    (v > 0.2 && Math.abs(g - chanA(v)) < CW / 2) ||
    Math.abs(g - chanB(v)) < CW * 0.45 ||
    (g > chanB(0.62) && g < river(0.62) && Math.abs(v - crossV(g)) < 0.011) ||
    lagoon(g, v) < 1;

  const [sky, gs] = layer(W, H);
  gs.fillStyle = vgrad(gs, 0, hz, [[0, '#2a3038'], [0.7, '#8f8a80'], [1, '#c4b49a']]);
  gs.fillRect(0, 0, W, hz + 1);

  const [land, gl] = layer(W, H);
  // the islands: pajonal, hazier toward the horizon, darker than the water that reflects the sky
  gl.fillStyle = vgrad(gl, hz, H, [[0, '#7c7860'], [0.18, '#5e5d40'], [0.5, '#4a4e31'], [1, '#2f3421']]);
  gl.fillRect(0, hz, W, H - hz);
  const rv = rng(160);
  // stands of different vegetation: broad soft patches of greener marsh, ochre pajonal, dark scrub
  const PATCH = ['92,104,58', '128,116,70', '60,70,40', '110,112,64', '70,80,46'];
  for (let i = 0; i < 140; i++) {
    const v = Math.pow(rv(), 0.8), g = (rv() * 2 - 1) * (1.3 + 1.4 * (1 - v));
    const x = X(g, v), y = Y(v), rx = S(v) * (0.03 + 0.07 * rv()), ry = rx * (0.12 + 0.3 * v);
    const gr = gl.createRadialGradient(x, y, 0, x, y, rx);
    const c = PATCH[Math.floor(rv() * PATCH.length)];
    gr.addColorStop(0, `rgba(${c},${0.35 + 0.3 * v})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    gl.fillStyle = gr;
    gl.save(); gl.translate(x, y); gl.scale(1, ry / rx); gl.translate(-x, -y);
    gl.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    gl.restore();
  }
  // up close, the grass itself: short strokes, bigger as they come near, never on the water
  const PAL = ['#8d7f50', '#75703f', '#5d6438', '#4a5530'];
  gl.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const v = 0.3 + 0.7 * Math.pow(rv(), 0.6), g = (rv() * 2 - 1) * (1.2 + 1.4 * (1 - v));
    const x = X(g, v), y = Y(v);
    if (x < -10 || x > W + 10 || wet(g, v)) continue;
    const h = 1 + 9 * Math.pow(v, 2);
    gl.globalAlpha = 0.25 + 0.45 * v;
    gl.strokeStyle = PAL[Math.floor(rv() * PAL.length)];
    gl.lineWidth = 0.6 + 1.2 * v;
    gl.beginPath(); gl.moveTo(x, y); gl.lineTo(x + (rv() - 0.5) * h * 0.5, y - h); gl.stroke();
  }
  gl.globalAlpha = 1;
  gl.lineCap = 'butt';

  // the water, filled band by band with the smoky sky it reflects (paler far, darker near)
  const waterFill = vgrad(gl, hz, H, [[0, '#d8c8a6'], [0.2, '#ada392'], [0.55, '#7d7f7c'], [1, '#4d5558']]);
  const band = (c: (v: number) => number, w: number, v0: number, v1: number) => {
    gl.beginPath();
    for (let v = v0; v <= v1 + 1e-6; v += 0.008) gl.lineTo(X(c(v) - w / 2, v), Y(v));
    for (let v = v1; v >= v0 - 1e-6; v -= 0.008) gl.lineTo(X(c(v) + w / 2, v), Y(v));
    gl.closePath();
    gl.fill();
  };
  gl.fillStyle = waterFill;
  band(river, RW, 0, 1.06);
  band(chanA, CW, 0.2, 1.06);
  band(chanB, CW * 0.9, 0, 1.06);
  gl.beginPath();
  const g0 = chanB(0.62), g1 = river(0.62);
  for (let g = g0; g <= g1; g += 0.01) gl.lineTo(X(g, crossV(g) - 0.011), Y(crossV(g) - 0.011));
  for (let g = g1; g >= g0; g -= 0.01) gl.lineTo(X(g, crossV(g) + 0.011), Y(crossV(g) + 0.011));
  gl.closePath();
  gl.fill();
  const lagPath = () => {
    gl.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
      const r = lagR(a), v = LAG[1] + LAG[3] * r * Math.sin(a);
      gl.lineTo(X(LAG[0] + LAG[2] * r * Math.cos(a), v), Y(v));
    }
    gl.closePath();
  };
  lagPath();
  gl.fill();
  // its still water is darker than the river, with a band of reeds around it
  gl.fillStyle = 'rgba(70,76,72,0.35)';
  lagPath(); gl.fill();
  gl.strokeStyle = 'rgba(52,58,34,0.8)';
  gl.lineWidth = 2.5;
  lagPath(); gl.stroke();
  // a darker rim where the banks shade the water, and light on it: short streaks across the current
  gl.strokeStyle = 'rgba(40,44,30,0.45)';
  gl.lineWidth = 1.2;
  for (const side of [-1, 1]) {
    gl.beginPath();
    for (let v = 0; v <= 1.06; v += 0.008) gl.lineTo(X(river(v) + (side * RW) / 2, v), Y(v));
    gl.stroke();
  }
  for (let i = 0; i < 420; i++) {
    const v = Math.pow(rv(), 0.9), g = river(v) + (rv() - 0.5) * RW * 0.9;
    const x = X(g, v), y = Y(v), len = 4 + 60 * Math.pow(v, 1.5);
    gl.fillStyle = `rgba(240,214,176,${0.06 + 0.16 * rv()})`;
    gl.fillRect(x - len / 2, y, len, 0.6 + 1.2 * v);
  }
  // willow and ceibo woods along the banks: irregular stands of crowns, with gaps between them, that
  // overhang the water a little; lit from the sun's side
  const woods = (c: (v: number) => number, w: number, v0: number, n: number, seed: number) => {
    const rw = rng(seed);
    for (let i = 0; i < n; i++) {
      const v = v0 + (1 - v0) * Math.pow(rw(), 0.8), side = rw() < 0.5 ? -1 : 1;
      const k = 2 + Math.floor(rw() * 6);
      for (let j = 0; j < k; j++) {
        const vj = v + (rw() - 0.5) * 0.03, g = c(vj) + side * (w / 2 + 0.004 + 0.03 * rw());
        if (wet(g, vj) && rw() < 0.7) continue;
        const x = X(g, vj), y = Y(vj), r = 1.2 + S(vj) * 0.0055 * (0.5 + rw());
        gl.fillStyle = ['#283019', '#303a1f', '#3a4425'][Math.floor(rw() * 3)];
        gl.beginPath(); gl.ellipse(x, y - r * 0.55, r * (1.1 + 0.5 * rw()), r, 0, 0, Math.PI * 2); gl.fill();
        gl.fillStyle = 'rgba(176,160,104,0.22)';
        gl.beginPath(); gl.ellipse(x + r * 0.3, y - r * 0.95, r * 0.55, r * 0.3, 0, 0, Math.PI * 2); gl.fill();
      }
    }
  };
  woods(river, RW, 0.02, 120, 170);
  woods(chanA, CW, 0.22, 45, 171);
  woods(chanB, CW, 0.02, 45, 172);
  // montes inside the islands: a few stands of trees on the higher ground, more on the wide island to
  // the left of the riacho, none on the water; small near the horizon, bigger and more detailed close by
  const rm = rng(175);
  for (let i = 0; i < 70; i++) {
    const left = rm() < 0.65;
    const v = 0.12 + 0.85 * Math.pow(rm(), 0.9);
    // left: the island between the riacho and the river (its width at that depth), else east of the river
    const g = left ? chanB(v) + CW + 0.04 + rm() * Math.max(0.05, river(v) - RW / 2 - chanB(v) - CW - 0.08) : river(v) + RW / 2 + 0.08 + rm() * 0.5;
    const n = 3 + Math.floor(rm() * 8);
    for (let j = 0; j < n; j++) {
      const gj = g + (rm() - 0.5) * 0.09, vj = v + (rm() - 0.5) * 0.02;
      if (wet(gj, vj) || lagoon(gj, vj) < 1.3) continue;
      const x = X(gj, vj), y = Y(vj), r = 1 + S(vj) * 0.005 * (0.5 + rm());
      if (x < -20 || x > W + 20) continue;
      gl.fillStyle = 'rgba(20,24,14,0.35)';
      gl.beginPath(); gl.ellipse(x + r * 0.5, y + r * 0.1, r * 1.3, r * 0.35, 0, 0, Math.PI * 2); gl.fill();
      gl.fillStyle = ['#2b3319', '#343e20', '#3d4626'][Math.floor(rm() * 3)];
      gl.beginPath(); gl.ellipse(x, y - r * 0.6, r * (0.9 + 0.4 * rm()), r, 0, 0, Math.PI * 2); gl.fill();
      gl.fillStyle = 'rgba(176,160,104,0.2)';
      gl.beginPath(); gl.ellipse(x + r * 0.3, y - r, r * 0.5, r * 0.28, 0, 0, Math.PI * 2); gl.fill();
    }
  }
  // the back left: a wide laguna among the islands, a riacho winding to it, and montes on its shores
  const L2: [number, number, number, number] = [-1.35, 0.13, 0.42, 0.05];
  const lag2R = (a: number) => 1 + 0.12 * Math.sin(a * 4 + 1) + 0.07 * Math.sin(a * 9);
  gl.fillStyle = waterFill;
  gl.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.04) {
    const r = lag2R(a), v = L2[1] + L2[3] * r * Math.sin(a);
    gl.lineTo(X(L2[0] + L2[2] * r * Math.cos(a), v), Y(v));
  }
  gl.closePath(); gl.fill();
  gl.fillStyle = 'rgba(70,76,72,0.25)'; gl.fill();
  const rio = (v: number) => -1.0 + 0.35 * (v - 0.17) + 0.06 * Math.sin(v * 14);
  band(rio, CW * 0.8, 0.17, 1.06);
  const rl = rng(176);
  for (let i = 0; i < 90; i++) {
    const a = rl() * Math.PI * 2, r = lag2R(a) * (1.08 + 0.35 * rl());
    const v = L2[1] + L2[3] * r * Math.sin(a), g0 = L2[0] + L2[2] * r * Math.cos(a);
    const x = X(g0, v), y = Y(v), rr = 1.1 + S(v) * 0.005 * (0.5 + rl());
    if (x < -10 || x > W + 10) continue;
    gl.fillStyle = ['#2b3319', '#343e20', '#3d4626'][Math.floor(rl() * 3)];
    gl.beginPath(); gl.ellipse(x, y - rr * 0.6, rr * (1 + 0.5 * rl()), rr, 0, 0, Math.PI * 2); gl.fill();
  }
  woods(rio, CW * 0.8, 0.2, 40, 177);
  for (let i = 0; i < 40; i++) {
    const v = 0.2 + 0.75 * Math.pow(rl(), 0.9), g0 = -1.25 - rl() * 1.0 * (1.4 - v);
    const n = 3 + Math.floor(rl() * 6);
    for (let j = 0; j < n; j++) {
      const gj = g0 + (rl() - 0.5) * 0.1, vj = v + (rl() - 0.5) * 0.02;
      if (wet(gj, vj)) continue;
      const x = X(gj, vj), y = Y(vj), rr = 1 + S(vj) * 0.005 * (0.5 + rl());
      if (x < -20 || x > W + 20) continue;
      gl.fillStyle = ['#2b3319', '#343e20', '#3d4626'][Math.floor(rl() * 3)];
      gl.beginPath(); gl.ellipse(x, y - rr * 0.6, rr * (0.9 + 0.4 * rl()), rr, 0, 0, Math.PI * 2); gl.fill();
    }
  }

  // the haze near the horizon
  gl.fillStyle = vgrad(gl, hz - 2, hz + H * 0.16, [[0, 'rgba(176,166,146,0.85)'], [1, 'rgba(176,166,146,0)']]);
  gl.fillRect(0, hz - 2, W, H * 0.16 + 2);

  const [near, gn] = layer(W, H);
  // juncos at the water's edge, in the foreground
  const rn = rng(140);
  for (let i = 0; i < 200; i++) {
    const x = rn() * W * 0.36, base = H * (0.97 + 0.05 * rn()), len = H * (0.08 + 0.16 * rn());
    gn.strokeStyle = rn() < 0.5 ? '#161813' : '#22241c';
    gn.lineWidth = 1.5 + rn() * 1.5;
    gn.beginPath();
    gn.moveTo(x, base);
    gn.quadraticCurveTo(x + 6, base - len * 0.6, x + 4 + (rn() - 0.5) * 22, base - len);
    gn.stroke();
  }

  // three depths of the same delta for the fire: an island far off, the island between the river and
  // a riacho in the middle distance (the main action), and a near island
  const on = (v: number, a: number, b: number): Ground => ({ layer: 1, y: () => Y(v), x0: Math.max(10, X(a, v)), x1: Math.min(W - 10, X(b, v)) });
  const ground = on(0.5, 0.28, 0.62);
  const zones = [on(0.18, -0.44, 0.0), on(0.64, 0.02, 0.36)];

  return {
    ground,
    zones,
    horizon: hz,
    layers: [
      { c: sky, depth: 0, after: (g, W2, H2, k) => {
        // the sun through the smoke, redder as the smoke thickens
        const f = smooth(seg(k, 0.1, 0.9));
        const x = W2 * 0.7, y = hz - H2 * 0.12, r = H2 * 0.045;
        const gr = g.createRadialGradient(x, y, 0, x, y, r * 6);
        gr.addColorStop(0, `rgba(255,${200 - 90 * f},${150 - 110 * f},0.45)`);
        gr.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = gr;
        g.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        g.fillStyle = `rgb(255,${236 - 120 * f},${200 - 160 * f})`;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      } },
      { c: land, depth: 0.45, after: (g, W2, H2, k) => {
        // a curtain of smoke drifting low over the far islands
        const f = smooth(seg(k, 0.1, 0.85));
        for (let i = 0; i < 4; i++) mist(g, W2, hz - H2 * (0.02 + 0.06 * i), H2 * (0.09 + 0.03 * i), '120,110,100', (0.5 - 0.08 * i) * f);
        plume(g, X(-0.3, 0.06), Y(0.06), H2 * 0.26, 2.2, H2 * 0.03, f, 150, '128,120,110', 0);
        plume(g, X(0.05, 0.1), Y(0.1), H2 * 0.24, 2.4, H2 * 0.028, f, 151, '128,120,110', 0);
      } },
      { c: near, depth: 1 },
    ],
    grade: (g, W2, H2, k) => warm(g, W2, H2, smooth(seg(k, 0.3, 1)), '96,84,72', 0.16, 0.22),
  };
}

/* ---------- Mendoza: vines under the Andes ---------- */

function mendoza(W: number, H: number): Land {
  const hz = H * 0.6;
  const [sky, gs] = layer(W, H);
  gs.fillStyle = vgrad(gs, 0, hz, [[0, '#1c2233'], [0.65, '#6f6c7a'], [1, '#d7b48d']]);
  gs.fillRect(0, 0, W, H);

  const [andes, ga] = layer(W, H);
  const na = fbm(201, 6, true);
  const nb = fbm(205, 2);
  // the Andes: a broad massif with sharp ridged peaks on it
  const yA = (x: number) => H * 0.5 - Math.pow(0.35 * nb(x / 700) + 0.65 * na(x / 360), 1.5) * H * 0.42;
  ridge(ga, W, H, yA, vgrad(ga, H * 0.12, H * 0.55, [[0, '#86879a'], [1, '#4a4a5a']]));
  // snow above a ragged snow line, as one shape (no stair steps)
  const ns = noise1(209);
  const line = (x: number) => H * 0.27 + ns(x / 26) * H * 0.035 + ns(x / 7 + 40) * H * 0.012;
  ga.beginPath();
  for (let x = -10; x <= W + 10; x += 2) { const y = Math.min(yA(x), line(x)); x === -10 ? ga.moveTo(x, y) : ga.lineTo(x, y); }
  for (let x = W + 10; x >= -10; x -= 2) ga.lineTo(x, line(x));
  ga.closePath();
  ga.fillStyle = vgrad(ga, H * 0.1, H * 0.3, [[0, 'rgba(240,240,246,0.95)'], [1, 'rgba(200,202,216,0.8)']]);
  ga.fill();
  mist(ga, W, H * 0.5, H * 0.08, '190,170,160', 0.5);

  const [pied, gp] = layer(W, H);
  const np = fbm(220, 4);
  const yP = (x: number) => H * 0.55 - np(x / 300) * H * 0.07;
  ridge(gp, W, H, yP, vgrad(gp, H * 0.48, hz + 10, [[0, '#6a5444'], [1, '#4a3a2f']]));
  const rp = rng(222);
  for (let i = 0; i < 120; i++) {
    gp.fillStyle = 'rgba(40,34,26,0.7)';
    gp.beginPath(); gp.arc(rp() * W, H * (0.53 + 0.07 * rp()), 1 + 2 * rp(), 0, Math.PI * 2); gp.fill();
  }
  // El Challao: the houses climbing the foot of the hill on the right, clear of the fire, lit at dusk
  const rh = rng(226);
  for (let k = 0; k < 26; k++) {
    const x = W * (0.68 + 0.3 * rh()), y = yP(x) + H * (0.012 + 0.04 * Math.pow(rh(), 0.8));
    house(gp, x, y, H * (0.011 + 0.008 * rh()), rh, rh() < 0.6 ? '#c9b79a' : '#a98f74', '#4a2e22');
  }

  // the vineyard: rows converging on a point of the horizon
  const [vines, gv] = layer(W, H);
  gv.fillStyle = vgrad(gv, hz - 30, H, [[0, 'rgba(90,69,50,0)'], [0.08, '#5a4532'], [1, '#2a1f17']]);
  gv.fillRect(0, hz - 30, W, H - hz + 30);
  const vx = W * 0.56;
  const rv = rng(230);
  const rows = 11;
  const fol = noise1(231);
  // each row is a hedge of vines running to the vanishing point: its height grows towards the viewer
  const order = Array.from({ length: 2 * rows + 1 }, (_, i) => i - rows).sort((a, b) => Math.abs(b) - Math.abs(a));
  for (const i of order) {
    const xb = vx + i * (W / rows) * 1.05; // where the row's centre meets the bottom edge
    const N = 90;
    const at = (s: number) => {
      const f = Math.pow(s / N, 1.6); // 0 at the horizon, 1 at the bottom
      return { x: vx + (xb - vx) * f, y: hz + (H - hz) * f, f };
    };
    gv.beginPath();
    for (let s = 0; s <= N; s++) { const p = at(s); const hh = p.f * H * 0.09 * (0.85 + 0.3 * fol(s * 0.7 + i * 13)); s ? gv.lineTo(p.x, p.y - hh) : gv.moveTo(p.x, p.y - hh); }
    for (let s = N; s >= 0; s--) { const p = at(s); gv.lineTo(p.x + (i > 0 ? -1 : 1) * p.f * 8, p.y); }
    gv.closePath();
    gv.fillStyle = vgrad(gv, hz, H, [[0, '#33402a'], [1, '#18200f']]);
    gv.fill();
    // lit leaves along the top of the hedge
    gv.strokeStyle = 'rgba(150,160,84,0.35)';
    gv.lineWidth = 1.5;
    gv.beginPath();
    for (let s = 0; s <= N; s++) { const p = at(s); const hh = p.f * H * 0.09 * (0.85 + 0.3 * fol(s * 0.7 + i * 13)); s ? gv.lineTo(p.x, p.y - hh) : gv.moveTo(p.x, p.y - hh); }
    gv.stroke();
    for (let s = N * 0.45; s <= N; s += 1.5) {
      const p = at(s), hh = p.f * H * 0.09;
      if (rv() < 0.5) continue;
      gv.fillStyle = rv() < 0.5 ? 'rgba(120,136,62,0.35)' : 'rgba(20,28,12,0.5)';
      gv.beginPath(); gv.ellipse(p.x + (rv() - 0.5) * 10 * p.f, p.y - hh * (0.3 + 0.7 * rv()), 4 * p.f + 1, 3 * p.f + 1, 0, 0, Math.PI * 2); gv.fill();
    }
    // a post at the head of each row
    const p = at(N * 0.72);
    gv.strokeStyle = 'rgba(28,20,14,0.9)';
    gv.lineWidth = 2.5;
    gv.beginPath(); gv.moveTo(p.x, p.y); gv.lineTo(p.x, p.y - H * 0.1 * p.f); gv.stroke();
  }
  // the windbreak of álamos at the back of the vineyard, on both sides of the vanishing point
  const ra = rng(236);
  for (let x = -10; x < W + 10; x += H * (0.022 + 0.014 * ra())) {
    if (x > W * 0.17 && x < W * 0.74) continue; // the fire's slope and the town's houses stay in view
    poplar(gv, x, hz - 26, H * (0.045 + 0.02 * ra()), ra, 'rgba(40,46,34,0.85)', 'rgba(170,150,96,0.3)');
  }
  // a road sign at the edge of the field
  {
    const sx = W * 0.8, sy = H * 0.86, sw = H * 0.15, sh = H * 0.05;
    gv.fillStyle = '#2b2a28';
    gv.fillRect(sx - 2, sy - sh, 4, sh + H * 0.08);
    gv.fillStyle = '#1f6b3c';
    gv.fillRect(sx - sw / 2, sy - sh * 1.9, sw, sh);
    gv.strokeStyle = 'rgba(240,240,230,0.9)';
    gv.lineWidth = 1.5;
    gv.strokeRect(sx - sw / 2 + 3, sy - sh * 1.9 + 3, sw - 6, sh - 6);
    gv.fillStyle = '#f2f0e6';
    gv.font = `600 ${Math.round(sh * 0.34)}px system-ui, sans-serif`;
    gv.textAlign = 'center';
    gv.textBaseline = 'middle';
    gv.fillText('EL CHALLAO →', sx, sy - sh * 1.4);
  }

  return {
    // the fire burns on the piedemonte, a little below its crest, left of the vanishing point
    ground: { layer: 2, y: (x) => yP(x) + H * 0.012, x0: W * 0.24, x1: W * 0.5 },
    layers: [
      { c: sky, depth: 0 },
      { c: andes, depth: 0.12 },
      { c: pied, depth: 0.3, after: (g, W2, H2, k) => {
        // smoke on the piedemonte: the fire was there, at the foot of the mountains
        plume(g, W2 * 0.28, H2 * 0.535, H2 * 0.42, 0.9, H2 * 0.045, smooth(seg(k, 0.25, 0.95)), 240, '118,104,96', smooth(seg(k, 0.35, 0.95)));
        plume(g, W2 * 0.36, H2 * 0.545, H2 * 0.3, 1.1, H2 * 0.03, smooth(seg(k, 0.4, 1)), 241, '118,104,96', smooth(seg(k, 0.5, 1)) * 0.6);
      } },
      { c: vines, depth: 1, rise: true },
    ],
    grade: (g, W2, H2, k) => warm(g, W2, H2, smooth(seg(k, 0.45, 1)), '90,70,56', 0.1, 0.2),
  };
}

export const LANDSCAPES: Record<string, (W: number, H: number) => Land> = { misiones, corrientes, cordoba, delta, mendoza };

/** Paints a region's layers at `res` pixels per CSS px. */
/** Shots that pan sideways are painted this much wider than the screen. */
export const PAN_WIDE: Record<string, number> = { delta: 1.2 };

export function buildLand(id: string, W: number, H: number, res: number): Land {
  RES = res;
  const k = PAN_WIDE[id] ?? 1;
  try { const L = LANDSCAPES[id](W * k, H); if (k !== 1) L.wide = W * k; return L; } finally { RES = 1; }
}

/** One line under each landscape, so nobody takes it for a picture of the fire. */
export const LAND_NOTES: Record<string, [string, string]> = {
  misiones: ['Ilustración', ' del paisaje de la selva misionera.'],
  corrientes: ['Ilustración', ' del paisaje de los esteros.'],
  cordoba: ['Ilustración', ' del paisaje de las sierras.'],
  delta: ['Ilustración', ' del paisaje de las islas del Delta.'],
  mendoza: ['Ilustración.', ' Los viñedos son un símbolo del paisaje mendocino: el incendio de 2023 fue en el piedemonte de El Challao, no en viñedos.'],
};

/* ---------- the veil between regions ---------- */

const veils = new Map<string, HTMLCanvasElement>();
/** A tile of soft fractal noise in one colour (alpha = density), painted once. */
export function veilTexture(rgb: string) {
  let c = veils.get(rgb);
  if (c) return c;
  const N = 96;
  const [cc, g] = layer(N, N);
  const img = g.createImageData(N, N);
  const r = rng(rgb.length * 977 + 5);
  const grid = Array.from({ length: 13 * 13 }, r);
  const at = (x: number, y: number, f: number) => {
    // periodic value noise on a 12 x 12 lattice
    const gx = (x / N) * f, gy = (y / N) * f;
    const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const v = (i: number, j: number) => grid[((j % f) * 13 + (i % f)) % grid.length];
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return (v(ix, iy) * (1 - ux) + v(ix + 1, iy) * ux) * (1 - uy) + (v(ix, iy + 1) * (1 - ux) + v(ix + 1, iy + 1) * ux) * uy;
  };
  const [cr, cg, cb] = rgb.split(',').map(Number);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = 0.55 * at(x, y, 3) + 0.3 * at(x, y, 6) + 0.15 * at(x, y, 12);
    const i = (y * N + x) * 4;
    img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb;
    img.data[i + 3] = Math.round(255 * smooth(seg(n, 0.25, 0.75)));
  }
  g.putImageData(img, 0, 0);
  veils.set(rgb, cc);
  return cc;
}
