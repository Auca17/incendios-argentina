'use client';
import { useEffect, useRef } from 'react';
import { LANDSCAPES, LAND_NOTES, buildLand, veilTexture, type Land } from '../lib/landscapes';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe, type Frame } from '../lib/scrollDriver';
import { DEFS, publish, seqPlaying, seqStage, type SeqPhase } from '../lib/interaction';
import { drawInteraction, drawWeather, spotOn, type Stage } from '../lib/landFire';
import { CINE_END, cineOk, cineShown } from '../lib/cine';
import { mapGlow } from '../lib/mapGlow';
import styles from './Landscape.module.css';

/*
 * The establishing shot of each region and the veil between regions, on one canvas over the map.
 *  - land: the region's illustrated landscape (lib/landscapes.ts), with a slow push-in and parallax
 *    while its shot runs (landT) and a lift onto the map at its end. Its fire grows with landT.
 *  - veil: haze (into the first region, coming down from the clouds) or smoke (between regions)
 *    that covers the screen while the camera travels.
 *  - card: the chapter's title card (region, date, title), placed differently in each landscape.
 *  - the scene interaction (lib/interaction.ts): the illustrated fire and its response, drawn inside
 *    the landscape (lib/landFire.ts), or over Chubut's cinematic opening. While it runs the story is
 *    held and this canvas runs its own clock; it is the one place that advances the interaction.
 * Everything else follows the scroll state; the canvas is hidden and idle when there is nothing to show.
 */
const HAZE = '233,238,243';
/** Where each landscape's own fire burns on screen (fractions): the warm light starts there. */
const FIRE_AT: Record<string, [number, number]> = {
  misiones: [0.7, 0.6], corrientes: [0.42, 0.58], cordoba: [0.62, 0.55], delta: [0.35, 0.54], mendoza: [0.3, 0.52],
};
/*
 * The opening of the smoke onto the map: the same rule as the cinematic opening of Chubut
 * (components/CineFire.tsx: smoothstep(r * 1.25 - 0.25, r * 1.25, holes)) over the same soft noise the
 * smoke between regions uses (veilTexture), here as a 96 x 96 mask stretched over the screen.
 */
let holes: Uint8ClampedArray | null = null;
let mask: HTMLCanvasElement | null = null;
function openMask(r: number): HTMLCanvasElement {
  if (!mask) { mask = document.createElement('canvas'); mask.width = mask.height = 96; }
  if (!holes) holes = veilTexture('255,255,255').getContext('2d')!.getImageData(0, 0, 96, 96).data;
  const g = mask.getContext('2d')!;
  const img = g.createImageData(96, 96);
  const lo = r * 1.25 - 0.25, hi = r * 1.25;
  for (let i = 0; i < 96 * 96; i++) {
    const n = holes[i * 4 + 3] / 255;
    const t = Math.min(1, Math.max(0, (n - lo) / (hi - lo)));
    img.data[i * 4 + 3] = Math.round(255 * t * t * (3 - 2 * t)); // 1 while closed, 0 once open
  }
  g.putImageData(img, 0, 0);
  return mask;
}
const SMOKE = '38,34,31';

export default function Landscape() {
  const cv = useRef<HTMLCanvasElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const note = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const g = canvas.getContext('2d')!;
    let W = 0, H = 0, r = 1, key = '', shown = false;
    // painted layers per region, kept for the current size; the next region is painted ahead, when idle
    let lands = new Map<string, Land>();
    const landOf = (id: string) => {
      let L = lands.get(id);
      if (!L) { L = buildLand(id, W, H, res); lands.set(id, L); }
      return L;
    };
    let res = 1;
    let ahead = '';
    const idle = (fn: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));

    let cur: Frame | null = null;
    let loop = 0;
    // a card left behind by a fast scroll into another region fades on its own instead of vanishing
    // (st.card is the current region's: the scroll driver does not carry it across regions)
    const cardV: number[] = [];
    let cardT = 0;
    let cardFading = false;
    const onFrame = (f: Frame) => { cur = f; paint(); return cardFading; };
    const smooth01 = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    // fades a drawing that sets its own alphas: every alpha it sets is scaled by `mul` (the canvas
    // multiplies its colours and gradients by globalAlpha). Compositing through an offscreen canvas
    // instead cost hundreds of ms a frame
    let mul = 1;
    const ga = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha')!;
    Object.defineProperty(g, 'globalAlpha', {
      configurable: true,
      get() { return ga.get!.call(g) / mul; },
      set(v: number) { ga.set!.call(g, v * mul); },
    });
    const faded = (c: CanvasRenderingContext2D, a: number, draw: (c: CanvasRenderingContext2D) => void) => {
      if (a <= 0.002) return;
      if (a >= 0.998) { draw(c); return; }
      c.save();
      mul = a;
      c.globalAlpha = 1;
      try { draw(c); } finally { mul = 1; c.restore(); }
    };
    const paint = () => {
      // one paint a frame: a call from the scroll driver takes the place of the pending one (left
      // pending, every scrolled frame started one more self-renewing loop, and they piled up)
      if (loop) cancelAnimationFrame(loop);
      loop = 0;
      if (!cur) return;
      const { st, vw, vh, reduced } = cur;
      if (vw !== W || vh !== H) {
        W = vw; H = vh;
        // full resolution on desktop (up to 1.25 device px per CSS px), so the fire and its smoke stay
        // crisp; phones keep a lighter canvas
        r = W < 1024 ? Math.min(window.devicePixelRatio || 1, 1) * 0.6 : Math.min(window.devicePixelRatio || 1, 1.25);
        res = r;
        canvas.width = Math.round(W * r);
        canvas.height = Math.round(H * r);
        lands = new Map();
        ahead = '';
        key = '';
      }
      const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
      const id = ev && LANDSCAPES[ev.id] ? ev.id : '';
      // the interaction of this region: running (it advances here, and only here), or its end state
      const sid = ev && DEFS[ev.id] ? ev.id : '';
      let stage: Stage | null = null;
      let seqLive = false;
      const still = reduced || !!(window as any).__tourStill;
      // Chubut's opening stays on screen while its plane is still flying (a fast scroll never cuts it)
      const cine = sid === 'chubut' && (st.chapterT < CINE_END || seqPlaying('chubut')) && cineOk() && cineShown();
      if (sid) {
        // the sequence of this region: inside the landscape shot, or over Chubut's cinematic opening
        const d = DEFS[sid];
        const inShot = d.on === 'land' ? st.land > 0.5 : cine;
        const sq = inShot ? seqStage(sid, d.on === 'land' ? st.landT : st.chapterT / CINE_END, reduced || still) : null;
        if (sq) {
          stage = { phase: sq.phase, p: sq.p, time: still ? 0 : performance.now() / 1000, still, reduced, responded: sq.phase === 'done' };
          seqLive = sq.live;
        }
      }
      publish(stage && sid ? { id: sid, phase: stage.phase as SeqPhase } : null);
      // the scene's own fire, smoke, crew and plane go first, then the shot opens onto the map: before
      // the landscape lifts (landT 0.66), or before Chubut's opening opens in holes (its reveal, 0.74)
      const decor = sid === 'chubut'
        ? (seqPlaying('chubut') ? 1 : 1 - smooth01((st.chapterT / CINE_END - 0.66) / 0.08))
        : 1 - smooth01((st.landT - 0.6) / 0.08);
      // the veil clears at the start of a region and rises at its end; haze on the way down from the
      // clouds into the first region, smoke between regions
      const inbound = st.chapter === 8 || (st.chapter >= 0 && st.chapter <= 5 && st.chapterT < 0.5);
      const haze = st.chapter === -1 || (st.chapter === 0 && inbound);

      const now = performance.now();
      const fade = Math.exp(-Math.min(0.1, Math.max(0, (now - cardT) / 1000)) / 0.08);
      cardT = now;
      cardFading = false;
      cards.current.forEach((c, i) => {
        if (!c) return;
        // the title card has faded (lib/tour.ts) before the scene's sequence starts
        const left = reduced ? 0 : (cardV[i] ?? 0) * fade;
        const o = i === st.chapter ? st.card : left < 0.002 ? 0 : left;
        cardV[i] = o;
        if (i !== st.chapter && o > 0) cardFading = true;
        c.style.opacity = o.toFixed(3);
        c.style.visibility = o > 0.001 ? 'visible' : 'hidden';
        c.style.setProperty('--k', o.toFixed(3));
      });
      if (note.current) {
        // during a scene interaction its own bar says it is an illustration
        // it goes with the landscape: gone once the landscape has sunk into the smoke
        const o = id && !stage ? Math.max(0, (st.land - 0.5) / 0.5) * (1 - st.veil) : 0;
        note.current.style.opacity = o.toFixed(3);
        note.current.style.visibility = o > 0.02 ? 'visible' : 'hidden';
        if (id && note.current.dataset.id !== id) {
          note.current.dataset.id = id;
          note.current.innerHTML = `<b>${LAND_NOTES[id][0]}</b>${LAND_NOTES[id][1]}`;
        }
      }

      // paint the next region's landscape ahead of time, while the reader is still in this one
      const next = st.chapter >= -1 && st.chapter < 5 ? TOUR_EVENTS[st.chapter + 1]?.id : '';
      if (next && LANDSCAPES[next] && ahead !== next) {
        ahead = next;
        idle(() => { if (W && !lands.has(next)) { landOf(next); if (lands.size > 3) lands.delete(lands.keys().next().value!); } });
      }

      const show = (id !== '' && st.land > 0.001) || st.veil > 0.001 || (cine && !!stage);
      // the sequence moves on its own clock, and its flames flicker: keep drawing while it is on screen
      const live = !!stage && (seqLive || !still);
      const k = [id, st.land.toFixed(3), st.landT.toFixed(3), st.veil.toFixed(3), haze, inbound, W, H, reduced, stage ? stage.phase + stage.p.toFixed(4) : ''].join('|');
      if (k === key && !live) return;
      key = k;
      if (!show) {
        if (shown) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); shown = false; }
        canvas.style.visibility = 'hidden';
        return;
      }
      canvas.style.visibility = 'visible';
      shown = true;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.setTransform(r, 0, 0, r, 0, 0);

      /*
       * The landscape never shows through the map (no double exposure): as `land` goes from 1 to 0.5
       * the landscape sinks into the smoke of its own fire, opaque over the map; from 0.5 to 0 that
       * smoke clears off the map. Landscape and map are never on screen together.
       */
      const sink = id ? Math.min(1, Math.max(0, (1 - st.land) / 0.5)) : 0;
      const clear = id && st.land < 0.5 ? st.land / 0.5 : 1;
      if (id && st.land > 0.5) {
        const { layers, grade, ground, zones, horizon, wide } = landOf(id);
        const LW = wide ?? W;
        // the Delta pans: a slow camera travel to the right, nearer planes faster (none under reduced
        // motion); it follows the shot's progress, so it rewinds with the scroll and holds in a pause
        const panAt = (depth: number) => (wide ? -(LW - W) / 2 + (reduced ? 0 : (0.5 - st.landT) * (LW - W) * 0.9 * (0.35 + 0.65 * depth)) : 0);
        // Mendoza: the camera closes in on the fire as it grows, and holds there while the brigade works
        let zoom = 1, zx = W * 0.5, zy = H * 0.62;
        if (id === 'mendoza' && stage && !reduced && ground) {
          const k = stage.phase === 'ignite' ? 0.45 * stage.p : stage.phase === 'respond' ? 0.45 + 0.55 * Math.min(1, stage.p / 0.3) : 1;
          // a gentle push only: the whole slope, both fronts and both lines stay in view
          zoom = 1 + 0.22 * (k * k * (3 - 2 * k));
          const [fx, fy] = spotOn(id, ground);
          zx = fx + (ground.x1 - ground.x0) * 0.12; zy = fy;
        }
        const kT = st.landT;
        // a slow push into the landscape while its shot runs, then the lift onto the map
        const push = reduced ? 0 : 0.05 * kT + 0.12 * (1 - st.land);
        const ax = W * 0.5, ay = H * 0.62;
        g.globalAlpha = 1;
        for (const [li, L] of layers.entries()) {
          const s = 1 + push * (0.3 + L.depth);
          const dy = reduced ? 0 : -L.depth * H * 0.03 * kT;
          g.save();
          if (zoom !== 1) { g.translate(zx, zy); g.scale(zoom, zoom); g.translate(-zx, -zy); }
          g.translate(ax, ay + dy);
          g.scale(s, s);
          g.translate(-ax, -ay);
          const px = panAt(L.depth);
          g.translate(px, 0);
          // the vine rows rise into view from below as the shot begins
          const lift = L.rise && !reduced ? (1 - Math.min(1, kT * 1.8)) * H * 0.4 : 0;
          g.drawImage(L.c, 0, lift, LW, H);
          g.globalAlpha = 1;
          // the shot's own smoke on the fire's ground gives way to the reader's fire while it is there
          if (!(stage && ground && ground.layer === li)) L.after?.(g, LW, H, kT);
          g.globalAlpha = 1;
          if (ground && ground.layer === li) {
            // the fire is drawn on its ground, in this layer's frame: it moves with the terrain
            if (stage) faded(g, decor, (c) => drawInteraction(id, c, LW, H, stage!, ground, zones));
          }
          g.globalAlpha = 1;
          g.restore();
        }
        g.save();
        grade(g, W, H, kT);
        if (stage) drawWeather(id, g, W, H, stage, horizon);
        g.restore();
        g.globalAlpha = 1;
      }
      if (id && sink > 0) {
        // the smoke the landscape sinks into, and that then opens onto the map
        g.setTransform(r, 0, 0, r, 0, 0);
        const smoke = (a: number) => {
          g.globalAlpha = a;
          g.fillStyle = `rgb(${SMOKE})`;
          g.fillRect(0, 0, W, H);
          g.globalAlpha = a * 0.55;
          g.drawImage(veilTexture('78,70,64'), 0, 0, W, H);
          g.globalAlpha = 1;
        };
        if (st.land >= 0.5) smoke(sink * sink * (3 - 2 * sink));
        else if (reduced) smoke(clear); // reduced motion: a short plain fade, no holes, no travelling light
        else {
          const op = 1 - clear; // 0 = closed, 1 = open
          smoke(1);
          // the smoke opens in holes onto the map
          g.save();
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalCompositeOperation = 'destination-in';
          g.imageSmoothingEnabled = true;
          g.drawImage(openMask(op), 0, 0, canvas.width, canvas.height);
          g.restore();
          // the light of the illustrated fire goes to where the satellite saw this fire, and goes out
          // as its detections appear (an association, not a position: the landscape is an illustration)
          const fa = FIRE_AT[id];
          if (fa && mapGlow.on) {
            const k = op * op * (3 - 2 * op);
            const x = W * fa[0] + (mapGlow.x - W * fa[0]) * k, y = H * fa[1] + (mapGlow.y - H * fa[1]) * k;
            const rad = H * (0.18 - 0.12 * k);
            const a = Math.sin(Math.PI * Math.min(1, op * 1.15)) * 0.38;
            const gl = g.createRadialGradient(x, y, 0, x, y, rad);
            gl.addColorStop(0, `rgba(255,170,80,${a})`);
            gl.addColorStop(0.4, `rgba(255,120,40,${a * 0.45})`);
            gl.addColorStop(1, 'rgba(255,100,30,0)');
            g.globalCompositeOperation = 'lighter';
            g.fillStyle = gl;
            g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
            g.globalCompositeOperation = 'source-over';
          }
        }
      }
      // Chubut: the plane and its water over the cinematic opening (its fire is the shader's)
      if (cine && stage) faded(g, decor, (c) => drawInteraction('chubut', c, W, H, stage!));

      if (st.veil > 0.001) {
        const rgb = haze ? HAZE : SMOKE;
        const v = st.veil;
        // a flat fill that closes completely at v = 1, under two drifting layers of soft noise
        g.fillStyle = `rgba(${rgb},${Math.pow(Math.min(1, Math.max(0, (v - 0.25) / 0.75)), 1.4)})`;
        g.fillRect(0, 0, W, H);
        const tex = veilTexture(haze ? '250,252,253' : '78,70,64');
        const tex2 = veilTexture(rgb);
        g.imageSmoothingEnabled = true;
        // the smoke keeps rolling upwards: rising at the end of a region, clearing at the start of the next
        const run = reduced ? 0 : inbound ? 2 - v : v;
        // one stretched sheet per layer (no tiling, so no seams), taller than the screen to roll
        for (const [t, a, sp, dx] of [[tex2, Math.min(1, v * 1.6), 0.3, 0.05], [tex, Math.min(0.8, v * 1.3) * (1 - 0.5 * v), 0.45, 0.2]] as [HTMLCanvasElement, number, number, number][]) {
          g.globalAlpha = a;
          g.drawImage(t, -W * dx, -run * H * sp, W * (1 + 2 * dx), H * (1 + 2 * sp) + 2);
        }
        g.globalAlpha = 1;
        // smoke between regions (not the haze from the clouds): embers glow low under it, as light from
        // a fire out of frame, faint and only along the bottom edge
        if (!haze) {
          const e = 0.2 * Math.min(1, v * 1.5);
          const glow = g.createLinearGradient(0, H, 0, H * 0.55);
          glow.addColorStop(0, `rgba(255,96,24,${e})`);
          glow.addColorStop(0.45, `rgba(196,48,12,${e * 0.35})`);
          glow.addColorStop(1, 'rgba(196,48,12,0)');
          g.globalCompositeOperation = 'screen';
          g.fillStyle = glow;
          g.fillRect(0, H * 0.55, W, H * 0.45);
          g.globalCompositeOperation = 'source-over';
        }
      }
      // the interaction runs on its own clock: keep drawing while it moves, and only then
      if (live && show && !loop) loop = requestAnimationFrame(paint);
    };
    const unsub = subscribe(onFrame);
    // the smoke's opening mask reads its noise back once: done while idle, not in the middle of a scroll
    idle(() => openMask(1));
    return () => { unsub(); cancelAnimationFrame(loop); publish(null); };
  }, []);

  return (
    <div className={styles.wrap}>
      <canvas ref={cv} className={styles.canvas} data-tour-canvas="land" aria-hidden="true" />
      {TOUR_EVENTS.map((ev, i) => (
        <div key={ev.id} ref={(el) => { cards.current[i] = el; }} className={`${styles.card} ${styles[ev.id] || ''}`} aria-hidden="true">
          <p className={styles.kicker}>
            <span>{i + 1} de {TOUR_EVENTS.length}</span> {ev.when}
          </p>
          <p className={styles.region}>{ev.region}</p>
          {!ev.title.includes(ev.region) && <p className={styles.sub}>{ev.title}</p>}
        </div>
      ))}
      <p ref={note} className={styles.note} />
    </div>
  );
}
