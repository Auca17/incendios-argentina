// Shared helper: loads the legacy window-based data files in a sandbox.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEGACY_DATA = path.join(ROOT, 'legacy', 'data');
export const OUT = path.join(ROOT, 'public', 'data');

export function loadLegacy() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(LEGACY_DATA, 'data.js'), 'utf8'), sandbox);
  const evDir = path.join(LEGACY_DATA, 'ev');
  const ids = fs.readdirSync(evDir).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  for (const id of ids) vm.runInContext(fs.readFileSync(path.join(evDir, id + '.js'), 'utf8'), sandbox);
  // JSON round-trip drops vm-realm prototypes so deepStrictEqual compares plain objects
  const plain = (o) => JSON.parse(JSON.stringify(o));
  return { DATA: plain(sandbox.window.DATA), EV_FOCI: plain(sandbox.window.EV_FOCI), ids };
}

/** Builds the exact JSON file set (name -> object) from the legacy structures. */
export function buildFiles({ DATA, EV_FOCI, ids }) {
  const files = {
    'meta.json': DATA.meta,
    'provincias.json': DATA.prov,
    'provincia-mes.json': DATA.pm,
  };
  for (const y of Object.keys(DATA.grid.anios).sort()) {
    files[`grid-${y}.json`] = { step: DATA.grid.step, year: Number(y), cells: DATA.grid.anios[y] };
  }
  for (const id of ids) files[`semanas-${id}.json`] = EV_FOCI[id];
  return files;
}
