// Builds the base-map assets of the tour from Natural Earth (public domain, naturalearthdata.com).
//
//   node scripts/gen-map-assets.mjs <dir>
//
// <dir> must hold the downloads:
//   SR_50M.tif                             Natural Earth shaded relief (hillshade), 1:50m
//   ne_50m_admin_0_countries.geojson       Admin 0 countries, 1:50m
// Writes:
//   public/map/sudamerica-atlas.webp       relief cropped to lon -94..-24, lat 14..-63 (30 px per degree), sepia ramp, via ffmpeg
//   public/data/sudamerica.json            South American countries except Argentina (its provinces come from
//                                          provincias.json) and the Falkland/Malvinas Islands (shown by the relief only)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/gen-map-assets.mjs <dir with Natural Earth downloads>'); process.exit(2); }

// raster: 10800 x 5400 px for 360 x 180 degrees -> 30 px per degree
const [LON0, LON1, LAT1, LAT0] = [-94, -24, 14, -63];
const crop = `crop=${(LON1 - LON0) * 30}:${(LAT1 - LAT0) * 30}:${(LON0 + 180) * 30}:${(90 - LAT1) * 30}`;
// "atlas" territory: Natural Earth shaded relief (pure hillshade, public domain) mapped onto a
// charcoal -> mineral brown -> ash ramp: flat land stays dark, sunlit slopes catch the light
const RAMP = "curves=r='0/0.03 0.45/0.07 0.7/0.17 0.8/0.27 0.9/0.42 1/0.68':g='0/0.028 0.45/0.062 0.7/0.15 0.8/0.235 0.9/0.37 1/0.62':b='0/0.025 0.45/0.055 0.7/0.125 0.8/0.19 0.9/0.31 1/0.55'";
const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(dir, 'SR_50M.tif'),
  '-vf', `${crop},format=rgb24,${RAMP}`, '-c:v', 'libwebp', '-quality', '80', 'public/map/sudamerica-atlas.webp'], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);

const gj = JSON.parse(fs.readFileSync(path.join(dir, 'ne_50m_admin_0_countries.geojson'), 'utf8'));
const round = (ring) => ring.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
  .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
const features = gj.features
  .filter((f) => f.properties.CONTINENT === 'South America' && !['ARG', 'FLK'].includes(f.properties.ADM0_A3))
  .map((f) => {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    return { type: 'Feature', properties: { name: f.properties.NAME_ES || f.properties.NAME },
      geometry: { type: 'MultiPolygon', coordinates: polys.map((p) => p.map(round)) } };
  });
fs.writeFileSync('public/data/sudamerica.json', JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`relief: public/map/sudamerica-atlas.webp · countries: ${features.length} (${features.map((f) => f.properties.name).join(', ')})`);
