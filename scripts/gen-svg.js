const fs = require('fs');
const path = require('path');

const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/provincias.json'), 'utf8'));
const K = Math.cos((38 * Math.PI) / 180);
const minLon = -73.6, maxLon = -53.6, minLat = -55.1, maxLat = -21.7;
const viewW = (maxLon - minLon) * K;
const viewH = maxLat - minLat;
const w = 400, h = 800;
const scale = Math.min(w / viewW, h / viewH) * 0.92;
const ox = (w - viewW * scale) / 2;
const oy = (h - viewH * scale) / 2;

function project(lon, lat) {
  return [
    (ox + (lon - minLon) * K * scale).toFixed(1),
    (oy + (maxLat - lat) * scale).toFixed(1)
  ];
}

const provPaths = {};
d.features.forEach(f => {
  const name = f.properties.name;
  let dStr = '';
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  polys.forEach(poly => {
    poly.forEach(ring => {
      ring.forEach((pt, i) => {
        const [x, y] = project(pt[0], pt[1]);
        dStr += (i === 0 ? 'M' : 'L') + x + ' ' + y;
      });
      dStr += 'Z';
    });
  });
  provPaths[name] = dStr;
});

const fileContent = `// Auto-generated static SVG path dataset for instant frame-0 rendering
export const ARGENTINA_VIEWBOX = '0 0 400 800';
export const ARGENTINA_STATIC_PATHS: Record<string, string> = ${JSON.stringify(provPaths, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../lib/argentinaStaticSvg.ts'), fileContent, 'utf8');
console.log('Successfully wrote lib/argentinaStaticSvg.ts with', Object.keys(provPaths).length, 'provinces.');
