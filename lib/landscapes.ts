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
 *  - delta:      flat islands and a wide river under a curtain of smoke that turns the sun red
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
export type Land = { layers: Layer[]; grade: (g: CanvasRenderingContext2D, W: number, H: number, k: number) => void };

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
    gf.fillStyle = 'rgba(46,58,51,0.35)';
    gf.fillRect(x - w / 2, hz + 1, w, h * 0.6);
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
        const x0 = W2 * 0.42, len = W2 * 0.5 * f, y = hz - 2;
        const gr = g.createLinearGradient(0, y - 30, 0, y + 6);
        gr.addColorStop(0, 'rgba(255,110,40,0)');
        gr.addColorStop(1, `rgba(255,140,60,${0.5 * f})`);
        g.fillStyle = gr;
        g.fillRect(x0 - len / 2, y - 30, len, 36);
        g.fillStyle = `rgba(255,200,120,${0.8 * f})`;
        g.fillRect(x0 - len / 2, y - 1.5, len, 2);
        for (let i = 0; i < 7; i++) plume(g, x0 - len / 2 + (len * (i + 0.5)) / 7, y - 2, H2 * 0.22, 1.1, H2 * 0.03, f, 60 + i, '140,128,114', 0);
      } },
      { c: far, depth: 0.2 },
      { c: mid, depth: 0.5 },
      { c: near, depth: 1 },
    ],
    grade: (g, W2, H2, k) => warm(g, W2, H2, smooth(seg(k, 0.3, 1)), '90,78,62', 0.12, 0.2),
  };
}

/* ---------- Córdoba: the sierras ---------- */

function cordoba(W: number, H: number): Land {
  const [sky, gs] = layer(W, H);
  gs.fillStyle = vgrad(gs, 0, H * 0.6, [[0, '#2a2733'], [0.6, '#8a7a72'], [1, '#d6b892']]);
  gs.fillRect(0, 0, W, H);

  const ridges: { c: HTMLCanvasElement; depth: number; foot: number }[] = [];
  const cols = [['#8c8590', '#7a737e'], ['#6f6a6e', '#5e595d'], ['#55524d', '#46433f'], ['#3e3c33', '#2f2d26'], ['#272820', '#1b1c16']];
  cols.forEach(([top, bot], i) => {
    const [c, g] = layer(W, H);
    const n = fbm(70 + i * 9, 5);
    const base = H * (0.42 + i * 0.1), amp = H * (0.16 - i * 0.015);
    ridge(g, W, H, (x) => base - Math.pow(n(x / (520 - i * 60) + i * 3), 1.6) * amp * 1.8 + amp * 0.4, vgrad(g, base - amp, base + H * 0.2, [[0, top], [1, bot]]));
    if (i === cols.length - 1) {
      // the near slope: bushes and rocks of the bosque serrano
      const r = rng(88);
      for (let j = 0; j < 260; j++) {
        const x = r() * W, y = base + H * 0.04 + Math.pow(r(), 0.7) * H * 0.4, s = 1.5 + 6 * r() * (y / H);
        g.fillStyle = r() < 0.75 ? 'rgba(18,19,13,0.7)' : 'rgba(58,54,42,0.5)';
        g.beginPath(); g.ellipse(x, y, s * 1.4, s, 0, 0, Math.PI * 2); g.fill();
      }
    }
    ridges.push({ c, depth: 0.15 + i * 0.2, foot: base + amp * 0.4 });
  });

  return {
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

/* ---------- Delta del Paraná: islands and smoke ---------- */

function delta(W: number, H: number): Land {
  const hz = H * 0.55;
  const [sky, gs] = layer(W, H);
  gs.fillStyle = vgrad(gs, 0, hz, [[0, '#2a3038'], [0.7, '#8f8a80'], [1, '#c4b49a']]);
  gs.fillRect(0, 0, W, hz + 1);
  gs.fillStyle = vgrad(gs, hz, H, [[0, '#8d8574'], [0.3, '#58564f'], [1, '#22252a']]);
  gs.fillRect(0, hz, W, H - hz);

  // islands: long low strips, the nearer the thicker, with their reflection
  const [isl, gi] = layer(W, H);
  const ri = rng(121);
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const y = hz + (H - hz) * (0.02 + 0.5 * t * t);
    const h = 3 + 22 * t * t;
    const x0 = -40 + ri() * W * 0.5, x1 = x0 + W * (0.45 + 0.6 * ri());
    const n = fbm(130 + i, 3);
    const col = `rgb(${30 + 26 * (1 - t)},${38 + 26 * (1 - t)},${30 + 18 * (1 - t)})`;
    gi.fillStyle = col;
    gi.beginPath();
    gi.moveTo(x0, y);
    for (let x = x0; x <= x1; x += 3) gi.lineTo(x, y - h * (0.5 + 0.8 * n(x / 40)) * Math.min(1, (x - x0) / 60, (x1 - x) / 60));
    gi.lineTo(x1, y);
    gi.closePath();
    gi.fill();
    gi.globalAlpha = 0.25;
    gi.fillRect(x0 + 10, y, x1 - x0 - 20, h * 0.7);
    gi.globalAlpha = 1;
  }
  // reflections of the light on the river
  for (let i = 0; i < 90; i++) {
    const y = hz + (H - hz) * Math.pow(ri(), 1.3);
    gi.fillStyle = `rgba(230,200,160,${0.05 + 0.08 * ri()})`;
    gi.fillRect(ri() * W, y, 30 + 160 * ri() * (y / H), 1.2);
  }

  const [near, gn] = layer(W, H);
  // juncos at the water's edge
  const rn = rng(140);
  for (let i = 0; i < 200; i++) {
    const x = rn() * W * 0.42, base = H * (0.95 + 0.06 * rn()), len = H * (0.1 + 0.18 * rn());
    gn.strokeStyle = rn() < 0.5 ? '#161813' : '#22241c';
    gn.lineWidth = 1.5 + rn() * 1.5;
    gn.beginPath();
    gn.moveTo(x, base);
    gn.quadraticCurveTo(x + 6, base - len * 0.6, x + 4 + (rn() - 0.5) * 22, base - len);
    gn.stroke();
  }

  return {
    layers: [
      { c: sky, depth: 0, after: (g, W2, H2, k) => {
        // the sun through the smoke, redder as the smoke thickens
        const f = smooth(seg(k, 0.1, 0.9));
        const x = W2 * 0.66, y = hz - H2 * 0.13, r = H2 * 0.05;
        const gl = g.createRadialGradient(x, y, 0, x, y, r * 6);
        gl.addColorStop(0, `rgba(255,${200 - 90 * f},${150 - 110 * f},0.45)`);
        gl.addColorStop(1, 'rgba(255,120,60,0)');
        g.fillStyle = gl;
        g.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        g.fillStyle = `rgb(255,${236 - 120 * f},${200 - 160 * f})`;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      } },
      { c: isl, depth: 0.45, after: (g, W2, H2, k) => {
        // a curtain of smoke drifting low over the islands
        const f = smooth(seg(k, 0.1, 0.85));
        for (let i = 0; i < 4; i++) mist(g, W2, hz - H2 * (0.02 + 0.07 * i), H2 * (0.1 + 0.03 * i), '120,110,100', (0.5 - 0.08 * i) * f);
        plume(g, W2 * 0.25, hz + 4, H2 * 0.3, 2.2, H2 * 0.035, f, 150, '128,120,110', 0);
        plume(g, W2 * 0.45, hz + 8, H2 * 0.26, 2.4, H2 * 0.03, f, 151, '128,120,110', 0);
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
  ridge(gp, W, H, (x) => H * 0.55 - np(x / 300) * H * 0.07, vgrad(gp, H * 0.48, hz + 10, [[0, '#6a5444'], [1, '#4a3a2f']]));
  const rp = rng(222);
  for (let i = 0; i < 120; i++) {
    gp.fillStyle = 'rgba(40,34,26,0.7)';
    gp.beginPath(); gp.arc(rp() * W, H * (0.53 + 0.07 * rp()), 1 + 2 * rp(), 0, Math.PI * 2); gp.fill();
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

  return {
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
export function buildLand(id: string, W: number, H: number, res: number): Land {
  RES = res;
  try { return LANDSCAPES[id](W, H); } finally { RES = 1; }
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
