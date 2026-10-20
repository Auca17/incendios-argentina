// Converts legacy/data/*.js (window.DATA, window.EV_FOCI) into lazy-loadable JSON under public/data/.
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacy, buildFiles, OUT } from './lib-legacy.mjs';

const files = buildFiles(loadLegacy());
fs.mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const [name, obj] of Object.entries(files)) {
  const txt = JSON.stringify(obj);
  fs.writeFileSync(path.join(OUT, name), txt);
  bytes += txt.length;
}
console.log(`to-json: wrote ${Object.keys(files).length} files, ${(bytes / 1024).toFixed(0)} KiB -> public/data/`);
