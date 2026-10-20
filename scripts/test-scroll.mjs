// Scroll determinism test for the guided tour (home page). Needs a fresh `npm run build` (serves out/).
//
//   npm run test:scroll                      200 steps, 2 s settle per stop, 1440x900
//   node scripts/test-scroll.mjs --steps 40 --wait 1500 --w 390 --h 844
//
// Drives headless Chrome over the DevTools protocol (Node's built-in WebSocket, no npm dependencies).
// Random walk up and down the tour (jumps of 100 to 1200 px on a 100 px lattice, so positions repeat),
// mixed with HUD dot clicks (scrollIntoView) and arrow-key jumps. After each stop it waits, then
// fingerprints the map canvas, the cloud canvas and the rendered HUD state. Every time a scrollY
// comes back, the fingerprints must match the first visit. It also checks that the closed clouds of
// the epilogue cover the centre of the viewport completely (no map pixel behind the epilogue text).
// Exit code 1 on any mismatch, console error or failed request.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
  return acc;
}, []));
const STEPS = +(args.steps || 200);
const WAIT = +(args.wait || 2000);
const W = +(args.w || 1440), H = +(args.h || 900);
const MOBILE = W < 1024;
const SEED = +(args.seed || 2026);
const DEBUG = args.debug ? 1 : 0;
const OUT = path.resolve(args.out || path.join(os.tmpdir(), 'scroll-test'));
const OUT_DIR = path.join(ROOT, 'out');
if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) { console.error('out/ missing: run `npm run build` first'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

/* ---------- static server for out/ ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(OUT_DIR, p);
  if (!f.startsWith(OUT_DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const URL_ = `http://127.0.0.1:${server.address().port}/`;

/* ---------- Chrome ---------- */
const CHROME = args.chrome || [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome not found; pass --chrome <path> or set CHROME'); process.exit(2); }
const PORT = 9300 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'scroll-profile-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
  '--force-color-profile=srgb',
  // software 2D canvas: Chrome otherwise moves a canvas from GPU to CPU after repeated readbacks,
  // and the two rasterisers antialias differently, which would show up as false mismatches
  '--disable-accelerated-2d-canvas', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => {
  try { process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) : chrome.kill('SIGKILL'); } catch { /* gone */ }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
  server.close();
  process.exit(code);
};

let target;
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === 'page'); } catch { /* not up */ }
  if (!target) await sleep(250);
}
if (!target) { console.error('Chrome did not start'); done(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map(), listeners = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result); }
  else if (msg.method) (listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const on = (m, fn) => listeners.set(m, [...(listeners.get(m) || []), fn]);
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

const problems = [];
on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') problems.push('console.error: ' + p.args.map((a) => a.value ?? a.description).join(' ')); });
on('Runtime.exceptionThrown', (p) => problems.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
on('Network.loadingFailed', (p) => { if (!p.canceled) problems.push('network.failed: ' + p.errorText); });
on('Network.responseReceived', (p) => { if (p.response.status >= 400) problems.push(`http ${p.response.status} ${p.response.url}`); });
await Promise.all(['Page', 'Runtime', 'Network'].map((d) => send(d + '.enable')));
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE });
// headless Chrome reports reduced motion unless told otherwise; test the full motion path by default
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: args.motion === 'reduce' ? 'reduce' : 'no-preference' }] });
const loaded = new Promise((res) => on('Page.loadEventFired', res));
await send('Page.navigate', { url: URL_ });
await loaded;
await sleep(2500);

// Determinism: the tour must start with a clean address (no ?y= or ?p=) and the explore player idle
const initialSearch = await evaluate('location.search');
if (initialSearch.includes('y=') || initialSearch.includes('p=')) {
  console.error('Determinism error: initial page contains explore query: ' + initialSearch);
  done(1);
}

/* ---------- helpers ---------- */
const tourEnd = await evaluate(`Math.floor(document.getElementById('fuentes').getBoundingClientRect().top + scrollY - innerHeight)`);
const storyCount = 6;

const fingerprint = async () => {
  const canv = await evaluate(`(async () => {
    const out = {};
    for (const c of document.querySelectorAll('canvas[data-tour-canvas]')) {
      // copy into a 2D canvas: works for the 2D map and for the WebGL clouds (preserveDrawingBuffer)
      const k = document.createElement('canvas');
      k.width = c.width; k.height = c.height;
      const g = k.getContext('2d', { willReadFrequently: true });
      g.drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      (window.__px = window.__px || {})[c.dataset.tourCanvas] = d;
      const h = await crypto.subtle.digest('SHA-256', d);
      out[c.dataset.tourCanvas] = [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    const m = document.querySelector('canvas[data-tour-canvas="map"]');
    return { y: Math.round(scrollY), out, mapPng: ${DEBUG} ? m.toDataURL('image/png').split(',')[1] : '' };
  })()`);
  // HUD state as rendered: visibility, active story, progress bar and the live-region text (a screenshot
  // of its strip would also pick up the WebGL clouds behind it, which the canvas check already covers)
  const hudState = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label]');
    const cur = [...nav.querySelectorAll('button')].findIndex((b) => b.getAttribute('aria-current') === 'step');
    const fill = nav.querySelector('span span');
    return JSON.stringify([getComputedStyle(nav).visibility, getComputedStyle(nav).opacity, cur, fill && fill.style.transform,
      document.querySelector('[aria-live=polite]')?.textContent]);
  })()`);
  const hud = await send('Page.captureScreenshot', { format: 'png', clip: { x: MOBILE ? 0 : W - 200, y: 0, width: MOBILE ? W : 200, height: MOBILE ? 120 : H, scale: 1 } });
  const hudHash = crypto.createHash('sha256').update(hudState).digest('hex').slice(0, 16);
  return { y: canv.y, map: canv.out.map, clouds: canv.out.clouds, hud: hudHash, hudPng: hud.data, mapPng: canv.mapPng };
};

let s = SEED;
const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const seen = new Map();
let compared = 0, mismatches = 0, tolerated = 0;
const kinds = { walk: 0, hud: 0, key: 0 };

console.log(`tour range 0..${tourEnd}px · ${STEPS} steps · wait ${WAIT} ms · ${W}x${H}`);
let y = 0;
for (let step = 0; step < STEPS; step++) {
  const r = rnd();
  if (r < 0.12) {
    const i = Math.floor(rnd() * storyCount);
    await evaluate(`document.querySelectorAll('nav button[aria-label]')[${i}].click()`);
    kinds.hud++;
  } else if (r < 0.22) {
    const key = rnd() < 0.5 ? 'ArrowRight' : 'ArrowLeft';
    const code = key === 'ArrowRight' ? 39 : 37;
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
    kinds.key++;
  } else {
    const jump = (1 + Math.floor(rnd() * 12)) * 100 * (rnd() < 0.5 ? -1 : 1);
    y = Math.min(Math.floor(tourEnd / 100) * 100, Math.max(0, y + jump));
    await evaluate(`window.scrollTo(0, ${y})`);
    kinds.walk++;
  }
  await sleep(WAIT);
  // the camera spring may still be settling on a slow machine: compare only the settled frame
  // (two equal fingerprints in a row, at most 10 s), which is what the page promises
  let fp = await fingerprint();
  for (let t = 0; t < 20; t++) {
    await sleep(500);
    const again = await fingerprint();
    const same = again.map === fp.map && again.clouds === fp.clouds && again.hud === fp.hud;
    fp = again;
    if (same) break;
  }
  y = fp.y;
  const prev = seen.get(fp.y);
  if (!prev) {
    seen.set(fp.y, fp);
    await evaluate(`(() => { window.__ref = window.__ref || {}; for (const k in window.__px) window.__ref['${fp.y}:' + k] = window.__px[k]; })()`);
    continue;
  }
  compared++;
  let bad = ['map', 'clouds', 'hud'].filter((k) => prev[k] !== fp[k]);
  // minimal tolerance for the canvases: at most 0.1 % of pixels may differ visibly (> 24 levels)
  for (const k of bad.filter((x) => x !== 'hud')) {
    const visible = await evaluate(`(() => {
      const a = window.__ref && window.__ref['${fp.y}:${k}'], b = window.__px['${k}'];
      if (!a || a.length !== b.length) return 1;
      let n = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i + 1] - b[i + 1]) > 24 || Math.abs(a[i + 2] - b[i + 2]) > 24) n++;
      return n / (a.length / 4);
    })()`);
    if (visible <= 0.001) { bad = bad.filter((x) => x !== k); tolerated++; }
  }
  if (bad.length) {
    mismatches++;
    console.log(`  MISMATCH at y=${fp.y} (step ${step}): ${bad.join(', ')}`);
    fs.writeFileSync(path.join(OUT, `hud_${fp.y}_a.png`), Buffer.from(prev.hudPng, 'base64'));
    fs.writeFileSync(path.join(OUT, `hud_${fp.y}_b.png`), Buffer.from(fp.hudPng, 'base64'));
    if (DEBUG) { fs.writeFileSync(path.join(OUT, `map_${fp.y}_a.png`), Buffer.from(prev.mapPng, 'base64')); fs.writeFileSync(path.join(OUT, `map_${fp.y}_b.png`), Buffer.from(fp.mapPng, 'base64')); }
  }
}

/* ---------- epilogue: clouds fully closed behind the text ---------- */
const cover = await evaluate(`(async () => {
  const el = document.getElementById('sec-epilogue');
  const top = el.getBoundingClientRect().top + scrollY;
  window.scrollTo(0, Math.round(top + el.offsetHeight * 0.4 - innerHeight * 0.45));
  await new Promise((r) => setTimeout(r, 1200));
  const src = document.querySelector('canvas[data-tour-canvas="clouds"]');
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const x0 = Math.round(c.width * 0.15), y0 = Math.round(c.height * 0.1);
  const d = g.getImageData(x0, y0, Math.round(c.width * 0.7), Math.round(c.height * 0.8)).data;
  let holes = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) holes++;
  return { holes, pixels: d.length / 4 };
})()`);

console.log(`stops: ${STEPS} (walk ${kinds.walk}, HUD ${kinds.hud}, keys ${kinds.key}) · distinct positions: ${seen.size} · repeats compared: ${compared} · identical or within 0.1 % (${tolerated} sub-pixel) · mismatches: ${mismatches}`);
console.log(`epilogue cover: ${cover.holes} non-opaque pixels of ${cover.pixels} in the central 70 % x 80 %`);
problems.forEach((p) => console.log('  ' + p));
const ok = mismatches === 0 && cover.holes === 0 && problems.length === 0 && compared > 0;
console.log(ok ? 'SCROLL OK' : 'SCROLL FAILED');
done(ok ? 0 : 1);
