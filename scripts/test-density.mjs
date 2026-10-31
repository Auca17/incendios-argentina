// The cells' scale (lib/density.ts) on the real data and the real relief of each story drawn as cells.
//
//   npm run test:density
//
// 1. classes: the five absolute classes are contiguous; the dots grow and lighten with the class, never
//    cover their cell (land shows between them) and use no fire colour (low saturation);
// 2. data: the sums the map encodes add up to each story's total (public/data/semanas-<id>.json);
// 3. contrast: for every cell of the story inside its close-up (the tour's camera at 1440 x 900,
//    components/TourMap.tsx and lib/tourLayout.ts), the smallest mark the cell ever shows (the dot of
//    the class it first appears with: classes never go down) is set off the relief around it
//    (public/map/closeup-<place>.webp) by at least 3:1. The dot is measured as the map draws it, its
//    light added onto the land under it (screen), against the land in a ring just outside it, both
//    under its dark shade (class 2 up) as cellMarks draws it. CONTRAST_EXCEPTIONS lists,
//    one by one, the cells accepted under 3:1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CELL_CLASSES, CELL_STORIES, DOT_ALPHA, DOT_COVER, DOT_D, DOT_FILL, DOT_SHADE, DOT_SHADE_FROM, ZONE_ALPHA, ZONE_D, ZONE_DEG, cellClass, dotMin, zoneClass, zoneMin } from '../lib/density.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };
const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); }; // as in components/TourMap.tsx

// ---- 1. classes ----
for (const [n, c] of [[1, 0], [2, 1], [5, 1], [6, 2], [20, 2], [21, 3], [80, 3], [81, 4], [393, 4]]) ok(cellClass(n) === c, `class of ${n} is ${cellClass(n)}, expected ${c}`);
CELL_CLASSES.forEach(([a], i) => { if (i) ok(a === CELL_CLASSES[i - 1][1] + 1, `class ${i} does not start where class ${i - 1} ends`); });
const rgb = (h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16) / 255);
const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
for (let i = 1; i < 5; i++) {
  ok(DOT_D[i] > DOT_D[i - 1], `dot size does not grow at class ${i}`);
  ok(dotMin(i) > dotMin(i - 1), `minimum dot size does not grow at class ${i}`);
  ok(lum(rgb(DOT_FILL[i])) > lum(rgb(DOT_FILL[i - 1])), `dot light does not grow at class ${i}`);
}
ok(Math.max(...DOT_D) <= 0.6, 'the largest dot covers more than 60 % of its cell: land would not show between');
// far away (cells of 1.5 px, every dot at its size floor or at 90 % of the cell) the light each class
// lays on its cell still grows with the class: the budget never turns the order around
{
  const cs = 1.5, ink = DOT_D.map((d, c) => { const dd = Math.min(Math.max(cs * d, dotMin(c)), cs * 0.9), cov = (Math.PI * dd * dd) / 4 / (cs * cs); return DOT_ALPHA[c] * Math.min(1, DOT_COVER[c] / cov) * cov; });
  for (let i = 1; i < 5; i++) ok(ink[i] > ink[i - 1], `far away class ${i + 1} lays less light (${ink[i].toFixed(3)}) than class ${i} (${ink[i - 1].toFixed(3)})`);
}
// the zones (far views): from zones of 3 px to 40 px, the light each class lays still grows with the
// class, and no zone dot is fainter than a third (the lightest classes step back, never vanish)
for (const zsz of [3, 6, 12, 40]) {
  const ink = ZONE_D.map((d, c) => ZONE_ALPHA[c] * Math.min(Math.max(zsz * d, zoneMin(c)), zsz * 0.9) ** 2);
  for (let i = 1; i < 5; i++) ok(ink[i] > ink[i - 1], `zones of ${zsz} px: class ${i + 1} lays less light than class ${i}`);
}
ok(Math.min(...ZONE_ALPHA) >= 1 / 3, 'a zone class is drawn fainter than a third');
for (const f of DOT_FILL) { const [r, g, b] = rgb(f), mx = Math.max(r, g, b), mn = Math.min(r, g, b); ok((mx - mn) / Math.max(0.01, mx) < 0.15, `${f} is too saturated for a neutral, non-thermal tone`); }

// ---- 2 and 3, per story ----
const K = Math.cos((38 * Math.PI) / 180);
// lib/storyScenes.ts and lib/scenes.ts: the close-up box (camera, desktop) and the close-up relief of each story
// (Mendoza: CHALLAO_WIDE in lib/groundScene.ts; Chubut: HOTSPOT in lib/airScene.ts)
const STORY = {
  misiones: { box: [-54.75, -53.45, -27.55, -26.5], relief: [-55.0, -53.2, -27.8, -26.2], src: 'closeup-yaboti.webp' },
  corrientes: { box: [-58.4, -55.9, -29.3, -27.1], relief: [-58.9, -55.5, -29.7, -26.8], src: 'closeup-ibera.webp' },
  cordoba: { box: [-65.5, -63.8, -31.75, -30.05], relief: [-65.9, -63.5, -33.8, -29.9], src: 'closeup-sierras.webp' },
  delta: { box: [-61.1, -59.4, -33.8, -32.35], relief: [-61.5, -58.8, -34.4, -31.9], src: 'closeup-delta.webp' },
  mendoza: { box: [-69.42, -68.52, -33.14, -32.6], relief: [-70.6, -67.4, -34.2, -31.9], src: 'closeup-challao.webp' },
  chubut: { box: [-73.3, -69.8, -43.5, -41.3], relief: [-73.6, -69.5, -43.8, -41.0], src: 'closeup-epuyen.webp' },
};
/*
 * Cells accepted under 3:1, with the lowest ratio they may reach. Chubut: two cells of Epuyén that
 * first show a single detection, a class-1 dot of 1.5 px on the pale Andean slopes, for their first one
 * or two weeks (then they grow). Accepted on 2026-10-27 rather than changing the marks of all six stories.
 */
const CONTRAST_EXCEPTIONS = { chubut: { '-71.925,-42.725': 2.1, '-71.675,-42.825': 2.9 } };
const screen = (top, a, under) => under.map((u, i) => u + (1 - (1 - u) * (1 - top[i]) - u) * a);
const lines = [];
for (const id of CELL_STORIES) {
  const S = STORY[id];
  ok(!!S, `${id}: no close-up registered in the test`);
  if (!S) continue;
  const E = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data', `semanas-${id}.json`), 'utf8'));
  const sum = new Map();
  for (const [lon, lat, , n] of E.cells) { const k = lon + ',' + lat; sum.set(k, (sum.get(k) || 0) + n); }
  const total = [...sum.values()].reduce((a, b) => a + b, 0);
  ok(total === E.total, `${id}: the cells add up to ${total}, the series says ${E.total}`);

  // the zones, week by week: they add up exactly to their cells (nothing lost or counted twice); a zone's
  // class never goes down, and changes only in a week when one of its own cells got detections
  {
    const zoneOf = (lon, lat) => Math.floor(lon / ZONE_DEG) + ',' + Math.floor(lat / ZONE_DEG);
    const byWeek = Array.from({ length: E.weeks + 1 }, () => []);
    for (const c of E.cells) byWeek[c[2]].push(c);
    const zsum = new Map(), zcls = new Map();
    let cellsSoFar = 0, bad = 0, falseChange = 0, down = 0;
    for (let k = 0; k <= E.weeks; k++) {
      const touched = new Set();
      for (const [lon, lat, , n] of byWeek[k]) { const z = zoneOf(lon, lat); zsum.set(z, (zsum.get(z) || 0) + n); cellsSoFar += n; touched.add(z); }
      const zt = [...zsum.values()].reduce((a, b) => a + b, 0);
      if (zt !== cellsSoFar) bad++;
      for (const [z, s] of zsum) {
        const c = zoneClass(s), prev = zcls.get(z);
        if (prev !== undefined && c !== prev && !touched.has(z)) falseChange++;
        if (prev !== undefined && c < prev) down++;
        zcls.set(z, c);
      }
    }
    ok(bad === 0, `${id}: in ${bad} weeks the zones do not add up to their cells`);
    ok(falseChange === 0, `${id}: ${falseChange} zone class changes in weeks without detections in that zone`);
    ok(down === 0, `${id}: ${down} zone classes went down`);
    lines.push(`${id}: ${zsum.size} zones of 0.25 degrees over ${E.weeks + 1} weeks, sums equal to the cells' every week, no false or downward class changes`);
  }

  // the camera at 1440 x 900 with the scene at full zoom: the band from podRight + 24 to the HUD
  const rx = 32 + Math.min(460, Math.max(340, 1440 * 0.3)) + 24, rw = 1440 - 72 - rx, H = 900;
  const spanX = (S.box[1] - S.box[0]) * K, spanY = S.box[3] - S.box[2];
  const scale = Math.min(rw / spanX, H / spanY) * 0.92;
  const { data, info } = await sharp(path.join(ROOT, 'public/map', S.src)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (lon, lat) => {
    const x = Math.round(((lon - S.relief[0]) / (S.relief[1] - S.relief[0])) * (info.width - 1));
    const y = Math.round(((S.relief[3] - lat) / (S.relief[3] - S.relief[2])) * (info.height - 1));
    const i = (Math.min(info.height - 1, Math.max(0, y)) * info.width + Math.min(info.width - 1, Math.max(0, x))) * 3;
    return [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
  };
  const cs = Math.min(E.step * K * scale, E.step * scale);
  // close up no dot reaches its coverage budget: the budget only ever dims the far views
  DOT_D.forEach((d, c) => { const cov = (Math.PI * (cs * d) ** 2) / 4 / (cs * cs); ok(cov <= DOT_COVER[c], `${id}: close up a class-${c + 1} dot covers ${(100 * cov).toFixed(0)} % of its cell, over its ${100 * DOT_COVER[c]} % budget`); });
  // the class each cell first appears with (the detections of its first week)
  const first = new Map();
  for (const [lon, lat, wk, n] of E.cells) { const k = lon + ',' + lat, f = first.get(k); if (!f || wk < f[0]) first.set(k, [wk, n]); }
  const exc = CONTRAST_EXCEPTIONS[id] || {};
  const edges = [], excepted = [];
  for (const k of sum.keys()) {
    const [lon, lat] = k.split(',').map(Number);
    if (lon < S.box[0] || lon > S.box[1] || lat < S.box[2] || lat > S.box[3]) continue;
    const c = cellClass(first.get(k)[1]), r = Math.max(cs * DOT_D[c], dotMin(c)) / 2;
    // its dark shade as TourMap's cellMarks draws it (class 2 up): black discs reaching r + dr, fading
    // out as the cells get small; the land at a distance d from the centre is darkened by those reaching it
    const shadeK = c >= DOT_SHADE_FROM ? smooth((cs - 3) / 7) : 0;
    const shaded = (land, d) => DOT_SHADE.reduce((v, [dr, a]) => (d < r + dr ? v.map((x) => x * (1 - a * shadeK)) : v), land);
    // the land under the dot and in a ring 1.5 px outside it (screen px)
    const under = shaded(px(lon, lat), 0), ring = [];
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * 2 * Math.PI, d = r + 1.5;
      ring.push(lum(shaded(px(lon + (Math.cos(t) * d) / (K * scale), lat - (Math.sin(t) * d) / scale), d)));
    }
    ring.sort((p, q) => p - q);
    const q = ratio(lum(screen(rgb(DOT_FILL[c]), DOT_ALPHA[c], under)), ring[ring.length >> 1]);
    if (k in exc) { excepted.push(k); ok(q >= exc[k], `${id}: excepted cell ${k} now meets the land at ${q.toFixed(2)}:1, under its accepted ${exc[k]}:1`); continue; }
    edges.push(q);
  }
  for (const k in exc) ok(excepted.includes(k), `${id}: excepted cell ${k} is not in the close-up any more: drop it from CONTRAST_EXCEPTIONS`);
  edges.sort((p, q) => p - q);
  const min = edges[0], p5 = edges[Math.floor(edges.length * 0.05)];
  lines.push(`${id}: ${edges.length} cells in the close-up${excepted.length ? ` (+${excepted.length} excepted)` : ''}, first mark of each cell against the land around it: min ${min.toFixed(2)}, 5th pct ${p5.toFixed(2)}, median ${edges[edges.length >> 1].toFixed(2)}`);
  ok(min >= 3, `${id}: a cell's first mark meets the land at ${min.toFixed(2)}:1 (< 3:1)`);
}

lines.forEach((l) => console.log('  ' + l));
if (fail.length) { console.log('DENSITY FAIL'); fail.forEach((f) => console.log('  - ' + f)); process.exit(1); }
console.log(`DENSITY OK (${CELL_STORIES.size} stories, 5 classes, each cell's first mark >= 3:1 against the land, listed exceptions apart)`);
