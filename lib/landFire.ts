/*
 * The illustrated fire of the scene interactions (lib/interaction.ts), drawn inside the region's
 * landscape (components/Landscape.tsx), in the same frame of reference as the layer it belongs to:
 * the flames sit on the piedemonte, the ridge or the island, and the nearer planes stay in front.
 *
 * Every stage is a function of the stage's progress p (0..1) and of the clock only for the flicker
 * (frozen under reduced motion): the same progress always shows the same stage.
 */
import { rng, type Ground } from './landscapes';

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/** reduced: reduced motion, drawn as fixed stages (no rain falling, no plane, no walking). */
export type Stage = { phase: 'ignite' | 'ready' | 'respond' | 'done'; p: number; time: number; still: boolean; reduced: boolean; responded: boolean };


/* ---------- flames and smoke ---------- */

/** A small cluster of flame tongues standing on (x, y), `h` px tall, leaning with the wind. */
function flame(g: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, time: number, seed: number) {
  if (h < 1) return;
  const r = rng(seed);
  const n = 3 + Math.floor(r() * 3);
  const w = h * 0.55;
  for (let i = 0; i < n; i++) {
    const ox = (r() - 0.5) * w;
    const fr = 5 + r() * 6, ph = r() * 6.28;
    const hh = h * (0.55 + 0.45 * r()) * (0.82 + 0.18 * Math.sin(time * fr + ph));
    const tipX = x + ox + lean * hh + Math.sin(time * (fr * 0.7) + ph) * hh * 0.08;
    const bw = w * (0.35 + 0.3 * r());
    const gr = g.createLinearGradient(0, y, 0, y - hh);
    gr.addColorStop(0, 'rgba(255,236,190,0.85)');
    gr.addColorStop(0.3, 'rgba(255,170,64,0.7)');
    gr.addColorStop(0.7, 'rgba(226,80,22,0.4)');
    gr.addColorStop(1, 'rgba(150,30,10,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x + ox - bw / 2, y);
    g.bezierCurveTo(x + ox - bw * 0.6, y - hh * 0.45, tipX - bw * 0.15, y - hh * 0.75, tipX, y - hh);
    g.bezierCurveTo(tipX + bw * 0.1, y - hh * 0.7, x + ox + bw * 0.6, y - hh * 0.4, x + ox + bw / 2, y);
    g.closePath();
    g.fill();
  }
}

/** A line of flames from x0 to x1 along y(x): `size(x)` px tall where it burns. */
function front(g: CanvasRenderingContext2D, x0: number, x1: number, y: (x: number) => number, size: (x: number) => number, lean: number, time: number, seed: number, step: number) {
  // one soft glow along the whole front (not one per flame: they would add up and burn out)
  const mid = (x0 + x1) / 2, top = size(mid);
  if (top > 0.5 && x1 > x0) {
    g.globalAlpha = Math.min(0.55, top / 30);
    g.drawImage(puff('255,120,40'), x0 - top * 2, y(mid) - top * 2.2, x1 - x0 + top * 4, top * 3.4);
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'lighter';
  for (let x = x0, i = 0; x <= x1; x += step, i++) {
    const s = size(x);
    if (s > 0.5) flame(g, x + (rng(seed + i)() - 0.5) * step * 0.6, y(x), s, lean, time, seed + i * 7);
  }
  g.globalCompositeOperation = 'source-over';
}

const puffCache = new Map<string, HTMLCanvasElement>();
function puff(rgb: string) {
  let c = puffCache.get(rgb);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, `rgba(${rgb},0.5)`);
  gr.addColorStop(0.5, `rgba(${rgb},0.28)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 96, 96);
  puffCache.set(rgb, c);
  return c;
}

/** A living smoke column: puffs rise from (x, y) along a leaning path, widening and thinning. */
function smoke(g: CanvasRenderingContext2D, x: number, y: number, height: number, lean: number, width: number, amount: number, time: number, seed: number, rgb = '96,90,86') {
  if (amount <= 0.01) return;
  const r = rng(seed);
  const p = puff(rgb);
  const n = 26;
  for (let i = 0; i < n; i++) {
    const off = r(), side = r() - 0.5, size = 0.8 + 0.4 * r();
    const f = (i / n + off * 0.04 + time * 0.035) % 1; // keeps rising, one puff replacing another
    const h = height * f * Math.min(1, amount * 1.4);
    const cx = x + lean * f * f * height + side * width * (0.5 + 1.4 * f);
    const cy = y - h;
    const rad = width * (0.5 + 1.8 * f) * size;
    g.globalAlpha = amount * (1 - f) * Math.min(1, f * 6) * 0.95;
    g.drawImage(p, cx - rad, cy - rad, rad * 2, rad * 2);
  }
  g.globalAlpha = 1;
}

/** The ground the fire has passed over, darkened up the slope behind the front (it stays after the flames). */
function scar(g: CanvasRenderingContext2D, x0: number, x1: number, y: (x: number) => number, h: number, a: number) {
  if (a <= 0 || x1 - x0 < 2) return;
  g.fillStyle = `rgba(26,17,11,${0.38 * a})`;
  g.beginPath();
  g.moveTo(x0, y(x0));
  // a low band following the ground, rounded at both ends (never a peak above the terrain)
  for (let x = x0; x <= x1; x += 4) g.lineTo(x, y(x) - h * Math.pow(Math.sin(((x - x0) / (x1 - x0)) * Math.PI), 0.35));
  for (let x = x1; x >= x0; x -= 4) g.lineTo(x, y(x) + h * 0.1 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI));
  g.closePath();
  g.fill();
}

/*
 * The fire of every region is a few patches on its terrain (Ground): each has a centre, how far it
 * can spread to each side, a flame height for its depth, and when it catches (a share of the
 * ignition). They grow at their own pace and with a ragged edge (some stretches burn higher, some
 * not at all), so a fire is never one even line. The response puts them out the same way, stretch by
 * stretch, in an order of its own: from the crew's side, or patch by patch under the rain. Smoke
 * rises from each patch and stays a while, paler, once the flames are gone.
 */
type Patch = { gr: Ground; cx: number; left: number; right: number; size: number; at: number; seed: number; lean: number; smokeH: number };
/** When (0..1 of the response) the stretch at x of patch i starts going out. */
type Out = (x: number, i: number) => number;

function noiseAt(seed: number) {
  const r = rng(seed);
  const v = Array.from({ length: 64 }, r);
  return (x: number) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return v[i & 63] * (1 - u) + v[(i + 1) & 63] * u; };
}

const ignOf = (s: Stage) => (s.phase === 'ignite' ? s.p : 1);
const respOf = (s: Stage) => (s.phase === 'respond' ? s.p : s.phase === 'done' ? 1 : 0);

function patches(g: CanvasRenderingContext2D, ps: Patch[], s: Stage, out: Out, smokeRgb: string) {
  const ign = ignOf(s), resp = respOf(s);
  // smoke and scars first (behind every flame), then the flames
  const live = ps.map((pt, i) => {
    const grow = smooth(seg(ign, pt.at, pt.at + 0.5));
    const reach = Math.pow(grow, 0.8);
    const x0 = Math.max(pt.gr.x0, pt.cx - pt.left * reach), x1 = Math.min(pt.gr.x1, pt.cx + pt.right * reach);
    const down = (x: number) => smooth(seg(resp, out(x, i), out(x, i) + 0.28));
    return { pt, i, grow, x0, x1, down };
  }).filter((q) => q.grow > 0);
  for (const { pt, grow, x0, x1, down } of live) {
    const span = Math.max(1, x1 - x0);
    scar(g, x0, x1, pt.gr.y, pt.size * 0.45, Math.min(1, span / 30) * grow);
    const dm = down((x0 + x1) / 2);
    smoke(g, (x0 + x1) / 2, pt.gr.y((x0 + x1) / 2) - pt.size * 0.3, pt.smokeH * (0.55 + 0.45 * grow), pt.lean * 2.2, Math.max(pt.smokeH * 0.07, span * 0.16),
      grow * (1 - 0.5 * dm), s.time, pt.seed + 5, dm > 0.4 ? '178,174,168' : smokeRgb);
  }
  for (const { pt, grow, x0, x1, down } of live) {
    const span = Math.max(1, x1 - x0);
    const n = noiseAt(pt.seed);
    const level = grow * (1 - down((x0 + x1) / 2));
    if (level > 0.02) {
      g.globalAlpha = Math.min(0.5, level * 0.5);
      g.drawImage(puff('255,120,40'), x0 - pt.size * 1.5, pt.gr.y((x0 + x1) / 2) - pt.size * 1.8, span + pt.size * 3, pt.size * 2.8);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'lighter';
    const step = Math.max(5, pt.size * 0.42);
    let k = 0;
    for (let x = x0; x <= x1; x += step, k++) {
      const rag = n(x / (step * 2.3));
      if (rag < 0.24) continue; // a gap: not every stretch burns
      const d = (x - x0) / span;
      const h = pt.size * (0.35 + 0.65 * Math.sin(Math.PI * d)) * (0.45 + 0.75 * rag) * Math.min(1, grow * 1.6) * (1 - down(x));
      if (h > 0.6) flame(g, x + (rng(pt.seed + k)() - 0.5) * step * 0.6, pt.gr.y(x) + (rag - 0.5) * pt.size * 0.15, h, pt.lean, s.time, pt.seed + k * 7);
    }
    g.globalCompositeOperation = 'source-over';
    // embers where a stretch has just gone out
    const r = rng(pt.seed + 99);
    g.globalCompositeOperation = 'lighter';
    for (let j = 0; j < span / 9; j++) {
      const x = x0 + r() * span, dn = down(x), a = dn * (1 - seg(dn, 0.6, 1) * 0.6) * grow;
      if (a < 0.05) continue;
      g.fillStyle = `rgba(255,${120 + 60 * r()},40,${0.55 * a * (0.5 + 0.5 * Math.abs(Math.sin(s.time * 2 + j)))})`;
      g.beginPath(); g.arc(x, pt.gr.y(x) - r() * pt.size * 0.25, 0.7 + r() * 0.9, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
}

/* ---------- people ---------- */

type Role = 'nozzle' | 'hose' | 'beater' | 'pump';
/**
 * One member of a brigade at the scale of the slope (hh px tall), in side view, facing the fire (to
 * the right): helmet, yellow jacket, dark trousers. `walk` (0..1) is the walk in (a stride per step),
 * `t` the clock for the small movements of the work, `role` what they do.
 */
function person(g: CanvasRenderingContext2D, x: number, y: number, hh: number, role: Role, walk: number, t: number, phase: number) {
  const walking = walk < 1;
  const stride = walking ? Math.sin(walk * 14 + phase) * 0.45 : role === 'hose' ? 0.5 : 0.28;
  const crouch = role === 'hose' ? 0.12 : 0;
  const hip = y - hh * (0.48 - crouch);
  const lean = walking ? 0.1 : role === 'nozzle' ? 0.18 : role === 'beater' ? 0.12 + 0.12 * Math.sin(t * 3.2 + phase) : 0.08;
  g.lineCap = 'round';
  // legs
  g.strokeStyle = '#1d1712';
  g.lineWidth = hh * 0.11;
  for (const sgn of [-1, 1]) {
    g.beginPath(); g.moveTo(x, hip); g.lineTo(x + Math.sin(stride * sgn) * hh * 0.48, y); g.stroke();
  }
  // torso, leaning into the work
  const sx = x + Math.sin(lean) * hh * 0.42, sy = hip - Math.cos(lean) * hh * 0.42;
  g.strokeStyle = '#c99a2e';
  g.lineWidth = hh * 0.24;
  g.beginPath(); g.moveTo(x, hip - hh * 0.04); g.lineTo(sx, sy); g.stroke();
  if (role === 'pump') { g.fillStyle = '#7d2b1c'; g.fillRect(x - hh * 0.26, hip - hh * 0.36, hh * 0.14, hh * 0.26); }
  // helmet
  g.fillStyle = '#e6dcc0';
  g.beginPath(); g.arc(sx + hh * 0.02, sy - hh * 0.1, hh * 0.1, 0, Math.PI * 2); g.fill();
  // arms and tool
  g.strokeStyle = '#c99a2e';
  g.lineWidth = hh * 0.08;
  const ax = sx - hh * 0.02, ay = sy + hh * 0.06;
  let tip: [number, number] = [ax + hh * 0.3, ay + hh * 0.1];
  if (role === 'nozzle' || role === 'pump') tip = [ax + hh * 0.34, ay - hh * 0.02];
  if (role === 'hose') tip = [ax + hh * 0.3, y - hh * 0.1];
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(tip[0], tip[1]); g.stroke();
  if (role === 'beater') {
    // a fire beater: a long pole with a flap, swung down onto the edge of the fire
    const sw = -0.2 + 0.55 * Math.sin(t * 3.2 + phase);
    const ex = tip[0] + Math.cos(sw) * hh * 0.9, ey = tip[1] + Math.sin(sw + 0.6) * hh * 0.6;
    g.strokeStyle = '#3a2a1c'; g.lineWidth = hh * 0.05;
    g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = '#2a211a'; g.fillRect(ex - hh * 0.08, ey - hh * 0.05, hh * 0.16, hh * 0.12);
  }
  g.lineCap = 'butt';
  return tip;
}

/** A droplet spray from (nx, ny) onto (tx, ty), moving out with the clock. */
function spray(g: CanvasRenderingContext2D, nx: number, ny: number, tx: number, ty: number, lift: number, a: number, t: number, still: boolean, seed: number) {
  const cx = (nx + tx) / 2, cy = Math.min(ny, ty) - lift;
  const rs = rng(seed);
  for (let k = 0; k < 26; k++) {
    const u = (k / 26 + (still ? 0 : t * 0.9) + rs() * 0.03) % 1;
    const px = (1 - u) * (1 - u) * nx + 2 * (1 - u) * u * cx + u * u * tx + (rs() - 0.5) * 6 * u;
    const py = (1 - u) * (1 - u) * ny + 2 * (1 - u) * u * cy + u * u * ty + (rs() - 0.5) * 3 * u;
    g.fillStyle = `rgba(226,238,246,${0.6 * a * (1 - u * 0.5)})`;
    g.beginPath(); g.arc(px, py, 0.6 + 1.5 * u, 0, Math.PI * 2); g.fill();
  }
}

/* ---------- the regions ---------- */

/**
 * Mendoza: the grass of the piedemonte, pushed along the slope by the wind, with a spot fire ahead
 * of the front. A brigade of five comes in from the left at their own pace: two on nozzles, one
 * minding the hose, one with a fire beater, one with a backpack pump. The fire goes out from their
 * side onwards, where the water reaches.
 */
function mendoza(g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr: Ground, sx: number) {
  const span = gr.x1 - gr.x0;
  const ps: Patch[] = [
    { gr, cx: sx, left: (sx - gr.x0) * 0.3, right: (gr.x1 - sx) * 0.62, size: H * 0.042, at: 0, seed: 300, lean: 0.25, smokeH: H * 0.5 },
    { gr, cx: sx + (gr.x1 - sx) * 0.82, left: span * 0.04, right: span * 0.1, size: H * 0.032, at: 0.42, seed: 310, lean: 0.25, smokeH: H * 0.36 },
  ];
  const crewX = ps[0].cx - ps[0].left - H * 0.03;
  const far = gr.x1;
  const norm = (x: number) => Math.min(1, Math.max(0, (x - crewX) / Math.max(1, far - crewX)));
  spark(g, sx, gr.y(sx), s);
  patches(g, ps, s, (x) => 0.14 + 0.62 * norm(x), '92,84,78');

  const resp = respOf(s);
  if (resp <= 0) return;
  const hh = H * 0.026;
  const crew: { role: Role; off: number; delay: number; speed: number }[] = [
    { role: 'hose', off: -2.6, delay: 0.02, speed: 1 },
    { role: 'nozzle', off: 0, delay: 0, speed: 1.1 },
    { role: 'nozzle', off: 1.5, delay: 0.05, speed: 0.95 },
    { role: 'beater', off: 2.2, delay: 0.09, speed: 1.05 },
    { role: 'pump', off: -1.2, delay: 0.12, speed: 0.9 },
  ];
  // the extinguished edge moves away from the crew: the jets aim just beyond it
  const edge = crewX + Math.max(0, Math.min(1, (resp - 0.2) / 0.62)) * (far - crewX);
  const jet = seg(resp, 0.1, 0.18) * (s.phase === 'respond' ? 1 - seg(resp, 0.94, 1) : 0);
  // the hose line on the ground, from the left edge of the stretch to the nozzles
  g.strokeStyle = 'rgba(130,40,26,0.85)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(gr.x0 - span * 0.25, gr.y(gr.x0) + hh * 0.1);
  g.quadraticCurveTo(crewX - hh * 3, gr.y(crewX) + hh * 0.2, crewX - hh * 2.2, gr.y(crewX) + hh * 0.05);
  g.stroke();
  crew.forEach((c, i) => {
    // reduced motion: the brigade is already in place, nobody walks in
    const walk = s.reduced ? 1 : Math.min(1, Math.max(0, (resp - c.delay) / (0.14 * c.speed)));
    if (walk <= 0) return;
    // they come in from the left along the slope, then hold their place, a little apart
    const home = crewX + c.off * hh * 0.9 + (c.role === 'beater' ? (edge - crewX) * 0.35 : 0);
    const x = home - (1 - smooth(walk)) * span * 0.18;
    // not in a row: some a step nearer (lower, a little bigger), some further up the slope
    const depth = [0.12, -0.08, 0.2, -0.04, 0.3][i];
    const y = gr.y(x) + hh * (0.05 + depth);
    const tip = person(g, x, y, hh * (1 + depth * 0.5), c.role, walk, s.still ? 0 : s.time, i * 1.7);
    if ((c.role === 'nozzle' || c.role === 'pump') && walk >= 1 && jet > 0) {
      const tx = edge + hh * (1 + i * 0.8), ty = gr.y(tx) - hh * 0.3;
      spray(g, tip[0], tip[1], tx, ty, hh * (c.role === 'pump' ? 0.6 : 1.4), jet * (c.role === 'pump' ? 0.6 : 1), s.time, s.still, 340 + i);
      smoke(g, tx, ty, H * 0.1, 0.3, H * 0.01, jet * 0.8, s.time, 350 + i, '236,238,240');
    }
  });
}

/** Córdoba: a front on the face of a ridge and a second one further along; the smoke settles in the valley below; the rain ends it. */
function cordoba(g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr: Ground, sx: number) {
  const span = gr.x1 - gr.x0;
  const ps: Patch[] = [
    { gr, cx: sx - span * 0.08, left: span * 0.32, right: span * 0.28, size: H * 0.036, at: 0, seed: 400, lean: 0.12, smokeH: H * 0.42 },
    { gr, cx: gr.x0 + span * 0.86, left: span * 0.1, right: span * 0.12, size: H * 0.028, at: 0.38, seed: 420, lean: 0.12, smokeH: H * 0.3 },
  ];
  spark(g, sx, gr.y(sx), s);
  // the smoke of the fronts pools in the valley right below them, no wider than the fire
  const lvl = smooth(seg(ignOf(s), 0.1, 0.8)) * (1 - 0.6 * smooth(seg(respOf(s), 0.3, 1)));
  if (lvl > 0) {
    const vy = gr.y(sx) + H * 0.05;
    g.globalAlpha = 0.65 * lvl;
    g.drawImage(puff('140,124,112'), gr.x0 - span * 0.4, vy - H * 0.05, span * 1.8, H * 0.1);
    g.globalAlpha = 1;
  }
  // under the rain each patch goes out at its own moment, ragged along its length
  const n = noiseAt(450);
  patches(g, ps, s, (x, i) => 0.12 + 0.3 * i + 0.22 * n(x / 40), '104,94,88');
}

/**
 * Delta: one burn season seen at three depths. Patches catch one after the other on the island in
 * the middle distance (where the reader touched), on an island on the horizon and on the nearest
 * island, half behind the juncos. The smoke lies low and drifts west over the water. Under the rain
 * they go out one by one; the smoke stays longer.
 */
function delta(g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr: Ground, sx: number, zones: Ground[]) {
  const [farG, nearG] = zones;
  const at = (q: Ground, f: number) => q.x0 + (q.x1 - q.x0) * f;
  const ps: Patch[] = [
    { gr, cx: sx, left: W * 0.05, right: W * 0.07, size: H * 0.024, at: 0, seed: 500, lean: -0.5, smokeH: H * 0.22 },
    { gr, cx: at(gr, 0.62), left: W * 0.04, right: W * 0.05, size: H * 0.02, at: 0.2, seed: 510, lean: -0.5, smokeH: H * 0.2 },
    { gr, cx: at(gr, 0.92), left: W * 0.03, right: W * 0.02, size: H * 0.018, at: 0.4, seed: 520, lean: -0.5, smokeH: H * 0.18 },
  ];
  if (farG && farG.x1 > farG.x0) {
    ps.push({ gr: farG, cx: at(farG, 0.3), left: W * 0.04, right: W * 0.05, size: H * 0.011, at: 0.3, seed: 530, lean: -0.6, smokeH: H * 0.3 });
    ps.push({ gr: farG, cx: at(farG, 0.75), left: W * 0.05, right: W * 0.04, size: H * 0.011, at: 0.5, seed: 540, lean: -0.6, smokeH: H * 0.34 });
  }
  if (nearG && nearG.x1 > nearG.x0) {
    ps.push({ gr: nearG, cx: at(nearG, 0.55), left: W * 0.06, right: W * 0.08, size: H * 0.05, at: 0.58, seed: 550, lean: -0.4, smokeH: H * 0.3 });
  }
  spark(g, sx, gr.y(sx), s);
  // the low smoke over the river, from the middle and far islands, drifting west
  const ign = ignOf(s), resp = respOf(s);
  const lvl = smooth(seg(ign, 0.1, 0.9)) * (1 - 0.45 * smooth(seg(resp, 0.4, 1)));
  if (lvl > 0) {
    for (let i = 0; i < 4; i++) {
      const yy = gr.y(sx) - H * (0.035 + 0.04 * i);
      const reach = W * (0.35 + 0.5 * lvl) * (1 - 0.12 * i);
      g.globalAlpha = (0.75 - 0.13 * i) * lvl;
      g.drawImage(puff('128,116,104'), at(gr, 0.95) - reach, yy - H * 0.04, reach, H * 0.08);
    }
    g.globalAlpha = 1;
  }
  // the rain puts the patches out one after the other, nearest last (its flames are the tallest)
  const order = [0, 1, 2, 3, 4, 5];
  const n = noiseAt(560);
  patches(g, ps, s, (x, i) => 0.1 + 0.1 * order[i] + 0.12 * n(x / 30), '120,112,104');
}

/**
 * The rain of a response: the sky closes first, then the rain comes, in depth: far streaks short,
 * thin and pale near the horizon, near ones long and brighter; a grey curtain softens the distance
 * and, on water, the drops ring the surface. It eases off at the end.
 */
function rain(g: CanvasRenderingContext2D, W: number, H: number, s: Stage, hz: number, water: boolean) {
  const resp = s.phase === 'respond' ? s.p : 0;
  const sky = smooth(seg(resp, 0, 0.18)) * (1 - 0.5 * seg(resp, 0.88, 1));
  const a = smooth(seg(resp, 0.08, 0.3)) * (1 - 0.7 * seg(resp, 0.85, 1));
  if (sky <= 0) return;
  // the sky darkens from above, the distance greys out behind the rain
  const top = g.createLinearGradient(0, 0, 0, hz + H * 0.05);
  top.addColorStop(0, `rgba(52,56,64,${0.55 * sky})`);
  top.addColorStop(1, `rgba(120,124,130,${0.3 * a})`);
  g.fillStyle = top;
  g.fillRect(0, 0, W, hz + H * 0.05);
  // reduced motion: the closed, grey sky and the wet light only, no falling streaks
  if (a <= 0 || s.reduced) return;
  const r = rng(450);
  const t = s.still ? 0 : s.time;
  for (const layer of [0, 1, 2]) {
    const d = layer / 2; // 0 far, 1 near
    g.strokeStyle = `rgba(206,214,224,${(0.14 + 0.26 * d) * a})`;
    g.lineWidth = 0.6 + 0.8 * d;
    g.beginPath();
    const n = 90 + 60 * layer;
    for (let i = 0; i < n; i++) {
      const len = (8 + 26 * d) * (0.7 + 0.6 * r());
      const yTop = d < 0.5 ? hz * 0.2 : 0; // far rain is seen against the distance only
      const yBot = d < 0.5 ? hz + H * 0.08 : H;
      const y = yTop + ((r() * (yBot - yTop) + t * (500 + 700 * d)) % (yBot - yTop));
      const x = r() * W * 1.1 - (y / H) * W * 0.06;
      g.moveTo(x, y); g.lineTo(x - len * 0.12, y + len);
    }
    g.stroke();
  }
  if (water) {
    // rings where the drops hit the river, smaller with the distance
    for (let i = 0; i < 40; i++) {
      const f = r(), ph = (r() + t * 1.4) % 1;
      const y = hz + (H - hz) * Math.pow(f, 1.6);
      const x = r() * W, sz = (2 + 10 * ((y - hz) / (H - hz))) * ph;
      g.strokeStyle = `rgba(210,220,228,${0.35 * a * (1 - ph)})`;
      g.lineWidth = 0.8;
      g.beginPath(); g.ellipse(x, y, sz, sz * 0.3, 0, 0, Math.PI * 2); g.stroke();
    }
  }
}

/** The first glow where the reader touched, before the flames take. */
function spark(g: CanvasRenderingContext2D, x: number, y: number, s: Stage) {
  const a = s.phase === 'ignite' ? seg(s.p, 0, 0.05) * (1 - seg(s.p, 0.08, 0.18)) : 0;
  if (a <= 0) return;
  const gl = g.createRadialGradient(x, y, 0, x, y, 14);
  gl.addColorStop(0, `rgba(255,220,150,${a})`);
  gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl;
  g.fillRect(x - 14, y - 14, 28, 28);
}

/* ---------- Chubut: a hydrant plane over the burning forest ---------- */

/** Where the plane is at progress p of its pass (screen fractions), and its pitch. */
function flight(p: number): { x: number; y: number; pitch: number } {
  const x = -0.18 + 1.36 * p;
  // it comes down towards the fire line, flies level while it drops, then climbs away
  const y = 0.24 + 0.12 * smooth(seg(p, 0, 0.45)) - 0.16 * smooth(seg(p, 0.62, 1));
  const pitch = 0.12 * seg(p, 0, 0.45) * (1 - seg(p, 0.3, 0.45)) * 1 - 0.16 * seg(p, 0.6, 0.75) * (1 - seg(p, 0.85, 1));
  return { x, y, pitch };
}
const DROP: [number, number] = [0.4, 0.6];

/** A single-engine air tanker in side view, lit from below by the fire. */
function plane(g: CanvasRenderingContext2D, x: number, y: number, L: number, pitch: number, time: number, still: boolean, bank = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(-pitch);
  // banking into the climb away: seen from the side, the fuselage foreshortens a little and the far
  // wing shows above it
  if (bank > 0) {
    g.scale(1, 1 - 0.18 * bank);
    g.fillStyle = 'rgba(20,16,14,0.9)';
    g.beginPath(); g.moveTo(L * 0.18, -L * 0.06); g.lineTo(-L * 0.08, -L * (0.06 + 0.12 * bank)); g.lineTo(-L * 0.16, -L * (0.05 + 0.12 * bank)); g.lineTo(L * 0.1, -L * 0.05); g.fill();
  }
  g.fillStyle = '#14100e';
  // fuselage
  g.beginPath();
  g.moveTo(L * 0.5, 0);
  g.quadraticCurveTo(L * 0.46, -L * 0.07, L * 0.3, -L * 0.075);
  g.lineTo(-L * 0.38, -L * 0.04);
  g.lineTo(-L * 0.5, -L * 0.03);
  g.lineTo(-L * 0.5, L * 0.005);
  g.lineTo(-L * 0.3, L * 0.03);
  g.quadraticCurveTo(L * 0.3, L * 0.06, L * 0.5, 0);
  g.fill();
  // cockpit hump, tail fin, tailplane, low wing seen almost edge-on
  g.beginPath(); g.moveTo(L * 0.18, -L * 0.07); g.quadraticCurveTo(L * 0.1, -L * 0.13, -L * 0.02, -L * 0.065); g.fill();
  g.beginPath(); g.moveTo(-L * 0.36, -L * 0.04); g.lineTo(-L * 0.47, -L * 0.17); g.lineTo(-L * 0.5, -L * 0.17); g.lineTo(-L * 0.5, -L * 0.02); g.fill();
  g.fillRect(-L * 0.5, -L * 0.035, L * 0.16, L * 0.015);
  g.beginPath(); g.moveTo(L * 0.22, L * 0.02); g.lineTo(-L * 0.12, L * 0.035); g.lineTo(-L * 0.14, L * 0.055); g.lineTo(L * 0.24, L * 0.04); g.fill();
  // propeller disc
  g.strokeStyle = 'rgba(40,34,30,0.55)';
  g.lineWidth = 1;
  g.beginPath(); g.ellipse(L * 0.51, 0, L * 0.012, L * 0.13 * (still ? 1 : 0.9 + 0.1 * Math.sin(time * 40)), 0, 0, Math.PI * 2); g.stroke();
  // fire light on the belly
  const gr = g.createLinearGradient(0, -L * 0.02, 0, L * 0.06);
  gr.addColorStop(0, 'rgba(255,120,40,0)');
  gr.addColorStop(1, 'rgba(255,120,40,0.45)');
  g.fillStyle = gr;
  g.fillRect(-L * 0.4, -L * 0.02, L * 0.9, L * 0.08);
  g.restore();
}

function chubut(g: CanvasRenderingContext2D, W: number, H: number, s: Stage) {
  const L = Math.max(110, W * 0.15);
  const line = H * 0.56; // the burning forest line of the cinematic opening
  const p = s.phase === 'respond' ? s.p : 1;
  // the falling water: one sheet. Every slice of the load released along the drop keeps a little of
  // the plane's speed, falls and widens; drawn as soft vertical streaks side by side, the slices make
  // a curtain hanging from the plane's path down to the burning line, thinning as it lands
  const N = s.reduced ? 0 : 48; // reduced motion: no falling water, only its result
  const r = rng(700);
  for (let i = 0; i < N; i++) {
    const rel = DROP[0] + ((DROP[1] - DROP[0]) * i) / N;
    const age = (p - rel) / 0.15;
    if (age <= 0 || age > 1.5) continue;
    const at = flight(rel);
    const x = (at.x + 0.035 * Math.sqrt(age)) * W + (r() - 0.5) * 6;
    const y0 = at.y * H + L * 0.06;
    const y = y0 + (line - y0) * Math.min(1, age * age);
    const top = y0 + (line - y0) * Math.min(1, Math.max(0, age - 0.35) ** 2);
    const a = Math.min(1, age * 4) * (1 - seg(age, 1.05, 1.5));
    const wdt = 5 + 18 * age;
    const gr = g.createLinearGradient(0, top, 0, y);
    gr.addColorStop(0, 'rgba(238,243,246,0)');
    gr.addColorStop(0.6, `rgba(238,243,246,${0.16 * a})`);
    gr.addColorStop(1, `rgba(238,243,246,${0.3 * a})`);
    g.fillStyle = gr;
    g.fillRect(x - wdt / 2, top, wdt, Math.max(2, y - top));
  }
  g.globalAlpha = 1;
  // steam where it lands, growing after the drop and lingering
  const hit = smooth(seg(p, DROP[0] + 0.12, DROP[1] + 0.2));
  for (let i = 0; i < 5; i++) {
    const at = flight(DROP[0] + ((DROP[1] - DROP[0]) * (i + 0.5)) / 5);
    smoke(g, (at.x + 0.14) * W, line, H * 0.3, 0.4, H * 0.03, hit * (s.phase === 'done' ? 0.6 : 1), s.time, 720 + i, '226,228,230');
  }
  if (s.phase === 'respond' && p < 1 && !s.reduced) {
    const at = flight(p);
    // its shadow, soft, on the smoke over the burning line below it: it ties the plane to the scene
    const sh = g.createRadialGradient(at.x * W + L * 0.1, line - H * 0.04, 0, at.x * W + L * 0.1, line - H * 0.04, L * 0.6);
    sh.addColorStop(0, 'rgba(10,6,4,0.28)');
    sh.addColorStop(1, 'rgba(10,6,4,0)');
    g.fillStyle = sh;
    g.save(); g.translate(at.x * W + L * 0.1, line - H * 0.04); g.scale(1, 0.25); g.translate(-(at.x * W + L * 0.1), -(line - H * 0.04));
    g.fillRect(at.x * W + L * 0.1 - L * 0.6, line - H * 0.04 - L * 0.6, L * 1.2, L * 1.2);
    g.restore();
    plane(g, at.x * W, at.y * H, L, at.pitch, s.time, s.still, smooth(seg(p, 0.66, 0.85)));
  }
}

/** How much of its heat the cinematic fire of Chubut keeps (the drop knocks it down, then it partly recovers). */
export function chubutHeat(phase: Stage['phase'] | 'idle', p: number): number {
  if (phase === 'respond') return 1 - 0.5 * smooth(seg(p, DROP[0] + 0.1, DROP[1] + 0.15)) + 0.15 * smooth(seg(p, 0.85, 1));
  if (phase === 'done') return 0.65;
  return 1;
}

/** Where on its ground a region's fire starts (px of the landscape frame). */
export function spotOn(id: string, gr: Ground): [number, number] {
  const f = id === 'mendoza' ? 0.22 : id === 'delta' ? 0.25 : 0.5;
  const x = gr.x0 + (gr.x1 - gr.x0) * f;
  return [x, gr.y(x)];
}

/** Draws a region's stage on its ground, in the frame of the ground's layer. */
export function drawInteraction(id: string, g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr?: Ground, zones: Ground[] = []) {
  if (id === 'chubut') { chubut(g, W, H, s); return; }
  if (!gr) return;
  const [sx] = spotOn(id, gr);
  if (id === 'mendoza') mendoza(g, W, H, s, gr, sx);
  else if (id === 'cordoba') cordoba(g, W, H, s, gr, sx);
  else if (id === 'delta') delta(g, W, H, s, gr, sx, zones);
}

/** Over the whole frame, after every layer (the weather of a response). */
export function drawWeather(id: string, g: CanvasRenderingContext2D, W: number, H: number, s: Stage, horizon = H * 0.5) {
  if (id === 'cordoba') rain(g, W, H, s, horizon, false);
  else if (id === 'delta') rain(g, W, H, s, horizon, true);
}
