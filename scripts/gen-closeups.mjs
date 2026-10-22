// Detailed relief for the scene close-ups (El Challao, Epuyén), in the same atlas palette as the
// continental relief (scripts/gen-map-assets.mjs).
//
//   node scripts/gen-closeups.mjs
//
// Source: Terrain Tiles on AWS Open Data (s3://elevation-tiles-prod, "terrarium" PNG tiles, web
// mercator). For Argentina they come from SRTM and GMTED2010 (courtesy of the U.S. Geological
// Survey) and ETOPO1 (NOAA); attribution: Mapzen and those sources. Tiles are cached in
// data-raw/dem/ (not committed). Each close-up is resampled to the map's own plate carrée
// (x = lon, y = lat, linear), shaded from the north-west like Natural Earth's relief, coloured with
// the atlas ramp and written as WebP with feathered edges, so it melts into the continental relief.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'data-raw', 'dem');
const OUT = path.join(ROOT, 'public', 'map');

// box: minLon, maxLon, minLat, maxLat (a little larger than the scene's close-up); ppd: output px
// per degree; z: tile zoom (enough source detail for ppd)
const AREAS = [
  { id: 'challao', box: [-70.6, -67.4, -34.2, -31.9], ppd: 800, z: 11 },
  { id: 'epuyen', box: [-73.6, -69.5, -43.8, -41.0], ppd: 420, z: 10 },
];

// the atlas ramp of gen-map-assets.mjs (hillshade 0..1 -> r, g, b), as straight segments
const RAMP = {
  r: [[0, 0.03], [0.45, 0.07], [0.7, 0.17], [0.8, 0.27], [0.9, 0.42], [1, 0.68]],
  g: [[0, 0.028], [0.45, 0.062], [0.7, 0.15], [0.8, 0.235], [0.9, 0.37], [1, 0.62]],
  b: [[0, 0.025], [0.45, 0.055], [0.7, 0.125], [0.8, 0.19], [0.9, 0.31], [1, 0.55]],
};
const curve = (pts, x) => {
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * ((x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts[pts.length - 1][1];
};

const tileX = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const tileY = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };

async function tile(z, x, y) {
  const f = path.join(CACHE, String(z), String(x), y + '.png');
  if (!fs.existsSync(f)) {
    const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`);
    if (!r.ok) throw new Error(`tile ${z}/${x}/${y}: HTTP ${r.status}`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  const { data } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const h = new Float32Array(256 * 256);
  for (let i = 0; i < h.length; i++) h[i] = data[i * 3] * 256 + data[i * 3 + 1] + data[i * 3 + 2] / 256 - 32768;
  return h;
}

for (const A of AREAS) {
  const [lon0, lon1, lat0, lat1] = A.box, z = A.z;
  const x0 = Math.floor(tileX(lon0, z)), x1 = Math.floor(tileX(lon1, z));
  const y0 = Math.floor(tileY(lat1, z)), y1 = Math.floor(tileY(lat0, z));
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  console.log(`${A.id}: ${cols * rows} tiles at z${z}`);
  // mosaic of heights in mercator pixels
  const MW = cols * 256, MH = rows * 256, M = new Float32Array(MW * MH);
  const jobs = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) jobs.push([tx, ty]);
  for (let i = 0; i < jobs.length; i += 8) {
    await Promise.all(jobs.slice(i, i + 8).map(async ([tx, ty]) => {
      const h = await tile(z, tx, ty);
      for (let r = 0; r < 256; r++) M.set(h.subarray(r * 256, r * 256 + 256), ((ty - y0) * 256 + r) * MW + (tx - x0) * 256);
    }));
  }
  // resample to plate carrée
  const W = Math.round((lon1 - lon0) * A.ppd), H = Math.round((lat1 - lat0) * A.ppd);
  const E = new Float32Array(W * H);
  for (let j = 0; j < H; j++) {
    const lat = lat1 - ((j + 0.5) / H) * (lat1 - lat0);
    const my = (tileY(lat, z) - y0) * 256;
    for (let i = 0; i < W; i++) {
      const lon = lon0 + ((i + 0.5) / W) * (lon1 - lon0);
      const mx = (tileX(lon, z) - x0) * 256;
      const xi = Math.min(MW - 2, Math.max(0, Math.floor(mx - 0.5))), yi = Math.min(MH - 2, Math.max(0, Math.floor(my - 0.5)));
      const fx = mx - 0.5 - xi, fy = my - 0.5 - yi;
      const a = M[yi * MW + xi], b = M[yi * MW + xi + 1], c = M[(yi + 1) * MW + xi], d = M[(yi + 1) * MW + xi + 1];
      E[j * W + i] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
  }
  // hillshade: sun from the north-west (azimuth 315), 45 degrees high, like the continental relief
  const mPerPxY = 111320 / A.ppd, mPerPxX = mPerPxY * Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  const zf = 1.6; // a little exaggeration so the foothills read at this scale
  const azMath = ((360 - 315 + 90) * Math.PI) / 180, alt = (45 * Math.PI) / 180; // ESRI convention
  const rgba = Buffer.alloc(W * H * 4);
  const feather = Math.round(Math.min(W, H) * 0.08);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const e = (ii, jj) => E[Math.min(H - 1, Math.max(0, jj)) * W + Math.min(W - 1, Math.max(0, ii))];
    const dzdx = ((e(i + 1, j - 1) + 2 * e(i + 1, j) + e(i + 1, j + 1)) - (e(i - 1, j - 1) + 2 * e(i - 1, j) + e(i - 1, j + 1))) / (8 * mPerPxX) * zf;
    const dzdy = ((e(i - 1, j + 1) + 2 * e(i, j + 1) + e(i + 1, j + 1)) - (e(i - 1, j - 1) + 2 * e(i, j - 1) + e(i + 1, j - 1))) / (8 * mPerPxY) * zf;
    const slope = Math.atan(Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
    let hs = Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(azMath - aspect);
    hs = Math.max(0, hs);
    // flat ground lands where Natural Earth puts it (~0.75), slopes spread around it
    const v = Math.min(1, Math.max(0, 0.75 + (hs - Math.sin(alt)) * 1.05));
    const k = (j * W + i) * 4;
    rgba[k] = Math.round(255 * curve(RAMP.r, v));
    rgba[k + 1] = Math.round(255 * curve(RAMP.g, v));
    rgba[k + 2] = Math.round(255 * curve(RAMP.b, v));
    const edge = Math.min(i, j, W - 1 - i, H - 1 - j) / feather;
    rgba[k + 3] = Math.round(255 * Math.min(1, edge) ** 1.5);
  }
  const file = path.join(OUT, `closeup-${A.id}.webp`);
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 80, alphaQuality: 60 }).toFile(file);
  console.log(`  -> ${path.relative(ROOT, file)} ${W}x${H} ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}
