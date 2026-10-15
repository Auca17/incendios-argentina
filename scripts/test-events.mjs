// Asserts that EVENTS in lib/events.ts is identical to EVENTS in legacy/app.js.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './lib-legacy.mjs';

/** Slices the `[ ... ]` literal that follows `marker` (bracket matching, string-aware) and evaluates it. */
function extractArray(src, marker) {
  const at = src.indexOf(marker);
  assert.ok(at >= 0, `marker not found: ${marker}`);
  const start = src.indexOf('[', at + marker.length - 1);
  let depth = 0, quote = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === String.fromCharCode(92)) i++; // skip escaped char
      else if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) {
      const value = vm.runInNewContext('(' + src.slice(start, i + 1) + ')');
      return JSON.parse(JSON.stringify(value)); // plain objects, no vm-realm prototypes
    }
  }
  throw new Error('unterminated array literal');
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const legacy = extractArray(read('legacy/app.js'), 'var EVENTS = [');
const next = extractArray(read('lib/events.ts'), 'export const EVENTS: any[] = [');

assert.deepStrictEqual(next, legacy);
console.log(`EVENTS OK (${next.length} events)`);
