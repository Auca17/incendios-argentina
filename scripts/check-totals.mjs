// Verifies public/data/*.json equals the legacy JS data and reproduces the control figures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacy, buildFiles, OUT, LEGACY_DATA } from './lib-legacy.mjs';

const legacy = loadLegacy();
const expected = buildFiles(legacy);

// 1. every JSON file equals the legacy content, and no stray files exist
const onDisk = fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).sort();
assert.deepStrictEqual(onDisk, Object.keys(expected).sort(), 'file set differs from legacy data');
for (const [name, obj] of Object.entries(expected)) {
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')), obj, `${name} differs from legacy`);
}
assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(LEGACY_DATA, 'meta.json'), 'utf8')), legacy.DATA.meta, 'legacy meta.json != DATA.meta');

// 2. home figure: app.js prints fmt(D.meta.total_focos); it must also equal the sum of the yearly totals
const fmt = (n) => Math.round(n).toLocaleString('es-AR');
const meta = JSON.parse(fs.readFileSync(path.join(OUT, 'meta.json'), 'utf8'));
const sumYears = Object.values(meta.por_anio).reduce((a, b) => a + b, 0);
assert.equal(meta.total_focos, sumYears, 'total_focos != sum(por_anio)');
assert.equal(fmt(meta.total_focos), '2.620.568', 'home total');

// 3. Chubut readout, same maths as app.js (loadFoci + fociWeek at reading progress 0 + weekDate)
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const E = JSON.parse(fs.readFileSync(path.join(OUT, 'semanas-chubut.json'), 'utf8'));
const cum = new Array(E.weeks + 1).fill(0);
let first = E.weeks;
E.cells.forEach((c) => { cum[c[2] + 1] += c[3]; if (c[2] < first) first = c[2]; });
for (let i = 1; i < cum.length; i++) cum[i] += cum[i - 1];
const wk = first + 1;
const d = new Date(E.start + 'T00:00:00'); d.setDate(d.getDate() + 7 * wk - 1);
const label = `semana ${wk} de ${E.weeks} · ${fmt(cum[wk])} focos · hasta el ${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}`;
assert.equal(label, 'semana 1 de 44 · 1.122 focos · hasta el 7 de enero de 2026', 'Chubut readout');
assert.equal(cum[E.weeks], E.total, 'Chubut cumulative != declared total');

console.log(`Home total: ${fmt(meta.total_focos)} focos (${Object.keys(meta.por_anio).length} years)`);
console.log(`Chubut: ${label} (event total ${fmt(E.total)})`);
console.log(`DATA OK (${onDisk.length} JSON files identical to legacy)`);
