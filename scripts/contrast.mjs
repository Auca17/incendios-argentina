// WCAG 2.x contrast check for the colour pairs the site actually uses.
//
//   node scripts/contrast.mjs
//
// Tokens are read from app/globals.css (:root), so changing a token changes the result. Literal colours that
// the CSS modules use for text or control borders are listed below next to the surface they sit on.
// Thresholds: 4.5:1 normal text, 3:1 large text (>= 24 px, or >= 18.66 px bold) and UI component borders.
// Exits 1 when any pair fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
const tok = {};
for (const m of css.matchAll(/--([\w-]+):\s*([^;]+?);/g)) tok[m[1]] = m[2].trim();

/** '#rgb', '#rrggbb', 'rgb(a)(...)' or 'var(--x)' -> [r,g,b,a]. */
function parse(v) {
  v = v.trim();
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) return parse(tok[ref[1]]);
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const n = m[1].split(',').map(Number); return [n[0], n[1], n[2], n[3] ?? 1]; }
  throw new Error('cannot parse colour: ' + v);
}
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const BG = parse('var(--bg)');
const surf = (v) => over(parse(v), BG); // translucent surfaces are composited over the page background
const S = {
  page: surf('var(--bg)'),
  card: surf('var(--card)'),
  panel: surf('#111'),
  field: surf('#1a1a1a'),
  seg: surf('#161616'),
  item: surf('#0d0d0d'),
  tip: surf('rgba(18, 12, 9, 0.95)'),
  scene: surf('#0b0706'),
  accent: surf('var(--accent)'),
  accentSoft: surf('var(--accent-soft)'),
  // guided tour, worst cases: translucent pods and chips composited over the brightest thing that can
  // sit behind them (the lit cloud dome, or the hottest fire dot on the map)
  tPod: over(parse('var(--t-pod)'), parse('#fdfbf7')),
  tChip: over(parse('var(--t-chip)'), parse('#ffd27a')),
  tChipCloud: over(parse('var(--t-chip)'), parse('#fdfbf7')),
  tPaper: parse('var(--t-paper)'),
  // reading text sits on the flat interior of the cloud bank (CloudCurtain: rgb .972 .975 .978)
  tCloud: [248, 249, 249, 1],
  // cover title: the shader keeps a sunlit patch behind it (rgb .985 .985 .98)
  tCloudShade: [251, 251, 250, 1],
  tAmber: parse('var(--t-amber)'),
  // regions: reading text on the left scrim (at least .84 of #05080d) over the brightest sunlit slope
  tScrim: over(parse('rgba(5, 8, 13, 0.84)'), parse('#ad9e8c')),
  // "Más información" sheet and the /explorar panel (.92 over the same slope)
  tSheet: parse('#0b1018'),
  tPanel: over(parse('rgba(5, 8, 13, 0.92)'), parse('#ad9e8c')),
  // source cards over the smoke, composited over the brightest ember of the shader
  tSmokeCard: over(parse('var(--t-smoke-card)'), [255, 92, 31, 1]),
};

// [label, foreground, surface, size px, bold, kind]  kind: 'text' | 'ui'
const T = (label, fg, on, px = 14, bold = false) => ({ label, fg, on, px, bold, kind: 'text' });
const U = (label, fg, on) => ({ label, fg, on, kind: 'ui' });
const PAIRS = [
  T('text on page', 'var(--text)', 'page', 16),
  T('text on card (opaque cards)', 'var(--text)', 'card', 16),
  T('text-2 on page', 'var(--text-2)', 'page', 16),
  T('muted on page', 'var(--muted)', 'page', 12),
  T('muted on card', 'var(--muted)', 'card', 12),
  T('muted on #111 panels', 'var(--muted)', 'panel', 12),
  T('muted on #1a1a1a fields', 'var(--muted)', 'field', 12),
  T('text on #1a1a1a fields', 'var(--text)', 'field', 14),
  T('text-2 on #161616 buttons', 'var(--text-2)', 'seg', 14),
  T('muted on map tooltip', 'var(--muted)', 'tip', 12),
  T('text-2 on map tooltip', 'var(--text-2)', 'tip', 12),
  T('accent on page', 'var(--accent)', 'page', 12),
  T('accent on card', 'var(--accent)', 'card', 12),
  T('accent on #111 panels', 'var(--accent)', 'panel', 12),
  T('accent on accent-soft (close buttons)', 'var(--accent)', 'accentSoft', 12),
  T('accent on map tooltip', 'var(--accent)', 'tip', 12),
  T('hint #ff7a1a on map tooltip', '#ff7a1a', 'tip', 11.5),
  T('warning #ffd9a0 on #111', '#ffd9a0', 'panel', 12),
  T('increase rgb(255,170,90) on #111', 'rgb(255, 170, 90)', 'panel', 14),
  T('decrease rgb(130,190,250) on #111', 'rgb(130, 190, 250)', 'panel', 14),
  T('button text #1b0c04 on accent', '#1b0c04', 'accent', 16, true),
  T('button text #1b0c04 on hover #ffc864', '#1b0c04', '#ffc864', 16, true),
  T('map year badge (rgba .5 amber) on page', 'rgba(255, 200, 120, 0.5)', 'page', 64, true),
  U('control border (--ring-ui) on page', 'var(--ring-ui)', 'page'),
  U('control border (--ring-ui) on card', 'var(--ring-ui)', 'card'),
  U('control border (--ring-ui) on #1a1a1a fields', 'var(--ring-ui)', 'field'),
  U('control border (--ring-ui) on #161616 buttons', 'var(--ring-ui)', 'seg'),
  U('focus outline accent on page', 'var(--accent)', 'page'),
  U('focus outline accent on #1a1a1a fields', 'var(--accent)', 'field'),
  U('inactive nav dot (muted, .7) on card', 'rgba(154, 145, 138, 0.7)', 'card'),
  // guided tour (home): text on the cloud
  T('tour: ink on the cloud interior', 'var(--t-ink)', 'tCloud', 16),
  T('tour: ink-2 on the cloud interior', 'var(--t-ink-2)', 'tCloud', 14),
  T('tour: red figures and labels on the cloud', 'var(--t-red)', 'tCloud', 14),
  T('tour: cover title ink on the sunlit patch', 'var(--t-ink)', 'tCloudShade', 56),
  T('tour: cover subtitle red on the sunlit patch (16 px, semibold)', 'var(--t-red)', 'tCloudShade', 16, true),
  U('tour: Ver más border (ink) on the cloud', 'var(--t-ink)', 'tCloud'),
  T('tour: white on source cards over an ember', '#ffffff', 'tSmokeCard', 14),
  T('tour: text on source cards over an ember', 'var(--t-text)', 'tSmokeCard', 14),
  T('tour: ember links on source cards over an ember', 'var(--t-ember)', 'tSmokeCard', 14, true),
  // guided tour (home)
  T('tour: title text on pod over lit cloud', 'var(--t-text)', 'tPod', 24, true),
  T('tour: body text-2 on pod over lit cloud', 'var(--t-text-2)', 'tPod', 16),
  T('tour: muted on pod over lit cloud', 'var(--t-muted)', 'tPod', 12),
  T('tour: amber label on pod over lit cloud', 'var(--t-amber)', 'tPod', 14),
  T('tour: month chart labels #b09d92 on pod', '#b09d92', 'tPod', 12),
  T('tour: text on chip over hot foci', 'var(--t-text)', 'tChip', 14),
  T('tour: text-2 on chip over hot foci', 'var(--t-text-2)', 'tChip', 14),
  T('tour: muted on chip over hot foci', 'var(--t-muted)', 'tChip', 12),
  T('tour: amber on chip over hot foci', 'var(--t-amber)', 'tChip', 14, true),
  T('tour: scroll cue on chip over cloud', 'var(--t-text)', 'tChipCloud', 14, true),
  T('tour: text-2 on sources paper', 'var(--t-text-2)', 'tPaper', 16),
  T('tour: muted on sources paper', 'var(--t-muted)', 'tPaper', 12),
  T('tour: amber links on sources paper', 'var(--t-amber)', 'tPaper', 12),
  T('tour: button text #1a0d02 on amber', '#1a0d02', 'tAmber', 14, true),
  U('tour: control border on pod over lit cloud', 'var(--t-control)', 'tPod'),
  U('tour: control border on chip over hot foci', 'var(--t-control)', 'tChip'),
  U('tour: control border on sources paper', 'var(--t-control)', 'tPaper'),
  U('tour: focus outline amber on pod', 'var(--accent)', 'tPod'),
  T('regions: title text on the scrim', 'var(--t-text)', 'tScrim', 26, true),
  T('regions: body text-2 on the scrim', 'var(--t-text-2)', 'tScrim', 14),
  T('regions: muted sources on the scrim', 'var(--t-muted)', 'tScrim', 12),
  T('regions: ember figures and labels on the scrim', 'var(--t-ember)', 'tScrim', 14),
  U('regions: Más información border on the scrim', 'var(--t-control)', 'tScrim'),
  T('dialog: text on the sheet', 'var(--t-text)', 'tSheet', 16),
  T('dialog: muted notes on the sheet', 'var(--t-muted)', 'tSheet', 12),
  T('dialog: ember headings on the sheet', 'var(--t-ember)', 'tSheet', 12, true),
  U('dialog: close border on the sheet', 'var(--t-control)', 'tSheet'),
  T('explorar: text-2 on the panel', 'var(--t-text-2)', 'tPanel', 14),
  T('explorar: muted on the panel', 'var(--t-muted)', 'tPanel', 10),
  T('explorar: ember year on the panel', 'var(--t-ember)', 'tPanel', 32, true),
  U('explorar: inactive bar #bf5b30 on the panel', '#bf5b30', 'tPanel'),
  U('explore: inactive bar #bf5b30 on cloud', '#bf5b30', 'tCloud'),
  // atlas map: every fire core is drawn on a tight shadow rgba(6,3,1,.78); its background is that
  // shadow over the land: #2b2520 on the brightest sunlit slope (#ad9e8c), #140f0b on flat land
  U('map: oldest core #e8452a on its shadow over the brightest slope', '#e8452a', '#2b2520'),
  U('map: visited core #d63c22 on its shadow over the brightest slope', '#d63c22', '#2b2520'),
  U('map: grid lowest tier #e8452a on its shadow over the brightest slope', '#e8452a', '#2b2520'),
  U('map: hottest core #fff1c4 on its shadow over the brightest slope', '#fff1c4', '#2b2520'),
  U('map: visited core #d63c22 on its shadow over flat land', '#d63c22', '#140f0b'),
  U('explore: active bar red on cloud', 'var(--t-red)', 'tCloud'),
];

const rows = PAIRS.map((p) => {
  const bg = S[p.on] || surf(p.on);
  const fg = over(parse(p.fg), bg);
  const r = ratio(fg, bg);
  const large = p.kind === 'text' && (p.px >= 24 || (p.px >= 18.66 && p.bold));
  const need = p.kind === 'ui' || large ? 3 : 4.5;
  return { ...p, r, need, ok: r >= need };
});

const w = Math.max(...rows.map((r) => r.label.length));
console.log(`${'pair'.padEnd(w)}  ratio  need  result`);
for (const r of rows) console.log(`${r.label.padEnd(w)}  ${r.r.toFixed(2).padStart(5)}  ${String(r.need).padStart(4)}  ${r.ok ? 'pass' : 'FAIL'}`);
const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - bad.length}/${rows.length} pairs pass`);
if (bad.length) { console.log('failing: ' + bad.map((r) => r.label).join('; ')); process.exit(1); }
