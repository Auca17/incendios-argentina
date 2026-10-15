// Screenshot + health check tool. Drives headless Chrome over the DevTools protocol (Node's built-in
// WebSocket, no npm dependencies).
//
//   node scripts/shots.mjs --url http://localhost:8770/#6 --w 1440 --h 900 --out <dir> --prefix chubut_desk
//
// Options
//   --url <url>          page to open (required)
//   --w, --h <px>        viewport size (default 1440x900)
//   --mobile             real mobile emulation (Emulation.setDeviceMetricsOverride mobile:true + touch);
//                        on by default when --w < 900, force off with --mobile=false
//   --dpr <n>            device scale factor (default 1; 2 when mobile)
//   --out <dir>          directory for the PNGs (created if missing; default ./shots)
//   --prefix <name>      file name prefix (default "shot")
//   --fractions <list>   comma list of scroll fractions (default 0,0.25,0.5,0.75,1)
//   --wait <ms>          wait after each scroll before capturing (default 1800)
//   --text <selectors>   comma-separated CSS selectors whose textContent is printed for every shot
//   --motion <v>         prefers-reduced-motion to emulate: no-preference (default) or reduce
//   --eval <js>          async JS expression evaluated once after load, before the shots; its result is printed
//   --full               also capture one full-page shot named <prefix>_full.png at the end
//   --chrome <path>      Chrome binary (default: $CHROME or the standard Windows/Linux/macOS path)
//
// The scroll container is found at run time: the scrollable element with the largest scroll range among
// the text column (<aside>) and the page itself, so it works on desktop (column) and mobile (column or page).
// Reports: console errors, uncaught exceptions, error log entries, failed or >= 400 network requests,
// and horizontal overflow. Exit code 1 when anything is reported.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (!a.startsWith('--')) return acc;
    const [k, inline] = a.slice(2).split('=');
    const next = all[i + 1];
    acc.push([k, inline !== undefined ? inline : next && !next.startsWith('--') ? next : 'true']);
    return acc;
  }, []),
);

if (!args.url) {
  console.error('usage: node scripts/shots.mjs --url <url> [--w 1440 --h 900 --out dir --prefix name --fractions 0,.5,1 --text sel]');
  process.exit(2);
}
const W = +(args.w || 1440), H = +(args.h || 900);
const MOBILE = args.mobile !== undefined ? args.mobile !== 'false' : W < 900;
const DPR = +(args.dpr || (MOBILE ? 2 : 1));
const OUT = path.resolve(args.out || 'shots');
const PREFIX = args.prefix || 'shot';
const FRACTIONS = (args.fractions || '0,0.25,0.5,0.75,1').split(',').map(Number);
const WAIT = +(args.wait || 1800);
const MOTION = args.motion === 'reduce' ? 'reduce' : 'no-preference';
const TEXTS = args.text ? args.text.split(',').map((s) => s.trim()).filter(Boolean) : [];

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const CHROME = args.chrome || CANDIDATES.find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome not found; pass --chrome <path> or set CHROME'); process.exit(2); }

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9300 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-profile-'));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
  '--force-color-profile=srgb', 'about:blank',
], { stdio: 'ignore' });

function killChrome() {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
    else chrome.kill('SIGKILL');
  } catch { /* already gone */ }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* locked profile files: harmless */ }
}

async function pageTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const t = list.find((x) => x.type === 'page');
      if (t) return t;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a page target');
}

const problems = [];
const note = (kind, msg) => { problems.push(`${kind}: ${msg}`); };

async function main() {
  const target = await pageTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket error')); });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(`${msg.error.message}`)) : res(msg.result);
    } else if (msg.method) {
      (listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const on = (method, fn) => { listeners.set(method, [...(listeners.get(method) || []), fn]); };
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };

  const requests = new Map();
  on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') note('console.error', p.args.map((a) => a.value ?? a.description ?? '').join(' '));
  });
  on('Runtime.exceptionThrown', (p) => note('exception', p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  on('Log.entryAdded', (p) => { if (p.entry.level === 'error') note('log.error', `${p.entry.text} ${p.entry.url || ''}`); });
  on('Network.requestWillBeSent', (p) => requests.set(p.requestId, p.request.url));
  on('Network.loadingFailed', (p) => {
    if (p.canceled) return;
    note('network.failed', `${requests.get(p.requestId) || p.requestId} (${p.errorText})`);
  });
  on('Network.responseReceived', (p) => {
    if (p.response.status >= 400) note('network.http', `${p.response.status} ${p.response.url}`);
  });

  await Promise.all(['Page', 'Runtime', 'Log', 'Network'].map((d) => send(`${d}.enable`)));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: MOBILE });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: MOTION }] });
  if (MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const loaded = new Promise((res) => on('Page.loadEventFired', res));
  await send('Page.navigate', { url: args.url });
  await loaded;
  await sleep(2200); // hydration, data fetches, camera fly

  // Scrolls the best scroll container to `f` of its range and describes what happened.
  const scrollTo = (f) => evaluate(`(() => {
    const cands = [document.querySelector('aside'), document.scrollingElement].filter(Boolean);
    const range = (e) => e.scrollHeight - e.clientHeight;
    const el = cands.sort((a, b) => range(b) - range(a))[0];
    const max = Math.max(0, range(el));
    el.scrollTop = ${f} * max;
    return { container: el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? '[' + el.getAttribute('aria-label') + ']' : ''), top: Math.round(el.scrollTop), max: Math.round(max) };
  })()`);

  const probe = () => evaluate(`(() => {
    const out = {};
    for (const sel of ${JSON.stringify(TEXTS)}) {
      const n = document.querySelector(sel);
      out[sel] = n ? n.textContent.replace(/\\s+/g, ' ').trim() : null;
    }
    const sw = document.documentElement.scrollWidth, iw = window.innerWidth;
    const wide = [];
    document.querySelectorAll('body *').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > iw + 1 || r.left < -1) && !e.closest('svg') && getComputedStyle(e).visibility !== 'hidden' && wide.length < 5) wide.push(e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 40) + ' [' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
    });
    return { out, overflowX: sw > iw + 1 ? sw + ' > ' + iw : null, wide };
  })()`);

  if (args.eval) console.log('eval:', JSON.stringify(await evaluate(args.eval)));
  console.log(`viewport ${W}x${H} dpr ${DPR} mobile ${MOBILE} motion ${MOTION} · ${args.url}`);
  for (const f of FRACTIONS) {
    const sc = await scrollTo(f);
    await sleep(WAIT);
    const pr = await probe();
    const name = `${PREFIX}_${String(Math.round(f * 100)).padStart(3, '0')}.png`;
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(shot.data, 'base64'));
    console.log(`  ${name}  scroll ${sc.container} ${sc.top}/${sc.max}`);
    for (const [sel, txt] of Object.entries(pr.out)) console.log(`    ${sel}: ${txt}`);
    if (pr.overflowX) note('overflow-x', `${name}: page scrollWidth ${pr.overflowX}`);
    if (pr.wide.length) note('outside-viewport', `${name}: ${pr.wide.join('; ')}`);
  }
  if (args.full) {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(OUT, `${PREFIX}_full.png`), Buffer.from(shot.data, 'base64'));
  }
  ws.close();
}

let failed = false;
try {
  await main();
} catch (e) {
  console.error('shots failed:', e.message);
  failed = true;
} finally {
  killChrome();
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  [...new Set(problems)].forEach((p) => console.log('  - ' + p));
} else if (!failed) {
  console.log('\nconsole errors: 0 · failed requests: 0 · horizontal overflow: none');
}
process.exit(failed || problems.length ? 1 : 0);
