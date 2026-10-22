'use client';
import { useEffect, useRef } from 'react';
import { LANDSCAPES, LAND_NOTES, buildLand, veilTexture, type Land } from '../lib/landscapes';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe, type Frame } from '../lib/scrollDriver';
import styles from './Landscape.module.css';

/*
 * The establishing shot of each region and the veil between regions, on one canvas over the map.
 *  - land: the region's illustrated landscape (lib/landscapes.ts), with a slow push-in and parallax
 *    while its shot runs (landT) and a lift onto the map at its end. Its fire grows with landT.
 *  - veil: haze (into the first region, coming down from the clouds) or smoke (between regions)
 *    that covers the screen while the camera travels.
 *  - card: the chapter's title card (region, date, title), placed differently in each landscape.
 * Everything follows the scroll state; the canvas is hidden and idle when there is nothing to show.
 */
const HAZE = '233,238,243';
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

    const onFrame = ({ st, vw, vh, reduced }: Frame) => {
      if (vw !== W || vh !== H) {
        W = vw; H = vh;
        // soft painted light needs no full resolution: about 3/4 of a CSS px, upscaled by the browser
        r = Math.min(window.devicePixelRatio || 1, 1) * (W < 1024 ? 0.6 : 0.75);
        res = r;
        canvas.width = Math.round(W * r);
        canvas.height = Math.round(H * r);
        lands = new Map();
        ahead = '';
        key = '';
      }
      const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
      const id = ev && LANDSCAPES[ev.id] ? ev.id : '';
      // the veil clears at the start of a region and rises at its end; haze on the way down from the
      // clouds into the first region, smoke between regions
      const inbound = st.chapter === 8 || (st.chapter >= 0 && st.chapter <= 5 && st.chapterT < 0.5);
      const haze = st.chapter === -1 || (st.chapter === 0 && inbound);

      cards.current.forEach((c, i) => {
        if (!c) return;
        const o = i === st.chapter ? st.card : 0;
        c.style.opacity = o.toFixed(3);
        c.style.visibility = o > 0.001 ? 'visible' : 'hidden';
        c.style.setProperty('--k', o.toFixed(3));
      });
      if (note.current) {
        const o = id ? st.land * (1 - st.veil) : 0;
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

      const show = (id !== '' && st.land > 0.001) || st.veil > 0.001;
      const k = [id, st.land.toFixed(3), st.landT.toFixed(3), st.veil.toFixed(3), haze, inbound, W, H, reduced].join('|');
      if (k === key) return false;
      key = k;
      if (!show) {
        if (shown) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); shown = false; }
        canvas.style.visibility = 'hidden';
        return false;
      }
      canvas.style.visibility = 'visible';
      shown = true;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.setTransform(r, 0, 0, r, 0, 0);

      if (id && st.land > 0.001) {
        const { layers, grade } = landOf(id);
        const kT = st.landT;
        // a slow push into the landscape while its shot runs, then the lift onto the map
        const push = reduced ? 0 : 0.05 * kT + 0.12 * (1 - st.land);
        const ax = W * 0.5, ay = H * 0.62;
        g.globalAlpha = st.land;
        for (const L of layers) {
          const s = 1 + push * (0.3 + L.depth);
          const dy = reduced ? 0 : -L.depth * H * 0.03 * kT;
          g.save();
          g.translate(ax, ay + dy);
          g.scale(s, s);
          g.translate(-ax, -ay);
          // the vine rows rise into view from below as the shot begins
          const lift = L.rise && !reduced ? (1 - Math.min(1, kT * 1.8)) * H * 0.4 : 0;
          g.drawImage(L.c, 0, lift, W, H);
          g.globalAlpha = st.land;
          L.after?.(g, W, H, kT);
          g.globalAlpha = st.land;
          g.restore();
        }
        g.save();
        g.globalAlpha = st.land;
        grade(g, W, H, kT);
        g.restore();
        g.globalAlpha = 1;
      }

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
      }
      return false;
    };
    return subscribe(onFrame);
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
