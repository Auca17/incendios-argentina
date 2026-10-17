// Cloud opening test. Needs a fresh `npm run build` (serves out/).
//
//   npm run test:clouds                 1440x900, coverage 1.00 -> 0.00 in 5 % steps
//   node scripts/test-clouds.mjs --w 390 --h 844
//
// For every coverage step it finds, by bisection, the scroll position where the cloud canvas reports
// that coverage (canvas[data-coverage]), saves a screenshot to qa/nubes/ and measures the cloud
// canvas itself: mean opacity and how many pixels change between consecutive steps. The opening
// must be gradual and monotonic: mean opacity never goes up while coverage goes down, no step changes
// mean opacity by more than 0.09, and no step takes more than 1 % of the pixels from almost opaque
// to almost clear in one go (a "pop"). Exit code 1 otherwise, or on console errors and failed requests.
import { spawn, spawnSync } from 'node:child_process';
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
const W = +(args.w || 1440), H = +(args.h || 900);
const MOBILE = W < 1024;
const OUT = path.join(ROOT, 'qa', 'nubes');
const OUT_DIR = path.join(ROOT, 'out');
if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) { console.error('out/ missing: run `npm run build` first'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(OUT_DIR, p);
  if (!f.startsWith(OUT_DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((res) => server.listen(0, '127.0.0.1', res));

const CHROME = args.chrome || [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome not found; pass --chrome <path>'); process.exit(2); }
const PORT = 9300 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'clouds-profile-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
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
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => { ws.onopen = res; });
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
await Promise.all(['Page', 'Runtime', 'Network'].map((d) => send(d + '.enable')));
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE });
// headless Chrome reports reduced motion unless told otherwise; test the full motion path by default
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: args.motion === 'reduce' ? 'reduce' : 'no-preference' }] });
const loaded = new Promise((res) => on('Page.loadEventFired', res));
await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
await loaded;
await sleep(2000);

const covAt = (y) => evaluate(`(async () => {
  window.scrollTo(0, ${y});
  await new Promise((r) => setTimeout(r, 160));
  return +document.querySelector('canvas[data-tour-canvas="clouds"]').dataset.coverage;
})()`);
// in-page sample of the cloud canvas: alpha per cell of a 192-wide grid
const sample = () => evaluate(`(() => {
  const src = document.querySelector('canvas[data-tour-canvas="clouds"]');
  const c = document.createElement('canvas');
  c.width = 192; c.height = Math.round(192 * src.height / src.width);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const a = [];
  for (let i = 3; i < d.length; i += 4) a.push(d[i]);
  return a;
})()`);

const end = await evaluate(`Math.round(document.getElementById('sec-misiones').getBoundingClientRect().top + scrollY)`);
if (args.debug) console.log('end', end);
const tag = MOBILE ? 'm' : 'd';
const rows = [];
let prev = null, fail = 0;
for (let k = 0; k <= 20; k++) {
  const want = 1 - k * 0.05;
  let lo = 0, hi = end, cov = await covAt(0);
  if (want < 1) {
    for (let i = 0; i < 22; i++) {
      const mid = Math.round((lo + hi) / 2);
      cov = await covAt(mid); if (args.debug) console.log("  bisect", want, mid, cov);
      if (cov > want) lo = mid; else hi = mid;
      if (hi - lo <= 1) break;
    }
    cov = await covAt(hi);
  }
  await sleep(150);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${tag}-cov-${String(Math.round(want * 100)).padStart(3, '0')}.png`), Buffer.from(shot.data, 'base64'));
  const a = await sample();
  const mean = a.reduce((s, v) => s + v, 0) / a.length / 255;
  let flips = 0, mad = 0;
  if (prev) a.forEach((v, i) => { if (prev[i] - v > 230) flips++; mad += Math.abs(prev[i] - v) / 255; });
  const step = prev ? { dMean: rows[rows.length - 1].mean - mean, flips: flips / a.length, mad: mad / a.length } : null;
  rows.push({ want, cov, mean, step });
  if (step && (step.dMean < -0.002 || step.dMean > 0.09 || step.flips > 0.01)) fail++;
  prev = a;
}

console.log(`viewport ${W}x${H} · screenshots in qa/nubes/${tag}-cov-*.png`);
console.log('coverage  measured  mean-opacity  Δmean   flipped-px  mean|Δ|');
for (const r of rows) {
  console.log(`  ${r.want.toFixed(2)}     ${r.cov.toFixed(3)}     ${r.mean.toFixed(3)}       ${r.step ? r.step.dMean.toFixed(3).padStart(6) : '     -'}  ${r.step ? (r.step.flips * 100).toFixed(2).padStart(6) + ' %' : '       -'}  ${r.step ? r.step.mad.toFixed(3) : '-'}`);
}
problems.forEach((p) => console.log('  ' + p));
const ok = fail === 0 && problems.length === 0;
console.log(ok ? 'CLOUDS OK (gradual, monotonic, no pops)' : `CLOUDS FAILED (${fail} bad steps)`);
done(ok ? 0 : 1);
