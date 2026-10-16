/*
 * Canvas map for the fire chapters. Ported from legacy/app.js (map section): same projection, camera
 * with eased fly-to, weekly foci coloured by age, province outlines and the pulsing origin marker.
 *
 * Differences from legacy:
 *  - one class with an explicit lifecycle (no globals); the base layer is cached off-screen;
 *  - a single rAF scheduler: the base layer is redrawn only when the week, the camera or the size
 *    change; the marker pulse only costs a drawImage + 3 arcs and stops when off-screen/hidden/reduced motion;
 *  - two modes: the fire chapters (weekly foci) and the national grid (one year, two-year comparison or the
 *    2012-2026 accumulation) with hover and hit testing. Hover only repaints the cached base plus one outline.
 */
import type { Foci } from './data';
import type { GridView } from './explore';

const LON0 = -73.8, LON1 = -53.4, LAT0 = -55.3, LAT1 = -21.6;
const K = Math.cos((38 * Math.PI) / 180);
const COUNTRY: number[] = [LON0, LON1, LAT0, LAT1];
const FLY_MS = 800;

export type MapScene = { provs: string[]; marker: [number, number] | null; foci: Foci | null };

/** Result of a hit test on the grid map: province under the pointer and the 0.25 degree cell it falls in. */
export type Hit = { prov: string | null; key: string; clon: number; clat: number; value: number | { a: number; b: number } | null };

type Frame = { s: number; ox: number; oy: number; w: number; h: number };
type PathItem = { name: string; p: Path2D };

export class FireMap {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private reduced: boolean;
  private dpr = 1;
  private F: Frame | null = null;
  private geo: any[] = [];
  private paths: PathItem[] = [];
  private view: number[] = COUNTRY.slice();
  private fly: { from: number[]; to: number[]; t0: number } | null = null;
  private target = '';
  private scene: MapScene = { provs: [], marker: null, foci: null };
  private gridMode = false;
  private grid: GridView | null = null;
  private gridHi: string[] = [];
  private hover: string | null = null;
  private week = 0;
  private inset = { top: 0, bottom: 0 };
  private raf = 0;
  private geomDirty = true;
  private baseDirty = true;
  private visible = true;
  private dead = false;

  constructor(cv: HTMLCanvasElement, reduced: boolean) {
    this.cv = cv;
    this.ctx = cv.getContext('2d')!;
    this.base = document.createElement('canvas');
    this.bctx = this.base.getContext('2d')!;
    this.reduced = reduced;
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy() {
    this.dead = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  setReduced(r: boolean) { this.reduced = r; this.schedule(); }
  setVisible(v: boolean) { this.visible = v; if (v) this.schedule(); }

  setGeo(features: any[]) {
    this.geo = features;
    this.geomDirty = this.baseDirty = true;
    this.retarget();
    this.schedule();
  }

  setScene(scene: MapScene) {
    this.gridMode = false;
    this.grid = null;
    this.hover = null;
    this.scene = scene;
    this.baseDirty = true;
    this.retarget();
    this.schedule();
  }

  /** Grid mode: draws `view` (null while it loads) and outlines the provinces in `hi`; the camera shows the whole country. */
  setGrid(view: GridView | null, hi: string[]) {
    this.gridMode = true;
    this.grid = view;
    this.gridHi = hi;
    if (this.scene.provs.length || this.scene.marker || this.scene.foci) this.scene = { provs: [], marker: null, foci: null };
    this.baseDirty = true;
    this.retarget();
    this.schedule();
  }

  /** Province under the pointer gets a light outline; repaints the overlay only, not the base layer. */
  setHover(name: string | null) {
    if (name === this.hover) return;
    this.hover = name;
    this.schedule();
  }

  /** Hit test at CSS pixel (x, y) of the canvas. Grid mode only. */
  hit(x: number, y: number): Hit | null {
    const F = this.F;
    if (!F || !this.gridMode) return null;
    const step = this.grid ? this.grid.step : 0.25;
    const lon = LON0 + (x - F.ox) / (K * F.s), lat = LAT1 - (y - F.oy) / F.s;
    let prov: string | null = null;
    this.bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (let i = 0; i < this.paths.length; i++) {
      if (this.bctx.isPointInPath(this.paths[i].p, x * this.dpr, y * this.dpr)) { prov = this.paths[i].name; break; }
    }
    const gx = Math.floor(lon / step), gy = Math.floor(lat / step);
    const key = gx + ',' + gy;
    const value = this.grid ? this.grid.index.get(key) ?? null : null;
    return { prov, key, clon: gx * step + step / 2, clat: gy * step + step / 2, value };
  }

  /** Week shown (1-based count of weeks drawn). Only redraws the base layer when it changes. */
  setWeek(w: number) {
    if (w === this.week) return;
    this.week = w;
    this.baseDirty = true;
    this.schedule();
  }

  /** Space covered by overlays (px); the camera fits the view into the remaining area. */
  setInset(top: number, bottom: number) {
    if (top === this.inset.top && bottom === this.inset.bottom) return;
    this.inset = { top, bottom };
    this.geomDirty = this.baseDirty = true;
    this.schedule();
  }

  /** Reads the canvas size and devicePixelRatio; call on resize. */
  resize() {
    const r = this.cv.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    const w = Math.max(10, r.width), h = Math.max(10, r.height);
    this.cv.width = this.base.width = Math.round(w * this.dpr);
    this.cv.height = this.base.height = Math.round(h * this.dpr);
    this.F = { s: 1, ox: 0, oy: 0, w, h };
    this.geomDirty = this.baseDirty = true;
    this.schedule();
  }

  /* ---------- camera ---------- */

  private provBox(names: string[]): number[] {
    const b = [180, -180, 90, -90];
    this.geo.forEach((f) => {
      if (names.indexOf(f.properties.name) < 0) return;
      const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach((poly: number[][][]) => {
        poly[0].forEach((pt) => {
          b[0] = Math.min(b[0], pt[0]); b[1] = Math.max(b[1], pt[0]);
          b[2] = Math.min(b[2], pt[1]); b[3] = Math.max(b[3], pt[1]);
        });
      });
    });
    if (b[0] > b[1]) return COUNTRY.slice();
    const mx = (b[1] - b[0]) * 0.12 + 0.2, my = (b[3] - b[2]) * 0.12 + 0.2;
    return [b[0] - mx, b[1] + mx, b[2] - my, b[3] + my];
  }

  /** Flies to the provinces of the scene (or the whole country) once the geometry is known. */
  private retarget() {
    const names = this.scene.provs;
    const key = names.join('|') + (this.geo.length ? '#geo' : '');
    if (key === this.target) return;
    this.target = key;
    const box = names.length && this.geo.length ? this.provBox(names) : COUNTRY.slice();
    if (this.reduced || !this.F) {
      this.view = box;
      this.fly = null;
      this.geomDirty = this.baseDirty = true;
    } else {
      this.fly = { from: this.view.slice(), to: box, t0: performance.now() };
    }
  }

  private fit() {
    const F = this.F!, view = this.view;
    const W = (view[1] - view[0]) * K, H = view[3] - view[2];
    const top = this.inset.top, h = Math.max(10, F.h - top - this.inset.bottom);
    const s = Math.min(F.w / W, h / H) * 0.96;
    F.s = s;
    F.ox = (F.w - W * s) / 2 - (view[0] - LON0) * K * s;
    F.oy = top + (h - H * s) / 2 - (LAT1 - view[3]) * s;
  }

  private project(lon: number, lat: number): [number, number] {
    const F = this.F!;
    return [F.ox + (lon - LON0) * K * F.s, F.oy + (LAT1 - lat) * F.s];
  }

  private buildPaths() {
    this.paths = this.geo.map((f) => {
      const p = new Path2D(), g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach((poly: number[][][]) => {
        poly.forEach((ring) => {
          ring.forEach((pt, i) => {
            const q = this.project(pt[0], pt[1]);
            if (i) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]);
          });
          p.closePath();
        });
      });
      return { name: f.properties.name, p };
    });
  }

  /* ---------- drawing ---------- */

  private drawGrid() {
    const F = this.F!, b = this.bctx, hi = this.gridHi, G = this.grid;
    b.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    b.clearRect(0, 0, F.w, F.h);
    this.paths.forEach((o) => { b.fillStyle = hi.indexOf(o.name) >= 0 ? '#2b1a12' : '#1a120e'; b.fill(o.p); });
    if (G) {
      const cw = G.step * K * F.s + 0.7, ch = G.step * F.s + 0.7;
      G.cells.forEach((c) => {
        const q = this.project(c[0], c[1]);
        b.fillStyle = G.color(c[2]);
        b.fillRect(q[0] - cw / 2, q[1] - ch / 2, cw, ch);
      });
    }
    b.lineJoin = 'round';
    this.paths.forEach((o) => {
      if (hi.indexOf(o.name) < 0) { b.strokeStyle = 'rgba(120,84,66,.55)'; b.lineWidth = 0.7; b.stroke(o.p); }
    });
    this.paths.forEach((o) => {
      if (hi.indexOf(o.name) >= 0) {
        b.strokeStyle = '#ff9a3c'; b.lineWidth = 2; b.shadowColor = 'rgba(255,140,40,.8)'; b.shadowBlur = 10;
        b.stroke(o.p); b.shadowBlur = 0;
      }
    });
  }

  private drawBase() {
    if (this.gridMode) { this.drawGrid(); return; }
    const F = this.F!, b = this.bctx, hi = this.scene.provs;
    b.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    b.clearRect(0, 0, F.w, F.h);
    this.paths.forEach((o) => {
      b.fillStyle = hi.indexOf(o.name) >= 0 ? 'rgba(255,176,58,.07)' : 'rgba(255,255,255,.035)';
      b.fill(o.p);
    });
    const E = this.scene.foci;
    if (E && this.week > 0) {
      const wk = this.week, sx = Math.max(E.step * K * F.s, 2.2), sy = Math.max(E.step * F.s, 2.2);
      E.cells.forEach((c) => {
        if (c[2] >= wk) return;
        const age = wk - 1 - c[2], q = this.project(c[0], c[1]);
        b.fillStyle = age < 1 ? 'rgba(255,226,122,.95)' : age < 4 ? 'rgba(255,122,26,.85)' : 'rgba(179,48,15,.7)';
        b.fillRect(q[0] - sx / 2, q[1] - sy / 2, sx, sy);
      });
    }
    b.lineJoin = 'round';
    // 1. Neighboring provinces: clear and defined boundaries
    this.paths.forEach((o) => {
      if (hi.indexOf(o.name) < 0) {
        b.strokeStyle = 'rgba(230, 215, 195, 0.35)';
        b.lineWidth = 1.0;
        b.stroke(o.p);
      }
    });
    // 2. Active fire province: vivid fire frame with neon ember glow
    this.paths.forEach((o) => {
      if (hi.indexOf(o.name) >= 0) {
        b.shadowColor = 'rgba(255, 120, 20, 0.9)';
        b.shadowBlur = 14;
        b.strokeStyle = '#ffa733';
        b.lineWidth = 2.4;
        b.stroke(o.p);
        b.shadowBlur = 0;
      }
    });
  }

  private paint(t: number) {
    const F = this.F;
    if (!F) return;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.drawImage(this.base, 0, 0);
    if (this.gridMode && this.hover && this.gridHi.indexOf(this.hover) < 0) {
      const o = this.paths.find((x) => x.name === this.hover);
      if (o) { ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 1.5; ctx.stroke(o.p); }
    }
    const m = this.scene.marker;
    if (m) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const q = this.project(m[0], m[1]), ph = this.reduced ? 0 : (t % 1600) / 1600;
      ctx.beginPath(); ctx.arc(q[0], q[1], 6 + ph * 26, 0, 7); ctx.strokeStyle = 'rgba(255,200,90,' + (0.8 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, 7); ctx.fillStyle = '#fff2c4'; ctx.fill();
      ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, 7); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  /* ---------- scheduler: one rAF ---------- */

  private onVisibility = () => { if (!document.hidden) this.schedule(); };

  private schedule() {
    if (this.dead || this.raf) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (this.dead || !this.F) return;
    if (this.fly) {
      const f = this.fly, t = Math.min(1, Math.max(0, now - f.t0) / FLY_MS), e = t * t * (3 - 2 * t);
      this.view = f.from.map((v, i) => v + (f.to[i] - v) * e);
      if (t >= 1) this.fly = null;
      this.geomDirty = this.baseDirty = true;
    }
    if (this.geomDirty) { this.fit(); this.buildPaths(); this.geomDirty = false; }
    if (this.baseDirty) { this.drawBase(); this.baseDirty = false; }
    this.paint(now);
    const pulsing = !!this.scene.marker && !this.reduced && this.visible && !document.hidden;
    if (this.fly || pulsing) this.schedule();
  };
}
