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

/**
 * One tongue of fire as a closed shape from a base `bw` wide to a tip at (tipX, y - hh), its sides
 * swaying (`sway`, px) so it never stands still.
 */
function tongue(g: CanvasRenderingContext2D, cx: number, y: number, bw: number, hh: number, tipX: number, sway: number) {
  g.beginPath();
  g.moveTo(cx - bw / 2, y);
  g.bezierCurveTo(cx - bw * 0.62 + sway * 0.4, y - hh * 0.42, tipX - bw * 0.22 - sway, y - hh * 0.72, tipX, y - hh);
  g.bezierCurveTo(tipX + bw * 0.14 - sway * 0.6, y - hh * 0.68, cx + bw * 0.62 + sway * 0.5, y - hh * 0.38, cx + bw / 2, y);
  g.closePath();
  g.fill();
}

/**
 * A small cluster of flame tongues standing on (x, y), `h` px tall, leaning with the wind. Each tongue
 * is three layers, as a fire reads: a red envelope, an orange body and a short near-white core at the
 * base; the tips sway and now and then a wisp breaks off and rises. Drawn additively by the callers.
 */
function flame(g: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, time: number, seed: number) {
  if (h < 1) return;
  const r = rng(seed);
  // a small flame (far away) reads the same with fewer tongues and one layer: far cheaper to draw
  const small = h < 14;
  const n = small ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 3);
  const w = h * 0.55;
  const [g1, g2, g3] = flameGradients(g, h);
  // drawn in the flame's own frame (its base at 0), so the cached gradients fit any position
  g.save();
  g.translate(x, y);
  for (let i = 0; i < n; i++) {
    const ox = (r() - 0.5) * w;
    const fr = 5 + r() * 6, ph = r() * 6.28;
    const hh = h * (0.55 + 0.45 * r()) * (0.8 + 0.2 * Math.sin(time * fr + ph) + 0.06 * Math.sin(time * fr * 2.3 + ph * 2));
    const tipX = ox + lean * hh + Math.sin(time * (fr * 0.7) + ph) * hh * 0.1;
    const bw = w * (0.35 + 0.3 * r());
    const sway = Math.sin(time * fr * 0.9 + ph * 1.3) * bw * 0.28;
    const cx = ox;
    if (small) {
      g.fillStyle = g2;
      tongue(g, cx, 0, bw, hh, tipX, sway);
      continue;
    }
    // envelope: wide, red, fading early
    g.fillStyle = g1;
    tongue(g, cx, 0, bw * 1.15, hh, tipX, sway);
    // body: orange, a little shorter
    g.fillStyle = g2;
    tongue(g, cx, 0, bw * 0.72, hh * 0.8, cx + (tipX - cx) * 0.8, sway * 0.8);
    // core: short, near white, at the base
    g.fillStyle = g3;
    tongue(g, cx, 0, bw * 0.4, hh * 0.45, cx + (tipX - cx) * 0.45, sway * 0.5);
    // a wisp torn from the tip, rising and shrinking
    if (r() < 0.55) {
      const k = (time * (0.6 + fr * 0.08) + ph) % 1;
      const wy = -hh * (1 + k * 0.45), wx = tipX + lean * hh * 0.3 * k + sway * 0.3;
      const rad = bw * 0.16 * (1 - k);
      if (rad > 0.4) {
        g.fillStyle = `rgba(255,${150 - 50 * k},50,${0.55 * (1 - k)})`;
        g.beginPath(); g.ellipse(wx, wy, rad, rad * 1.8, lean * 0.5, 0, Math.PI * 2); g.fill();
      }
    }
  }
  g.restore();
}

/**
 * The three layers' gradients of a flame `h` px tall, in its own frame (base at 0, rising to -h): made
 * once per height (rounded to 2 px) and reused, since making them costs more than drawing the shapes.
 */
const gradCache = new Map<number, [CanvasGradient, CanvasGradient, CanvasGradient]>();
function flameGradients(g: CanvasRenderingContext2D, h: number): [CanvasGradient, CanvasGradient, CanvasGradient] {
  const k = Math.max(2, Math.round(h / 2) * 2);
  let c = gradCache.get(k);
  if (c) return c;
  if (gradCache.size > 300) gradCache.clear();
  const g1 = g.createLinearGradient(0, 0, 0, -k);
  g1.addColorStop(0, 'rgba(255,128,44,0.5)');
  g1.addColorStop(0.45, 'rgba(224,64,18,0.38)');
  g1.addColorStop(1, 'rgba(130,24,8,0)');
  const g2 = g.createLinearGradient(0, 0, 0, -k * 0.8);
  g2.addColorStop(0, 'rgba(255,196,96,0.75)');
  g2.addColorStop(0.5, 'rgba(255,140,40,0.5)');
  g2.addColorStop(1, 'rgba(230,80,20,0)');
  const g3 = g.createLinearGradient(0, 0, 0, -k * 0.45);
  g3.addColorStop(0, 'rgba(255,252,232,0.95)');
  g3.addColorStop(0.6, 'rgba(255,228,150,0.55)');
  g3.addColorStop(1, 'rgba(255,200,100,0)');
  c = [g1, g2, g3];
  gradCache.set(k, c);
  return c;
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

// a puff is drawn hundreds of times a frame: once ready, as an ImageBitmap (cheaper to draw than a canvas)
const puffCache = new Map<string, CanvasImageSource>();
function puff(rgb: string): CanvasImageSource {
  const had = puffCache.get(rgb);
  if (had) return had;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, `rgba(${rgb},0.5)`);
  gr.addColorStop(0.5, `rgba(${rgb},0.28)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 96, 96);
  puffCache.set(rgb, c);
  if (typeof createImageBitmap === 'function') createImageBitmap(c).then((b) => puffCache.set(rgb, b), () => {});
  return c;
}

/**
 * A living smoke column: puffs rise from (x, y) along a leaning path, widening, curling and thinning.
 * It has body: darker near the fire, paler as it climbs, with a lit rim on top (the sky) and, low
 * down, the fire's glow on its underside.
 */
function smoke(g: CanvasRenderingContext2D, x: number, y: number, height: number, lean: number, width: number, amount: number, time: number, seed: number, rgb = '96,90,86') {
  if (amount <= 0.01) return;
  const r = rng(seed);
  const [cr, cg, cb] = rgb.split(',').map(Number);
  const tone = (k: number) => `${Math.round(cr * k)},${Math.round(cg * k)},${Math.round(cb * k)}`;
  const base = puff(tone(0.62)), body = puff(rgb), rim = puff(tone(1.28).split(',').map((v) => Math.min(255, +v)).join(','));
  const glow = puff('255,120,50');
  const n = 28;
  for (let i = 0; i < n; i++) {
    const off = r(), side = r() - 0.5, size = 0.8 + 0.45 * r(), curl = r() * 6.28;
    const f = (i / n + off * 0.04 + time * 0.035) % 1; // keeps rising, one puff replacing another
    const h = height * f * Math.min(1, amount * 1.4);
    const cx = x + lean * f * f * height + side * width * (0.5 + 1.5 * f) + Math.sin(f * 7 + time * 0.5 + curl) * width * 0.35 * f;
    const cy = y - h;
    const rad = width * (0.5 + 1.9 * f) * size;
    const a = amount * (1 - f) * Math.min(1, f * 6);
    // the body, darker low down
    g.globalAlpha = a * 0.95;
    g.drawImage(f < 0.35 ? base : body, cx - rad, cy - rad, rad * 2, rad * 2);
    // the lit rim, a little up and to the left (every other puff: the eye reads it as a whole)
    if (i % 2) continue;
    g.globalAlpha = a * 0.45 * Math.min(1, f * 2.5);
    g.drawImage(rim, cx - rad * 0.85 - rad * 0.15, cy - rad * 0.85 - rad * 0.2, rad * 1.7, rad * 1.7);
    // the fire's glow on its underside, only near the flames
    if (f < 0.3) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a * 0.22 * (1 - f / 0.3);
      g.drawImage(glow, cx - rad, cy - rad * 0.4, rad * 2, rad * 1.4);
      g.globalCompositeOperation = 'source-over';
    }
  }
  g.globalAlpha = 1;
}

/**
 * A blanket of smoke: a wide band of overlapping puffs at height y, thick in its middle, drifting
 * sideways with the clock (dir -1 west, 1 east, 0 barely) and breathing. `level` 0..1 fills it in.
 */
function blanket(g: CanvasRenderingContext2D, W: number, y: number, h: number, level: number, time: number, still: boolean, rgb: string, dir: number) {
  if (level < 0.02) return;
  const r = rng(731), p = puff(rgb), drift = still ? 0 : time * 6 * (dir || 0.2);
  for (let k = 0; k < 12; k++) {
    const w = W * (0.26 + 0.24 * r()), u = ((r() * (W + w) + drift) % (W + w) + W + w) % (W + w) - w / 2;
    const yy = y + (r() - 0.5) * h * 1.2, hh = h * (0.8 + 0.8 * r());
    g.globalAlpha = level * (0.35 + 0.25 * r()) * (0.85 + 0.15 * Math.sin(time * 0.3 + k));
    g.drawImage(p, u - w / 2, yy - hh / 2, w, hh);
  }
  g.globalAlpha = 1;
}

/** The ground the fire has passed over: a soft darkened stain on the terrain, fading at its edges (no hard band). */
function scar(g: CanvasRenderingContext2D, x0: number, x1: number, y: (x: number) => number, h: number, a: number) {
  if (a <= 0 || x1 - x0 < 2) return;
  const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + h, cy = y(cx) - h * 0.15;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
  gr.addColorStop(0, `rgba(26,17,11,${0.42 * a})`);
  gr.addColorStop(0.7, `rgba(26,17,11,${0.25 * a})`);
  gr.addColorStop(1, 'rgba(26,17,11,0)');
  g.save();
  g.translate(cx, cy); g.scale(1, Math.min(1, (h * 1.4) / rx)); g.translate(-cx, -cy);
  g.fillStyle = gr;
  g.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
  g.restore();
}

/*
 * The fire of every region is a few patches on its terrain (Ground): each has a centre, how far it
 * can spread to each side, a flame height for its depth, and when it catches (a share of the
 * ignition). They grow at their own pace and with a ragged edge (some stretches burn higher, some
 * not at all), so a fire is never one even line. The response puts them out the same way, stretch by
 * stretch, in an order of its own: from the crew's side, or patch by patch under the rain. Smoke
 * rises from each patch and stays a while, paler, once the flames are gone.
 */
/** reflect: the patch burns on a bank and its light shows on the water below it. */
type Patch = { gr: Ground; cx: number; left: number; right: number; size: number; at: number; seed: number; lean: number; smokeH: number; reflect?: boolean };

/**
 * Embers carried up by the heat: a few bright specks rising from a burning stretch, drifting with the
 * wind and dying out as they climb. Their number follows how much still burns. Fixed under reduced motion.
 */
function embers(g: CanvasRenderingContext2D, x0: number, x1: number, y: (x: number) => number, size: number, lean: number, level: number, time: number, still: boolean, seed: number) {
  if (level < 0.05 || x1 - x0 < 2) return;
  const r = rng(seed);
  const n = Math.round(2 + ((x1 - x0) / 16) * level);
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const x = x0 + r() * (x1 - x0), sp = 0.25 + 0.3 * r(), ph = r();
    const life = still ? ph : (ph + time * sp) % 1;
    const yy = y(x) - size * (0.5 + life * 3.4);
    const xx = x + (lean * 2 + 0.3) * size * life + Math.sin(time * 1.9 + k) * size * 0.18 * life;
    const a = level * (1 - life) * (0.55 + 0.45 * Math.abs(Math.sin(time * 6 + k)));
    g.fillStyle = `rgba(255,${150 + 70 * r()},70,${0.85 * a})`;
    g.beginPath(); g.arc(xx, yy, Math.max(0.6, size * 0.04) * (0.7 + 0.6 * r()), 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

/** The fire's light on the water under a burning bank: a warm smear, broken by the ripples. */
function reflection(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, size: number, level: number, time: number, seed: number) {
  if (level < 0.03) return;
  const span = x1 - x0, r = rng(seed);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(0.45, level * 0.45);
  g.drawImage(puff('255,110,40'), x0 - size, y + size * 0.15, span + size * 2, size * 2.6);
  g.globalAlpha = 1;
  // the ripples: short bright strokes, shimmering, thinning with depth
  for (let k = 0; k < span / 6; k++) {
    const x = x0 + r() * span, d = r(), w = size * (0.3 + 0.9 * r()) * (1 - 0.5 * d);
    const a = level * (1 - d) * (0.35 + 0.35 * Math.sin(time * 3 + k * 1.7));
    if (a <= 0.02) continue;
    g.fillStyle = `rgba(255,${140 + 60 * r()},70,${a})`;
    g.fillRect(x - w / 2 + Math.sin(time * 1.3 + k) * size * 0.15, y + size * (0.3 + d * 1.8), w, Math.max(1, size * 0.05));
  }
  g.globalCompositeOperation = 'source-over';
}
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
    // a column over the patch, and over a long front a second one off its side (one column would read thin)
    const amt = Math.min(1, grow * 1.2) * (1 - 0.4 * dm), sw = Math.max(pt.smokeH * 0.08, span * 0.2), col = dm > 0.4 ? '178,174,168' : smokeRgb;
    smoke(g, (x0 + x1) / 2, pt.gr.y((x0 + x1) / 2) - pt.size * 0.3, pt.smokeH * (0.6 + 0.5 * grow), pt.lean * 2.2, sw, amt, s.time, pt.seed + 5, col);
    if (span > pt.size * 6) smoke(g, x0 + span * 0.22, pt.gr.y(x0 + span * 0.22) - pt.size * 0.3, pt.smokeH * (0.45 + 0.35 * grow), pt.lean * 2.4, sw * 0.7, amt * 0.8, s.time + 3.7, pt.seed + 6, col);
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
    const step = Math.max(7, pt.size * 0.5);
    let k = 0;
    for (let x = x0; x <= x1; x += step, k++) {
      const rag = n(x / (step * 2.3));
      if (rag < 0.24) continue; // a gap: not every stretch burns
      const d = (x - x0) / span;
      const h = pt.size * (0.35 + 0.65 * Math.sin(Math.PI * d)) * (0.45 + 0.75 * rag) * Math.min(1, grow * 1.6) * (1 - down(x));
      if (h > 0.6) flame(g, x + (rng(pt.seed + k)() - 0.5) * step * 0.6, pt.gr.y(x) + (rag - 0.5) * pt.size * 0.15, h, pt.lean, s.time, pt.seed + k * 7);
    }
    g.globalCompositeOperation = 'source-over';
    embers(g, x0, x1, pt.gr.y, pt.size, pt.lean, level, s.time, s.still, pt.seed + 77);
    if (pt.reflect) reflection(g, x0, x1, pt.gr.y((x0 + x1) / 2), pt.size, level, s.time, pt.seed + 88);
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
  // the reflective bands across the jacket, at the chest and the waist
  const tx = sx - x, ty = sy - hip, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
  g.strokeStyle = 'rgba(232,240,226,0.9)';
  g.lineWidth = Math.max(0.8, hh * 0.035);
  for (const f of [0.35, 0.72]) {
    const bx = x + tx * f, by = hip - hh * 0.04 + ty * f;
    g.beginPath(); g.moveTo(bx - nx * hh * 0.12, by - ny * hh * 0.12); g.lineTo(bx + nx * hh * 0.12, by + ny * hh * 0.12); g.stroke();
  }
  if (role === 'pump') { g.fillStyle = '#7d2b1c'; g.fillRect(x - hh * 0.26, hip - hh * 0.36, hh * 0.14, hh * 0.26); }
  // helmet with its brim and the visor down
  const hx0 = sx + hh * 0.02, hy0 = sy - hh * 0.1;
  g.fillStyle = '#e6dcc0';
  g.beginPath(); g.arc(hx0, hy0, hh * 0.1, Math.PI, 0); g.lineTo(hx0 + hh * 0.13, hy0 + hh * 0.01); g.lineTo(hx0 - hh * 0.12, hy0 + hh * 0.01); g.fill();
  g.fillStyle = '#d9cfb0';
  g.beginPath(); g.arc(hx0, hy0 + hh * 0.02, hh * 0.085, 0, Math.PI); g.fill();
  g.fillStyle = 'rgba(40,52,60,0.85)';
  g.fillRect(hx0 + hh * 0.02, hy0 + hh * 0.02, hh * 0.08, hh * 0.05);
  // arms and tool
  g.strokeStyle = '#c99a2e';
  g.lineWidth = hh * 0.08;
  const ax = sx - hh * 0.02, ay = sy + hh * 0.06;
  let tip: [number, number] = [ax + hh * 0.3, ay + hh * 0.1];
  if (role === 'nozzle' || role === 'pump') tip = [ax + hh * 0.34, ay - hh * 0.02];
  if (role === 'hose') tip = [ax + hh * 0.3, y - hh * 0.1];
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(tip[0], tip[1]); g.stroke();
  // gloves
  g.fillStyle = '#2a2018';
  g.beginPath(); g.arc(tip[0], tip[1], hh * 0.045, 0, Math.PI * 2); g.fill();
  if (role === 'nozzle' || role === 'pump') {
    // the branch pipe in the hands
    g.strokeStyle = '#5b5f63'; g.lineWidth = hh * 0.05;
    g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(tip[0] + hh * 0.16, tip[1] - hh * 0.03); g.stroke();
    tip = [tip[0] + hh * 0.16, tip[1] - hh * 0.03];
  }
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
  // the jet itself: a solid stream leaving the nozzle that opens and thins toward the fire
  const jetG = g.createLinearGradient(nx, ny, tx, ty);
  jetG.addColorStop(0, `rgba(228,240,250,${0.75 * a})`);
  jetG.addColorStop(0.7, `rgba(228,240,250,${0.3 * a})`);
  jetG.addColorStop(1, 'rgba(228,240,250,0)');
  g.strokeStyle = jetG;
  g.lineCap = 'round';
  for (const [wd, off] of [[2.4, 0], [1.2, 2]] as const) {
    g.lineWidth = wd;
    g.beginPath(); g.moveTo(nx, ny); g.quadraticCurveTo(cx, cy - off, tx, ty - off); g.stroke();
  }
  g.lineCap = 'butt';
  for (let k = 0; k < 26; k++) {
    const u = (k / 26 + (still ? 0 : t * 0.9) + rs() * 0.03) % 1;
    const px = (1 - u) * (1 - u) * nx + 2 * (1 - u) * u * cx + u * u * tx + (rs() - 0.5) * 6 * u;
    const py = (1 - u) * (1 - u) * ny + 2 * (1 - u) * u * cy + u * u * ty + (rs() - 0.5) * 3 * u;
    g.fillStyle = `rgba(226,238,246,${0.6 * a * (1 - u * 0.5)})`;
    g.beginPath(); g.arc(px, py, 0.6 + 1.5 * u, 0, Math.PI * 2); g.fill();
  }
}

/**
 * A row of shrubs (jarilla, espinillo, pajonal) along a stretch of ground, drawn in front of the fire:
 * the flames rise from behind them instead of standing on bare ground, and they catch the fire's light
 * on their tops. Deterministic per seed.
 */
function shrubs(g: CanvasRenderingContext2D, gr: Ground, x0: number, x1: number, size: number, seed: number, dark: string, lit: number) {
  if (x1 - x0 < 1) return;
  // they never change: painted once into a sprite (crowns, and their lit rims apart), then drawn as
  // two images a frame (redrawn arc by arc, they cost more than the fire itself)
  const key = `${seed}|${Math.round(x0)}|${Math.round(x1)}|${size.toFixed(2)}|${dark}|${Math.round(gr.y(x0))}|${Math.round(gr.y(x1))}`;
  let sp = shrubSprites.get(key);
  if (!sp) {
    if (shrubSprites.size > 48) shrubSprites.clear();
    let lo = Infinity, hi = -Infinity;
    for (let x = x0; x <= x1 + 4; x += 4) { const y = gr.y(Math.min(x, x1)); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const ox = x0 - size * 1.2, oy = lo - size * 1.2, w = x1 - x0 + size * 2.4, h = hi - lo + size * 2.4;
    const k = SPRITE_SCALE;
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w * k); c.height = Math.ceil(h * k); const cg = c.getContext('2d')!; cg.setTransform(k, 0, 0, k, -ox * k, -oy * k); return [c, cg] as const; };
    const [crowns, cg] = mk(), [rims, rg] = mk();
    paintShrubs(cg, rg, gr, x0, x1, size, seed, dark);
    sp = { crowns, rims, ox, oy, w, h };
    shrubSprites.set(key, sp);
  }
  g.drawImage(sp.crowns, sp.ox, sp.oy, sp.w, sp.h);
  if (lit > 0) {
    const a = g.globalAlpha;
    g.globalAlpha = a * Math.min(1, lit);
    g.drawImage(sp.rims, sp.ox, sp.oy, sp.w, sp.h);
    g.globalAlpha = a;
  }
}
const SPRITE_SCALE = 2;
const shrubSprites = new Map<string, { crowns: HTMLCanvasElement; rims: HTMLCanvasElement; ox: number; oy: number; w: number; h: number }>();

function paintShrubs(g: CanvasRenderingContext2D, rg: CanvasRenderingContext2D, gr: Ground, x0: number, x1: number, size: number, seed: number, dark: string) {
  const r = rng(seed);
  // clumps of round crowns, overlapping, uneven in height; the fire lights their tops from behind
  for (let x = x0; x < x1; x += size * (0.35 + 0.5 * r())) {
    if (r() < 0.4) continue; // gaps: the fire shows between the clumps
    const y = gr.y(x) + size * 0.55; // a step in front of the fire: only the base of the flames is hidden
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const cx = x + (r() - 0.5) * size * 0.8, rr = size * (0.28 + 0.3 * r()), cy = y - rr * (0.6 + 0.5 * r());
      g.fillStyle = dark;
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
      // the fire's light on the crown's upper rim (its own layer: it follows how much still burns)
      rg.strokeStyle = 'rgba(255,150,70,0.55)';
      rg.lineWidth = Math.max(1, rr * 0.18);
      rg.beginPath(); rg.arc(cx, cy, rr * 0.92, Math.PI * 1.15, Math.PI * 1.85); rg.stroke();
    }
  }
}

/**
 * A forest fire engine of the provincial plan, parked on the track below the slope, its hose run out
 * to the line: red body with a white stripe, cab with windows, the reel behind, the light bar turning.
 * (x, y) is its rear wheel on the ground; it faces right, tilted with the ground.
 */
function engine(g: CanvasRenderingContext2D, x: number, y: number, L: number, tilt: number, a: number, t: number, still: boolean) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.translate(x, y); g.rotate(tilt);
  const h = L * 0.34, wr = L * 0.075;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(L * 0.45, 0, L * 0.55, wr * 0.6, 0, 0, Math.PI * 2); g.fill();
  // body: the tank behind, the cab in front
  g.fillStyle = '#a92a1f';
  g.fillRect(-L * 0.05, -h - wr, L * 0.68, h);
  g.fillStyle = '#c3352a';
  g.beginPath(); g.moveTo(L * 0.63, -wr); g.lineTo(L * 0.63, -h * 1.05 - wr); g.lineTo(L * 0.86, -h * 1.05 - wr); g.lineTo(L, -h * 0.5 - wr); g.lineTo(L, -wr); g.fill();
  // windows, stripe, locker doors
  g.fillStyle = 'rgba(30,40,48,0.9)';
  g.beginPath(); g.moveTo(L * 0.68, -h * 0.98 - wr); g.lineTo(L * 0.85, -h * 0.98 - wr); g.lineTo(L * 0.95, -h * 0.55 - wr); g.lineTo(L * 0.68, -h * 0.55 - wr); g.fill();
  g.fillStyle = '#efe7d6';
  g.fillRect(-L * 0.05, -h * 0.42 - wr, L * 1.05, h * 0.07);
  g.strokeStyle = 'rgba(60,14,10,0.6)'; g.lineWidth = 1;
  for (const f of [0.08, 0.26, 0.44]) g.strokeRect(L * f, -h * 0.92 - wr, L * 0.15, h * 0.42);
  // the hose reel at the back
  g.fillStyle = '#5a1810';
  g.beginPath(); g.arc(-L * 0.02, -h * 0.55 - wr, h * 0.22, 0, Math.PI * 2); g.fill();
  // the light bar, turning (red, then white), with its glow
  const on = still ? 0 : Math.sin(t * 9) > 0 ? 1 : 0;
  for (const [i, col] of [[0, '255,60,40'], [1, '255,240,230']] as const) {
    const lit = i === on ? 1 : 0.25;
    g.fillStyle = `rgba(${col},${lit})`;
    g.fillRect(L * (0.66 + i * 0.1), -h * 1.05 - wr - h * 0.12, L * 0.09, h * 0.12);
    if (lit === 1) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a * 0.35;
      g.drawImage(puff(col), L * (0.6 + i * 0.1), -h * 1.6 - wr, L * 0.2, h * 1.1);
      g.globalAlpha = a;
      g.globalCompositeOperation = 'source-over';
    }
  }
  g.fillStyle = '#16120f';
  for (const wx of [0, L * 0.78]) { g.beginPath(); g.arc(wx, -wr, wr, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#6a625a';
  for (const wx of [0, L * 0.78]) { g.beginPath(); g.arc(wx, -wr, wr * 0.4, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

/* ---------- the regions ---------- */

/**
 * Mendoza: the grass of the piedemonte catches near the middle of the slope and a second front opens
 * to the right. Two lines of a brigade fight them: the main one comes in from the left with its hose
 * from off screen (two nozzles, a hose minder, a backpack pump, a fire beater), a second one from the
 * right with its own hose. Each line pushes the water along its front: a stretch goes out when the
 * water reaches it, the jets aim at the edge that still burns, and they stop once nothing is left.
 */
function mendoza(g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr: Ground, sx: number) {
  const span = gr.x1 - gr.x0;
  const hh = H * 0.05;
  const A = { cx: sx, left: span * 0.15, right: span * 0.13 };
  const B = { cx: sx + span * 0.5, left: span * 0.1, right: span * 0.09 };
  const ps: Patch[] = [
    { gr, ...A, size: H * 0.1, at: 0, seed: 300, lean: 0.18, smokeH: H * 0.6 },
    { gr, ...B, size: H * 0.08, at: 0.3, seed: 310, lean: 0.18, smokeH: H * 0.48 },
  ];
  // each front is put out from its crew's side: A from its left end rightwards, B from its right end
  // leftwards. A stretch at x starts going out at OUT0 + OUT1 * (its place along the attack) and is
  // out 0.28 later; the edge of the water is where that is half done
  const aL = A.cx - A.left, aR = A.cx + A.right, bL = B.cx - B.left, bR = B.cx + B.right;
  const OUT0 = 0.16, OUT1 = 0.56, HALF = 0.14;
  const along = (x: number, i: number) => (i === 0 ? (x - aL) / (aR - aL) : (bR - x) / (bR - bL));
  const out = (x: number, i: number) => OUT0 + OUT1 * Math.min(1, Math.max(0, along(x, i)));
  spark(g, sx, gr.y(sx), s);
  patches(g, ps, s, out, '92,84,78');

  const resp = respOf(s);
  if (resp <= 0) return;
  const reach = (resp - OUT0 - HALF) / OUT1; // 0..1 along each front: how far the water has got
  const edgeA = aL + Math.min(1, Math.max(0, reach)) * (aR - aL);
  const edgeB = bR - Math.min(1, Math.max(0, reach)) * (bR - bL);
  // water flows while there is fire left to reach
  const jet = seg(resp, 0.08, 0.15) * (1 - seg(reach, 0.95, 1.08));

  // the shrubs of the piedemonte in front of both fronts: the flames rise from behind them
  const lit = Math.max(ignOf(s) > 0 ? 1 : 0, 0) * (1 - 0.7 * respOf(s));
  shrubs(g, gr, aL, aR, hh * 0.32, 380, '#3b3324', lit);
  shrubs(g, gr, bL, bR, hh * 0.32, 381, '#3b3324', lit);

  // the engine drives in at the start of the response and parks up the slope behind the main line
  // (drawn before the crew, so they stand in front of it), its hose running down to them
  {
    const L = hh * 2.3, park = Math.max(gr.x0 + 4, aL - hh * 7);
    const arrive = s.reduced ? 1 : smooth(seg(resp, 0, 0.1));
    const ex = park - (1 - arrive) * span * 0.25;
    const tilt = Math.atan2(gr.y(ex + L) - gr.y(ex), L);
    engine(g, ex, gr.y(ex) - hh * 0.12, L, tilt, Math.min(1, arrive * 3), s.time, s.still);
  }
  type Member = { role: Role; off: number; delay: number; depth: number };
  const line = (crewX: number, dir: 1 | -1, members: Member[], hoseFrom: number, edge: () => number, seed: number) => {
    // a short stretch of hose on the ground behind the line, fading out (it comes from the engine, out of sight)
    const hx = crewX - dir * hoseFrom;
    const hose = g.createLinearGradient(hx, 0, crewX, 0);
    hose.addColorStop(0, 'rgba(140,40,26,0)');
    hose.addColorStop(0.5, 'rgba(140,40,26,0.9)');
    hose.addColorStop(1, 'rgba(140,40,26,0.9)');
    g.strokeStyle = hose;
    g.lineWidth = Math.max(1.6, hh * 0.06);
    g.beginPath();
    g.moveTo(hx, gr.y(hx) + hh * 0.3);
    g.quadraticCurveTo((hx + crewX) / 2, gr.y(crewX) + hh * 0.45, crewX - dir * hh * 0.6, gr.y(crewX) + hh * 0.1);
    g.stroke();
    members.forEach((m, i) => {
      // reduced motion: the brigade is already in place, nobody walks in
      const walk = s.reduced ? 1 : Math.min(1, Math.max(0, (resp - m.delay) / 0.12));
      if (walk <= 0) return;
      // they walk in from their side, then hold their place a little apart, the beater nearest the fire
      const home = crewX + dir * m.off * hh * 0.9;
      const x = home - dir * (1 - smooth(walk)) * span * 0.2;
      const y = gr.y(x) + hh * (0.05 + m.depth);
      const k = 1 + m.depth * 0.5;
      g.save();
      if (dir < 0) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
      const t0 = person(g, x, y, hh * k, m.role, walk, s.still ? 0 : s.time, i * 1.7 + seed);
      g.restore();
      const tip: [number, number] = dir < 0 ? [2 * x - t0[0], t0[1]] : t0;
      if ((m.role === 'nozzle' || m.role === 'pump') && walk >= 1 && jet > 0) {
        // aimed at the burning edge, a little into the flames
        const tx = edge() + dir * hh * (0.6 + 0.5 * i), ty = gr.y(tx) - hh * 0.25;
        spray(g, tip[0], tip[1], tx, ty, hh * (m.role === 'pump' ? 0.6 : 1.3), jet * (m.role === 'pump' ? 0.6 : 1), s.time, s.still, 340 + i + seed);
        smoke(g, tx, ty, H * 0.12, 0.3, H * 0.014, jet * 0.8, s.time, 350 + i + seed, '236,238,240');
      }
    });
  };
  line(aL - hh * 1.5, 1, [
    { role: 'hose', off: -3.6, delay: 0.02, depth: 0.14 },
    { role: 'nozzle', off: 0, delay: 0, depth: -0.06 },
    { role: 'nozzle', off: 1.2, delay: 0.04, depth: 0.2 },
    { role: 'pump', off: -1.8, delay: 0.07, depth: -0.02 },
    { role: 'beater', off: 2.4, delay: 0.1, depth: 0.3 },
  ], hh * 6, () => edgeA, 0);
  line(bR + hh * 1.5, -1, [
    { role: 'nozzle', off: 0, delay: 0.06, depth: 0.08 },
    { role: 'hose', off: -2.2, delay: 0.09, depth: -0.04 },
  ], hh * 4, () => edgeB, 10);
}

/**
 * Córdoba: fronts on the face of the ridge, catching one after another along it and then on the
 * stretch of the same face further left (zones), with embers flying; the smoke settles in the valley
 * below, lit from beneath by the fire; the rain ends it.
 */
function cordoba(g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr: Ground, sx: number, zones: Ground[]) {
  const span = gr.x1 - gr.x0;
  const ps: Patch[] = [
    { gr, cx: sx - span * 0.08, left: span * 0.3, right: span * 0.26, size: H * 0.078, at: 0, seed: 400, lean: 0.12, smokeH: H * 0.55 },
    { gr, cx: gr.x0 + span * 0.86, left: span * 0.1, right: span * 0.12, size: H * 0.066, at: 0.3, seed: 420, lean: 0.12, smokeH: H * 0.45 },
    { gr, cx: gr.x0 + span * 0.08, left: span * 0.06, right: span * 0.1, size: H * 0.06, at: 0.55, seed: 430, lean: 0.12, smokeH: H * 0.4 },
  ];
  for (const [k, z] of zones.entries()) {
    const zs = z.x1 - z.x0;
    ps.push({ gr: z, cx: z.x0 + zs * 0.6, left: zs * 0.45, right: zs * 0.35, size: H * 0.072, at: 0.4 + 0.1 * k, seed: 440 + k * 10, lean: 0.12, smokeH: H * 0.52 });
  }
  spark(g, sx, gr.y(sx), s);
  // the smoke of the fronts pools in the valley right below them, no wider than the fire
  const lvl = smooth(seg(ignOf(s), 0.1, 0.8)) * (1 - 0.6 * smooth(seg(respOf(s), 0.3, 1)));
  if (lvl > 0) {
    const vy = gr.y(sx) + H * 0.05;
    g.globalAlpha = 0.65 * lvl;
    g.drawImage(puff('140,124,112'), gr.x0 - span * 0.4, vy - H * 0.05, span * 1.8, H * 0.1);
    // the fire's light on the underside of the smoke
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.28 * lvl * (1 - respOf(s));
    g.drawImage(puff('255,110,40'), gr.x0 - span * 0.1, vy - H * 0.08, span * 1.2, H * 0.09);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    // and as the fire grows, a blanket of smoke fills the whole valley, drifting slowly downwind
    blanket(g, W, vy - H * 0.02, H * 0.07, lvl, s.time, s.still, '132,116,104', 0);
  }
  // under the rain each patch goes out at its own moment, ragged along its length
  const n = noiseAt(450);
  patches(g, ps, s, (x, i) => 0.1 + 0.15 * i + 0.2 * n(x / 40), '104,94,88');
  // the scrub of the slope in front: the fronts burn up behind it
  const lit = (ignOf(s) > 0 ? 1 : 0) * (1 - 0.8 * respOf(s));
  for (const [i, p] of ps.entries()) shrubs(g, p.gr, p.cx - p.left, p.cx + p.right, H * 0.014, 460 + i, '#2c2a22', lit);
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
    { gr, cx: at(gr, 0.3), left: W * 0.03, right: W * 0.04, size: H * 0.02, at: 0.28, seed: 525, lean: -0.5, smokeH: H * 0.18 },
  ];
  if (farG && farG.x1 > farG.x0) {
    ps.push({ gr: farG, cx: at(farG, 0.3), left: W * 0.04, right: W * 0.05, size: H * 0.011, at: 0.3, seed: 530, lean: -0.6, smokeH: H * 0.3 });
    ps.push({ gr: farG, cx: at(farG, 0.75), left: W * 0.05, right: W * 0.04, size: H * 0.011, at: 0.5, seed: 540, lean: -0.6, smokeH: H * 0.34 });
  }
  if (nearG && nearG.x1 > nearG.x0) {
    ps.push({ gr: nearG, cx: at(nearG, 0.55), left: W * 0.06, right: W * 0.08, size: H * 0.05, at: 0.58, seed: 550, lean: -0.4, smokeH: H * 0.3 });
    ps.push({ gr: nearG, cx: at(nearG, 0.18), left: W * 0.04, right: W * 0.05, size: H * 0.04, at: 0.7, seed: 555, lean: -0.4, smokeH: H * 0.26 });
  }
  // every island burns on the river: its light lies on the water below
  for (const pt of ps) pt.reflect = true;
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
    // the columns of every island meet above the river in a low ceiling of smoke, drifting west
    blanket(g, W, gr.y(sx) - H * 0.2, H * 0.09, lvl * 0.9, s.time, s.still, '118,108,100', -1);
  }
  // the rain puts the patches out one after the other, nearest last (its flames are the tallest)
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  const n = noiseAt(560);
  patches(g, ps, s, (x, i) => 0.1 + 0.1 * order[i] + 0.12 * n(x / 30), '120,112,104');
  // the willows and pajonal of each island's bank, in front of its fire
  const lit = (ignOf(s) > 0 ? 1 : 0) * (1 - 0.8 * respOf(s));
  for (const [i, p] of ps.entries()) shrubs(g, p.gr, p.cx - p.left, p.cx + p.right, p.size * 0.42, 570 + i, '#2a3119', lit);
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
  // it comes down toward the fire line as it enters, flies level over the flames while it drops,
  // then climbs away (drawn mirrored: it enters from the right, where the fire burns brightest)
  const y = 0.24 + 0.12 * smooth(seg(p, 0, 0.22)) - 0.16 * smooth(seg(p, 0.5, 1));
  const pitch = 0.12 * seg(p, 0, 0.22) * (1 - seg(p, 0.14, 0.22)) - 0.16 * seg(p, 0.48, 0.63) * (1 - seg(p, 0.8, 1));
  return { x, y, pitch };
}
/** The part of the pass that releases the water: over the brightest flames (screen x 0.88 to 0.61). */
const DROP: [number, number] = [0.22, 0.42];

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
  // fuselage, its outline lit by the fire below so it always stands out against the smoke
  const body = new Path2D();
  body.moveTo(L * 0.5, 0);
  body.quadraticCurveTo(L * 0.46, -L * 0.07, L * 0.3, -L * 0.075);
  body.lineTo(-L * 0.38, -L * 0.04);
  body.lineTo(-L * 0.5, -L * 0.03);
  body.lineTo(-L * 0.5, L * 0.005);
  body.lineTo(-L * 0.3, L * 0.03);
  body.quadraticCurveTo(L * 0.3, L * 0.06, L * 0.5, 0);
  g.save();
  g.shadowColor = 'rgba(255,150,70,0.85)';
  g.shadowBlur = L * 0.08;
  g.fill(body);
  g.restore();
  g.strokeStyle = 'rgba(255,170,100,0.55)';
  g.lineWidth = 1.2;
  g.stroke(body);
  // cockpit hump, tail fin, tailplane, low wing seen almost edge-on
  g.beginPath(); g.moveTo(L * 0.18, -L * 0.07); g.quadraticCurveTo(L * 0.1, -L * 0.13, -L * 0.02, -L * 0.065); g.fill();
  g.beginPath(); g.moveTo(-L * 0.36, -L * 0.04); g.lineTo(-L * 0.47, -L * 0.17); g.lineTo(-L * 0.5, -L * 0.17); g.lineTo(-L * 0.5, -L * 0.02); g.fill();
  g.fillRect(-L * 0.5, -L * 0.035, L * 0.16, L * 0.015);
  g.beginPath(); g.moveTo(L * 0.22, L * 0.02); g.lineTo(-L * 0.12, L * 0.035); g.lineTo(-L * 0.14, L * 0.055); g.lineTo(L * 0.24, L * 0.04); g.fill();
  // propeller disc
  g.strokeStyle = 'rgba(40,34,30,0.55)';
  g.lineWidth = 1;
  g.beginPath(); g.ellipse(L * 0.51, 0, L * 0.012, L * 0.13 * (still ? 1 : 0.9 + 0.1 * Math.sin(time * 40)), 0, 0, Math.PI * 2); g.stroke();
  // fire light on the belly, inside the fuselage only
  const gr = g.createLinearGradient(0, -L * 0.03, 0, L * 0.05);
  gr.addColorStop(0, 'rgba(255,120,40,0)');
  gr.addColorStop(1, 'rgba(255,130,50,0.55)');
  g.fillStyle = gr;
  g.fill(body);
  // the beacon on the tail, blinking
  if (still || Math.sin(time * 9) > 0.4) {
    const b = g.createRadialGradient(-L * 0.48, -L * 0.17, 0, -L * 0.48, -L * 0.17, L * 0.04);
    b.addColorStop(0, 'rgba(255,90,70,0.95)');
    b.addColorStop(1, 'rgba(255,90,70,0)');
    g.fillStyle = b;
    g.fillRect(-L * 0.52, -L * 0.21, L * 0.08, L * 0.08);
  }
  g.restore();
}

function chubut(g: CanvasRenderingContext2D, W: number, H: number, s: Stage) {
  // the plane comes in from the right, over the fire's glow (the left of the opening is dark sky,
  // where a dark plane would not be seen): the whole pass is drawn mirrored
  g.save();
  g.translate(W, 0);
  g.scale(-1, 1);
  chubutPass(g, W, H, s);
  g.restore();
}

function chubutPass(g: CanvasRenderingContext2D, W: number, H: number, s: Stage) {
  const L = Math.max(140, W * 0.17);
  const line = H * 0.56; // the burning forest line of the cinematic opening
  const p = s.phase === 'respond' ? s.p : 1;
  // the falling water: one sheet. Every slice of the load released along the drop keeps a little of
  // the plane's speed, falls and widens; drawn as soft vertical streaks side by side, the slices make
  // a curtain hanging from the plane's path down to the burning line, thinning as it lands
  // under reduced motion the pass still happens, moved by the reader's scroll (no clock of its own)
  const N = 72;
  const r = rng(700);
  // the slices are blurred together into one soft sheet of falling water and spray
  g.save();
  g.filter = `blur(${Math.max(2, Math.round(W / 360))}px)`;
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
  g.restore();
  g.globalAlpha = 1;
  // steam where it lands, growing after the drop and lingering
  const hit = smooth(seg(p, DROP[0] + 0.12, DROP[1] + 0.2));
  for (let i = 0; i < 5; i++) {
    const at = flight(DROP[0] + ((DROP[1] - DROP[0]) * (i + 0.5)) / 5);
    smoke(g, (at.x + 0.06) * W, line, H * 0.3, 0.4, H * 0.03, hit * (s.phase === 'done' ? 0.6 : 1), s.time, 720 + i, '226,228,230');
  }
  if (s.phase === 'respond' && p < 1) {
    const at = flight(p);
    // its shadow, soft, on the smoke over the burning line below it: it ties the plane to the scene
    const sh = g.createRadialGradient(at.x * W + L * 0.1, line - H * 0.04, 0, at.x * W + L * 0.1, line - H * 0.04, L * 0.6);
    sh.addColorStop(0, 'rgba(10,6,4,0.28)');
    sh.addColorStop(1, 'rgba(10,6,4,0)');
    g.fillStyle = sh;
    g.save(); g.translate(at.x * W + L * 0.1, line - H * 0.04); g.scale(1, 0.25); g.translate(-(at.x * W + L * 0.1), -(line - H * 0.04));
    g.fillRect(at.x * W + L * 0.1 - L * 0.6, line - H * 0.04 - L * 0.6, L * 1.2, L * 1.2);
    g.restore();
    plane(g, at.x * W, at.y * H, L, at.pitch, s.time, s.still, smooth(seg(p, 0.55, 0.78)));
  }
}

/** How much of its heat the cinematic fire of Chubut keeps (the drop knocks it down, then it partly recovers). */
export function chubutHeat(phase: Stage['phase'] | 'idle', p: number): number {
  if (phase === 'respond') return 1 - 0.62 * smooth(seg(p, DROP[0] + 0.05, DROP[1] + 0.12)) + 0.12 * smooth(seg(p, 0.85, 1));
  if (phase === 'done') return 0.5;
  return 1;
}

/** Where on its ground a region's fire starts (px of the landscape frame). */
export function spotOn(id: string, gr: Ground): [number, number] {
  const f = id === 'mendoza' ? 0.4 : id === 'delta' ? 0.25 : 0.5;
  const x = gr.x0 + (gr.x1 - gr.x0) * f;
  return [x, gr.y(x)];
}

/** Draws a region's stage on its ground, in the frame of the ground's layer. */
export function drawInteraction(id: string, g: CanvasRenderingContext2D, W: number, H: number, s: Stage, gr?: Ground, zones: Ground[] = []) {
  if (id === 'chubut') { chubut(g, W, H, s); return; }
  if (!gr) return;
  const [sx] = spotOn(id, gr);
  if (id === 'mendoza') mendoza(g, W, H, s, gr, sx);
  else if (id === 'cordoba') cordoba(g, W, H, s, gr, sx, zones);
  else if (id === 'delta') delta(g, W, H, s, gr, sx, zones);
}

/** Over the whole frame, after every layer (the weather of a response). */
export function drawWeather(id: string, g: CanvasRenderingContext2D, W: number, H: number, s: Stage, horizon = H * 0.5) {
  if (id === 'cordoba') rain(g, W, H, s, horizon, false);
  else if (id === 'delta') rain(g, W, H, s, horizon, true);
}
