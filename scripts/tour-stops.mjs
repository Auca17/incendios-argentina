// Prints `name:px` scroll positions that put the focal line (45 % of the viewport) at t = 0, 50 and
// 100 % of every tour section, for `node scripts/shots.mjs --ys $(node scripts/tour-stops.mjs 900)`.
const vh = +(process.argv[2] || 900);
// heights as in lib/tour.ts (story = landscape intro + map scene + smoke outro)
const S = [['opening', 130], ['title', 95], ['reveal', 160], ['misiones', 345], ['corrientes', 345], ['cordoba', 365],
  ['delta', 365], ['mendoza', 385], ['chubut', 375], ['more', 420], ['epilogue', 250]];
let top = 0;
const out = [];
for (const [n, h] of S) {
  const px = (h * vh) / 100;
  for (const t of [0, 0.5, 0.99]) out.push(`${n}-${String(Math.round(t * 100)).padStart(3, '0')}:${Math.max(0, Math.round(top + t * px - 0.45 * vh))}`);
  top += px;
}
console.log(out.join(','));
