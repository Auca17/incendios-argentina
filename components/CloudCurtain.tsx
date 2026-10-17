'use client';
import { useEffect, useRef } from 'react';
import { subscribe, type Frame } from '../lib/scrollDriver';
import { DESKTOP, podRight } from '../lib/tourLayout';
import styles from './CloudCurtain.module.css';

/*
 * Hand-drawn cumulus clouds on a canvas (no images): slate base, ivory body, lit domes.
 * Two layers:
 *  - curtain: a jittered grid that covers the whole viewport. It parts to the right while `open`
 *    goes 0 -> 1 (right-hand clouds first) and comes back from both sides while `close` goes 0 -> 1,
 *    over a flat fill that guarantees full, opaque coverage in the centre once closed.
 *  - left bank (desktop only): a column of clouds behind the reading pod; it never enters the map band.
 * Positions are a pure function of (open, close, viewport): no time, no randomness at draw time
 * (the layout comes from a seeded generator). Each cloud is pre-rendered once into a sprite and the
 * canvas is redrawn only when that state changes.
 */
type Lobe = [number, number, number]; // dx, dy, r (relative to R)
type Cloud = { hx: number; hy: number; R: number; sprite: HTMLCanvasElement; edge: boolean };

const SKY0 = '#1d3550';
const SKY1 = '#5f7f9e';
const SHADE = '#8a99ab';
const BODY = '#e6e2da';
const BODY_LIT = '#f6f3ed';
const DOME = '#fdfbf7';
const FILL0 = '#dcdfe2';
const FILL1 = '#c4ccd5';

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE: Lobe[] = [[-0.75, 0.3, 0.55], [0, 0.36, 0.62], [0.75, 0.3, 0.55]];
const BODYL: Lobe[] = [[-0.98, 0.1, 0.48], [-0.45, -0.04, 0.68], [0.2, -0.1, 0.74], [0.82, 0.06, 0.56]];
const DOMES: Lobe[] = [[-0.36, -0.42, 0.5], [0.18, -0.55, 0.58], [0.62, -0.3, 0.45]];

function makeSprite(R: number, dpr: number, rnd: () => number): HTMLCanvasElement {
  const W = 2.9 * R, H = 2.0 * R, cx = 1.45 * R, cy = 1.1 * R;
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * dpr);
  c.height = Math.ceil(H * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const j = (l: Lobe): Lobe => [l[0] + (rnd() - 0.5) * 0.12, l[1] + (rnd() - 0.5) * 0.1, l[2] * (0.92 + rnd() * 0.16)];
  const lobes = [...BASE.map(j), ...BODYL.map(j), ...DOMES.map(j)];
  // one silhouette: the union of all lobes, shaded top to bottom (lit domes, ivory body, slate base)
  const shape = new Path2D();
  lobes.forEach(([dx, dy, r]) => { shape.moveTo(cx + dx * R + r * R, cy + dy * R); shape.arc(cx + dx * R, cy + dy * R, r * R, 0, Math.PI * 2); });
  const body = g.createLinearGradient(0, cy - 1.15 * R, 0, cy + 0.62 * R);
  body.addColorStop(0, DOME);
  body.addColorStop(0.45, BODY_LIT);
  body.addColorStop(0.72, BODY);
  body.addColorStop(1, SHADE);
  g.fillStyle = body;
  g.fill(shape);
  // soft volume inside the silhouette: lit tops of the domes, a cool shade under the body
  g.save();
  g.clip(shape);
  lobes.forEach(([dx, dy, r], i) => {
    const x = cx + dx * R, y = cy + dy * R, rr = r * R;
    const lit = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 0, x - rr * 0.3, y - rr * 0.4, rr * 0.9);
    lit.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    lit.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = lit;
    g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
    if (i >= BASE.length) {
      const sh = g.createRadialGradient(x, y + rr * 0.9, 0, x, y + rr * 0.9, rr * 0.8);
      sh.addColorStop(0, 'rgba(125, 142, 162, 0.35)');
      sh.addColorStop(1, 'rgba(125, 142, 162, 0)');
      g.fillStyle = sh;
      g.fillRect(x - rr, y, 2 * rr, 2 * rr);
    }
  });
  g.restore();
  // flat base
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(0, cy + 0.62 * R, W, H);
  return c;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const seg = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

export default function CloudCurtain() {
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0, dpr = 1;
    let curtain: Cloud[] = [];
    let bank: Cloud[] = [];
    let lastKey = '';

    const build = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, w < DESKTOP ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const rnd = rng(20120120);
      const R = Math.max(w, h) * (w < DESKTOP ? 0.2 : 0.16);
      const cols = Math.ceil(w / (R * 1.7)) + 1;
      const rows = Math.ceil(h / (R * 1.05)) + 1;
      curtain = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const hx = ((c + (r % 2) * 0.5) / (cols - 1)) * w + (rnd() - 0.5) * R * 0.4;
          const hy = (r / (rows - 1)) * h + (rnd() - 0.5) * R * 0.3;
          const rr = R * (0.85 + rnd() * 0.3);
          const edge = r === 0 || r === rows - 1 || hx < R * 0.9 || hx > w - R * 0.9;
          curtain.push({ hx, hy, R: rr, sprite: makeSprite(rr, dpr, rnd), edge });
        }
      }
      bank = [];
      if (w >= DESKTOP) {
        const right = podRight(w);
        const Rb = right * 0.36;
        const n = Math.ceil(h / (Rb * 0.95)) + 1;
        for (let i = 0; i < n; i++) {
          const hx = right * (0.22 + (i % 2) * 0.3) + (rnd() - 0.5) * Rb * 0.2;
          const hy = (i / (n - 1)) * h + (rnd() - 0.5) * Rb * 0.2;
          // keep the sprite's right edge inside the reading column plus one gutter
          const R2 = Math.min(Rb * (0.85 + rnd() * 0.25), (right + 24 - hx) / 1.45);
          bank.push({ hx, hy, R: R2, sprite: makeSprite(R2, dpr, rnd), edge: true });
        }
      }
      lastKey = '';
    };

    const put = (cl: Cloud, x: number, y: number) => {
      ctx.drawImage(cl.sprite, x - 1.45 * cl.R, y - 1.1 * cl.R, 2.9 * cl.R, 2.0 * cl.R);
    };

    const draw = (open: number, close: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sky = 1 - seg(open, 0.25, 0.85);
      if (sky > 0) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, SKY0);
        g.addColorStop(1, SKY1);
        ctx.globalAlpha = sky;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
      bank.forEach((cl) => put(cl, cl.hx, cl.hy));
      if (close > 0) {
        const fill = seg(close, 0.45, 0.9);
        if (fill > 0) {
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, FILL0);
          g.addColorStop(1, FILL1);
          ctx.globalAlpha = fill;
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        }
        const k = 1 - ease(close);
        curtain.forEach((cl) => {
          if (fill >= 1 && !cl.edge) return; // closed: flat centre, volume only at the edges
          const dir = cl.hx < w / 2 ? -1 : 1;
          put(cl, cl.hx + dir * k * (w * 0.8), cl.hy);
        });
        return;
      }
      if (open >= 1) return;
      curtain.forEach((cl) => {
        const delay = 0.5 * (1 - cl.hx / w); // right-hand clouds leave first
        const m = ease(seg(open, delay * 0.9, delay * 0.9 + 0.5));
        put(cl, cl.hx + m * (w - cl.hx + cl.R * 1.6), cl.hy);
      });
    };

    const onFrame = (f: Frame) => {
      if (f.vw !== w || f.vh !== h) build();
      const key = f.st.open.toFixed(4) + '|' + f.st.close.toFixed(4);
      if (key === lastKey) return false;
      lastKey = key;
      draw(f.st.open, f.st.close);
      return false;
    };

    build();
    return subscribe(onFrame);
  }, []);

  return (
    <div className={styles.curtain} aria-hidden="true">
      <canvas ref={cv} className={styles.canvas} data-tour-canvas="clouds" />
    </div>
  );
}
