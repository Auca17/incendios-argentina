'use client';
import { useEffect, useRef } from 'react';
import { loadFoci, loadGrid, loadProvincias, type Foci } from '../lib/data';
import { getExplore, setExplore, subscribeExplore } from '../lib/exploreState';
import { fociWeek } from '../lib/fire';
import { MORE_PROVINCES, TOUR_EVENTS } from '../lib/tour';
import { request, subscribe, type Frame } from '../lib/scrollDriver';
import { mapRect } from '../lib/tourLayout';
import styles from './TourMap.module.css';

/*
 * Map of the tour, drawn on one canvas. Everything it shows comes from the scroll state:
 *  - South America on Natural Earth II shaded relief (public domain; its tints follow climate, arid
 *    west and humid east) with the neighbouring countries outlined thin and faint (Natural Earth 1:50m);
 *  - Argentina's provinces outlined in black, faded in when Argentina is revealed;
 *  - the active fire's provinces outlined in red-orange, its weekly foci lit up to the current week;
 *  - visited fires keep a dim outline and their real accumulated foci as embers.
 *    No province is ever filled as burnt: the foci are the only marks. Each focus cell has a dark rim,
 *    so it keeps at least 3:1 against whatever terrain is around it.
 * The camera follows a spring (tension 0.052, friction 0.78) whose target depends only on the
 * chapter (-2 South America, -1 Argentina, 0..5 a fire, 6 all Argentina) and snaps onto the target
 * when it settles, so a scroll position always ends on the same frame.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const K = Math.cos((38 * Math.PI) / 180);
const ARGENTINA: Box = [-74.2, -52.8, -55.4, -21.6];
const CONTINENT: Box = [-82, -34, -56, 13];
/** Camera far away while the clouds still cover the screen; it flies in as they open. */
const FAR: Box = [-118, -2, -76, 34];
const RELIEF: Box = [-94, -24, -63, 14]; // extent of public/map/sudamerica-atlas.webp
/** Detections in one 0.05-degree cell in one week: p99 of the six fires is 58, the maximum 234. */
const WEEK_REF = 60;
/** Most foci in one 0.25-degree cell in any year (2022): the explore colour scale is fixed to it. */
export const GRID_MAX = 6105;
const TENSION = 0.052;
const FRICTION = 0.78;

type Box = [number, number, number, number]; // minLon, maxLon, minLat, maxLat
type Prov = { name: string; path: Path2D; box: Box };
type Proj = (lon: number, lat: number) => [number, number];
/** A cell: longitude, latitude and its number of detections. */
type Pt = [number, number, number];

export const MAP_COLORS = {
  // atlas: dark sea with the coast lifted out of it, land in charcoal / mineral brown / ash relief;
  // only the fire has colour
  sea: '#07090c',
  seaClear: 'rgba(7, 9, 12, 0)',
  coast: 'rgba(214, 190, 156, 0.32)',
  neighbour: 'rgba(214, 190, 156, 0.14)',
  province: '226, 206, 178',
  visited: 'rgba(255, 120, 60, 0.4)',
  active: '#ff6a2a',
  activeHalo: 'rgba(255, 106, 42, 0.22)',
  // focus cores (each keeps >= 3:1 against the dark shadow drawn under it; scripts/contrast.mjs)
  hot: '#fff1c4',
  ember: '#ffb24a',
  deep: '#ff6a2a',
  old: '#e8452a',
  visitedFocus: '#d63c22',
  // year grid of the explore section, low to high (fixed scale for every year)
  grid: ['#e8452a', '#ff6a2a', '#ffa040', '#ffe08a'],
  selected: '#ffffff',
  shadow: 'rgba(6, 3, 1, 0.78)',
};
const C = MAP_COLORS;

export default function TourMap() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext('2d')!;
    let provs: Prov[] = [];
    let neighbours: Path2D | null = null;
    let relief: HTMLImageElement | null = null;
    let land: Path2D | null = null; // neighbours + Argentina, to clip the relief to the land
    const foci = new Map<string, Foci>();
    let live = true;

    loadProvincias().then((fc) => {
      if (!live) return;
      provs = fc.features.map((f: any) => toProv(f));
      request();
    }, () => {});
    fetch(BASE_PATH + '/data/sudamerica.json').then((r) => r.json()).then((fc) => {
      if (!live) return;
      const p = new Path2D();
      fc.features.forEach((f: any) => addGeometry(p, f.geometry));
      neighbours = p;
      land = null; // rebuilt with the provinces
      lastKey = baseKey = '';
      request();
    }, () => {});
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (live) { relief = img; lastKey = baseKey = ''; request(); } };
    img.src = BASE_PATH + '/map/sudamerica-atlas.webp';
    TOUR_EVENTS.forEach((ev) => loadFoci(ev.id).then((E) => { if (live) { foci.set(ev.id, E); request(); prewarm(ev.id, E); } }, () => {}));
    const grids = new Map<number, { step: number; cells: [number, number, number][] }>();
    const unsubExplore = subscribeExplore(() => request());
    let chapterNow = -2;
    let moreNow = -1;
    let allYears: [number, number, number][] | null = null; // foci 2012-2026 per 0.25-degree cell
    let allMax = 1;
    const loadAllYears = () => {
      if (allYears) return;
      allYears = [];
      const years = Array.from({ length: 15 }, (_, i) => 2012 + i);
      Promise.all(years.map((y) => loadGrid(y))).then((gs) => {
        if (!live) return;
        const acc = new Map<string, [number, number, number]>();
        gs.forEach((g: any) => g.cells.forEach(([lon, lat, n]: number[]) => {
          const k = lon + ',' + lat;
          const c = acc.get(k);
          if (c) c[2] += n; else acc.set(k, [lon, lat, n]);
        }));
        allYears = [...acc.values()];
        allYears.forEach((c) => { if (c[2] > allMax) allMax = c[2]; });
        baseKey = lastKey = '';
        request();
      }, () => { allYears = null; });
    };
    let view = { scale: 1, ox: 0, oy: 0 };
    // explore section: a click on a province selects it (the panel offers the same choice as a list)
    const onClick = (e: MouseEvent) => {
      if (chapterNow !== 7 || !provs.length) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left - view.ox) / view.scale, y = (e.clientY - r.top - view.oy) / view.scale;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const hit = provs.find((p) => ctx.isPointInPath(p.path, x, y));
      if (hit) setExplore({ prov: getExplore().prov === hit.name ? null : hit.name });
    };
    canvas.addEventListener('click', onClick);

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      w = box.clientWidth;
      h = box.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, w < 1024 ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      lastKey = '';
      request();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    // camera: box (4) + target rect left/right in px (2)
    let cam: number[] | null = null;
    const vel = [0, 0, 0, 0, 0, 0];
    let lastKey = '';

    const boxFor = (chapter: number, open: number, more: number): Box => {
      if (chapter === 8 && more >= 0 && provs.length) {
        const p = provs.find((x) => x.name === MORE_PROVINCES[more]);
        if (p) {
          // a wide shot around the province: its neighbours stay in view for comparison
          const b = p.box, cx = (b[0] + b[1]) / 2, cy = (b[2] + b[3]) / 2;
          const hx = Math.max((b[1] - b[0]) * 1.1, 4.5), hy = Math.max((b[3] - b[2]) * 1.1, 4.5);
          return [cx - hx, cx + hx, cy - hy, cy + hy];
        }
      }
      if (chapter === -2) {
        const k = open * open * (3 - 2 * open);
        return FAR.map((v, i) => v + (CONTINENT[i] - v) * k) as Box;
      }
      if (chapter < 0 || chapter > 5 || !provs.length) return ARGENTINA;
      const names: string[] = TOUR_EVENTS[chapter].provs;
      const b: Box = [180, -180, 90, -90];
      provs.forEach((p) => {
        if (!names.includes(p.name)) return;
        b[0] = Math.min(b[0], p.box[0]); b[1] = Math.max(b[1], p.box[1]);
        b[2] = Math.min(b[2], p.box[2]); b[3] = Math.max(b[3], p.box[3]);
      });
      const px = Math.max((b[1] - b[0]) * 0.35, 1.2), py = Math.max((b[3] - b[2]) * 0.35, 1.2);
      return [b[0] - px, b[1] + px, b[2] - py, b[3] + py];
    };

    const onFrame = (f: Frame): boolean => {
      if (!w || !h) return false;
      const { st } = f;
      const [rl, rr] = mapRect(w, st.chapter);
      const target = [...boxFor(st.chapter, st.open, st.more), rl, rr];
      moreNow = st.more;
      if (!cam || f.reduced) cam = target.slice();
      let moving = false;
      for (let i = 0; i < 6; i++) {
        vel[i] = (vel[i] + (target[i] - cam[i]) * TENSION) * FRICTION;
        cam[i] += vel[i];
        const eps = i < 4 ? 0.01 : 1; // about a third of a pixel: the snap is invisible
        if (Math.abs(target[i] - cam[i]) < eps && Math.abs(vel[i]) < eps) { cam[i] = target[i]; vel[i] = 0; } else moving = true;
      }

      const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
      const E = ev ? foci.get(ev.id) : undefined;
      const week = E ? fociWeek(E, st.chapterT) : 0;
      chapterNow = st.chapter;
      canvas.style.cursor = st.chapter === 7 ? 'pointer' : '';
      const ex = getExplore();
      if (st.chapter === 7 && !grids.has(ex.year)) {
        grids.set(ex.year, { step: 0.25, cells: [] }); // placeholder until loaded
        loadGrid(ex.year).then((g) => { if (live) { grids.set(ex.year, g); baseKey = lastKey = ''; request(); } }, () => {});
      }
      if (st.chapter === 8) loadAllYears();
      const exKey = st.chapter === 7 ? ex.year + ':' + (ex.prov || '') : st.chapter === 8 ? 'more:' + st.more + ':' + (allYears?.length || 0) : '';
      const key = [cam.map((v) => v.toFixed(4)).join(','), st.chapter, week, st.borders.toFixed(3), provs.length, foci.size, w, h, exKey].join('|');
      if (key !== lastKey) {
        lastKey = key;
        draw(st.chapter, week, st.borders);
      }
      return moving;
    };

    /*
     * Layers, so a scroll frame inside a fire draws little: `base` holds relief, borders and the
     * visited fires (rebuilt when the camera, the chapter or the borders change); `ash` holds the
     * active fire's weeks older than 8 (rebuilt when that week changes); only the 8 recent weeks
     * are drawn each frame. Same scroll position, same layers, same pixels.
     */
    const base = document.createElement('canvas');
    const bctx = base.getContext('2d')!;
    let baseKey = '';
    const byWeek = new Map<string, Pt[][]>();
    /*
     * Plates: fire layers rendered once into an offscreen canvas in world coordinates (res px per
     * degree) and then only placed with the camera transform each frame. Drawing thousands of glowing
     * foci per frame would stall the camera; a plate costs one drawImage.
     */
    type Plate = { c: HTMLCanvasElement; x0: number; y0: number; res: number };
    const plates = new Map<string, Plate>();
    const plate = (key: string, box: Box, res: number, paint: (g: CanvasRenderingContext2D, proj: Proj) => void): Plate => {
      let pl = plates.get(key);
      if (pl) return pl;
      const x0 = box[0] * K, x1 = box[1] * K, y0 = -box[3], y1 = -box[2];
      const c = document.createElement('canvas');
      c.width = Math.ceil((x1 - x0) * res);
      c.height = Math.ceil((y1 - y0) * res);
      const g = c.getContext('2d')!;
      paint(g, (lon, lat) => [(lon * K - x0) * res, (-lat - y0) * res]);
      pl = { c, x0, y0, res };
      plates.set(key, pl);
      return pl;
    };
    const placePlate = (g: CanvasRenderingContext2D, world: (g: CanvasRenderingContext2D) => void, pl: Plate) => {
      world(g);
      g.imageSmoothingEnabled = true;
      g.drawImage(pl.c, pl.x0, pl.y0, pl.c.width / pl.res, pl.c.height / pl.res);
    };
    const fireBox = (E: Foci): Box => {
      const b: Box = [180, -180, 90, -90];
      for (const [lon, lat] of E.cells) {
        if (lon < b[0]) b[0] = lon; if (lon > b[1]) b[1] = lon;
        if (lat < b[2]) b[2] = lat; if (lat > b[3]) b[3] = lat;
      }
      return [b[0] - 0.6, b[1] + 0.6, b[2] - 0.6, b[3] + 0.6];
    };
    const FIRE_RES = 80; // px per degree: a 0.05-degree cell is 4 px
    const oldPlate = (id: string, E: Foci, c0: number) => plate(`old:${id}:${c0}`, fireBox(E), FIRE_RES, (g, pp) => {
      const W = weeksOf(id, E);
      for (let wk = c0; wk < c0 + CHUNK; wk++) focusCells(g, W[wk] || [], E.step, FIRE_RES, pp, C.old, 0.22, 1, 0.4);
    });
    const visitedPlate = (id: string, E: Foci) => plate('visited:' + id, fireBox(E), FIRE_RES, (g, pp) => {
      const W = weeksOf(id, E);
      for (let wk = 0; wk < E.weeks; wk++) focusCells(g, W[wk], E.step, FIRE_RES, pp, C.visitedFocus, 0.65, 1, 0.6);
    });
    // build every fire's plates ahead, one per idle slot, so scrolling never pays for them
    const warm: (() => void)[] = [];
    const idle = (fn: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 50));
    const pump = () => { const job = warm.shift(); if (job && live) { job(); idle(pump); } };
    const prewarm = (id: string, E: Foci) => {
      const start = warm.length === 0;
      for (let c0 = 0; c0 + CHUNK <= E.weeks; c0 += CHUNK) warm.push(() => oldPlate(id, E, c0));
      warm.push(() => visitedPlate(id, E));
      if (start) idle(pump);
    };
    const LIVE_WEEKS = 3; // the last weeks of the active fire are drawn live and bright
const CHUNK = 3; // older weeks are cached in plates of this many weeks
    const weeksOf = (id: string, E: Foci) => {
      let b = byWeek.get(id);
      if (!b) {
        b = Array.from({ length: E.weeks + 1 }, () => []);
        for (const [lon, lat, wk, n] of E.cells) b[wk].push([lon, lat, n]);
        byWeek.set(id, b);
      }
      return b;
    };

    const draw = (chapter: number, week: number, borders: number) => {
      const c = cam!;
      const rx = c[4], rw = Math.max(40, c[5] - c[4]);
      const spanX = (c[1] - c[0]) * K, spanY = c[3] - c[2];
      const scale = Math.min(rw / spanX, h / spanY) * 0.92;
      const ox = rx + (rw - spanX * scale) / 2 - c[0] * K * scale;
      const oy = (h - spanY * scale) / 2 + c[3] * scale;
      const px = 1 / scale; // one CSS pixel in world units
      const world = (g: CanvasRenderingContext2D) => g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      view = { scale, ox, oy };
      const proj: Proj = (lon, lat) => [ox + lon * K * scale, oy - lat * scale];
      if (base.width !== canvas.width || base.height !== canvas.height) {
        base.width = canvas.width;
        base.height = canvas.height;
        baseKey = '';
      }
      const camKey = c.map((v) => v.toFixed(4)).join(',') + '|' + w + 'x' + h;

      const ex = getExplore();
      const bk = [camKey, chapter, borders.toFixed(3), provs.length, foci.size, !!relief, !!neighbours, chapter === 7 ? ex.year + ':' + (ex.prov || '') + ':' + (grids.get(ex.year)?.cells.length || 0) : chapter === 8 ? moreNow + ':' + (allYears?.length || 0) : ''].join('|');
      if (bk !== baseKey) {
        baseKey = bk;
        drawBase(bctx, world, chapter, borders, px, scale, proj);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(base, 0, 0);
      if (!provs.length || chapter < 0 || chapter > 5) return;

      const a = TOUR_EVENTS[chapter];
      const Ea = foci.get(a.id);
      world(ctx);
      ctx.lineJoin = 'round';
      provs.forEach((p) => {
        if (!a.provs.includes(p.name)) return;
        ctx.strokeStyle = C.activeHalo;
        ctx.lineWidth = 4.5 * px;
        ctx.stroke(p.path);
        ctx.strokeStyle = C.active;
        ctx.lineWidth = 2 * px;
        ctx.stroke(p.path);
      });
      if (!Ea) return;
      const W = weeksOf(a.id, Ea);
      // older weeks come from fixed blocks of CHUNK weeks, each rendered once and kept; only the weeks
      // after the last whole block are drawn live. Same position, same blocks, same pixels.
      const ashW = Math.max(0, Math.floor((week - LIVE_WEEKS) / CHUNK) * CHUNK);
      for (let c0 = 0; c0 < ashW; c0 += CHUNK) placePlate(ctx, world, oldPlate(a.id, Ea, c0));
      for (let wk = ashW; wk < week; wk++) {
        const age = week - 1 - wk;
        const col = age < 1 ? C.hot : age < 3 ? C.ember : age < LIVE_WEEKS ? C.deep : C.old;
        focusCells(ctx, W[wk], Ea.step, scale, proj, col, age < 1 ? 0.7 : 0);
      }
    };

    const drawBase = (g: CanvasRenderingContext2D, world: (g: CanvasRenderingContext2D) => void, chapter: number, borders: number, px: number, scale: number, proj: Proj) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = C.sea;
      g.fillRect(0, 0, w, h);
      world(g);
      if (relief) {
        g.imageSmoothingQuality = 'high';
        const x0 = RELIEF[0] * K, x1 = RELIEF[1] * K, y0 = -RELIEF[3], y1 = -RELIEF[2];
        const paint = () => g.drawImage(relief!, x0, y0, x1 - x0, y1 - y0);
        // relief on land only: the sea stays one flat dark tone, so the image never shows its edges
        if (!land && provs.length && neighbours) {
          land = new Path2D(neighbours);
          provs.forEach((p) => land!.addPath(p.path));
        }
        if (land) {
          // the coast: a faint light rim around the land, so it separates from the dark sea
          g.save();
          g.strokeStyle = C.coast;
          g.lineWidth = 2.2 * px;
          g.stroke(land);
          g.restore();
          g.save();
          g.clip(land);
          g.globalAlpha = 0.72; // neighbours slightly darker
          paint();
          g.restore();
          // Argentina at full strength: the country stays recognisable even when small
          const arg = new Path2D();
          provs.forEach((p) => arg.addPath(p.path));
          g.save();
          g.clip(arg);
          paint();
          g.restore();
        }
        g.globalAlpha = 1;
        // fade the image edges into the uniform sea around it, so there is no seam
        const f = 3; // degrees
        const fade = (gx0: number, gy0: number, gx1: number, gy1: number, rx: number, ry: number, rw: number, rh: number) => {
          const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
          gr.addColorStop(0, C.sea);
          gr.addColorStop(1, C.seaClear);
          g.fillStyle = gr;
          g.fillRect(rx, ry, rw, rh);
        };
        fade(x0, 0, x0 + f, 0, x0, y0, f, y1 - y0);
        fade(x1, 0, x1 - f, 0, x1 - f, y0, f, y1 - y0);
        fade(0, y0, 0, y0 + f, x0, y0, x1 - x0, f);
        fade(0, y1, 0, y1 - f, x0, y1 - f, x1 - x0, f);
      }
      g.lineJoin = 'round';
      if (neighbours) {
        g.strokeStyle = C.neighbour;
        g.lineWidth = 0.8 * px;
        g.stroke(neighbours);
      }
      if (!provs.length) return;
      if (borders > 0) {
        g.strokeStyle = `rgba(${C.province}, ${(0.4 * borders).toFixed(3)})`;
        g.lineWidth = px;
        provs.forEach((p) => g.stroke(p.path));
      }

      if (chapter === 7) {
        drawGrid(g, px, world);
        return;
      }
      if (chapter === 8) {
        drawMore(g, px, world);
        return;
      }

      // visited fires: a faint warm outline and all their foci, dimmer than the active fire
      const visited = chapter === 6 ? 6 : Math.max(0, chapter);
      for (let i = 0; i < visited; i++) {
        const v = TOUR_EVENTS[i];
        world(g);
        g.strokeStyle = C.visited;
        g.lineWidth = 1.2 * px;
        provs.forEach((p) => { if (v.provs.includes(p.name)) g.stroke(p.path); });
        const Ev = foci.get(v.id);
        if (!Ev) continue;
        placePlate(g, world, visitedPlate(v.id, Ev));
      }
    };

    /**
     * Explore: foci of the chosen year in 0.25-degree cells. The colour scale is fixed for every year
     * (log scale up to GRID_MAX), so a quiet year looks quiet; and the chosen province.
     */
    const drawGrid = (g: CanvasRenderingContext2D, px: number, world: (g: CanvasRenderingContext2D) => void) => {
      const ex = getExplore();
      const G = grids.get(ex.year);
      if (G && G.cells.length) {
        const lm = Math.log(GRID_MAX + 1);
        const tiers: Pt[][] = [[], [], [], []];
        for (const [lon, lat, n] of G.cells) tiers[Math.min(3, Math.floor((Math.log(n + 1) / lm) * 4))].push([lon, lat, n]);
        placePlate(g, world, plate('grid:' + ex.year, [-75, -52, -56, -21], 28, (pg, pp) => {
        // more foci, bigger and brighter square; only the two upper tiers glow
          tiers.forEach((list, i) => focusCells(pg, list, G.step, 28, pp, C.grid[i], 0.28, 1, 0.5, GRID_MAX));
        }));
      }
      if (ex.prov) {
        world(g);
        provs.forEach((p) => {
          if (p.name !== ex.prov) return;
          g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
          g.lineWidth = 5 * px;
          g.stroke(p.path);
          g.strokeStyle = C.selected;
          g.lineWidth = 2 * px;
          g.stroke(p.path);
        });
      }
    };

    /** "Dónde más ardió": all foci 2012-2026 per cell (own fixed scale), the province in focus outlined. */
    const drawMore = (g: CanvasRenderingContext2D, px: number, world: (g: CanvasRenderingContext2D) => void) => {
      if (allYears && allYears.length) {
        const cells = allYears;
        const lm = Math.log(allMax + 1);
        placePlate(g, world, plate('grid:all', [-75, -52, -56, -21], 56, (pg, pp) => {
          const tiers: Pt[][] = [[], [], [], []];
          for (const [lon, lat, n] of cells) tiers[Math.min(3, Math.floor((Math.log(n + 1) / lm) * 4))].push([lon, lat, n]);
          // fifteen years pile up: smaller squares keep it a density of points, not a filled area
          tiers.forEach((list, i) => focusCells(pg, list, 0.25, 56, pp, C.grid[i], 0.25, 1, 0.42, allMax));
        }));
      }
      const name = MORE_PROVINCES[moreNow];
      world(g);
      provs.forEach((p) => {
        if (p.name !== name) return;
        g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        g.lineWidth = 5 * px;
        g.stroke(p.path);
        g.strokeStyle = C.selected;
        g.lineWidth = 2 * px;
        g.stroke(p.path);
      });
    };

    /*
     * Fire as light. Each cell is drawn in two passes:
     *  1. a glow added with 'lighter', whose size and strength follow the cell's number of
     *     detections (log scale against a fixed reference): where detections pile up the glows add up
     *     and the area shines because there are more detections, not because a colour was chosen;
     *  2. the detection itself: a small round core on a tight dark shadow, so it keeps >= 3:1
     *     against the land below.
     * It is the density of real detections, never an invented burnt surface.
     */
    const sprites = new Map<string, HTMLCanvasElement>();
    const sprite = (key: string, stops: [number, string][]) => {
      let c = sprites.get(key);
      if (!c) {
        c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d')!;
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        stops.forEach(([o, col]) => gr.addColorStop(o, col));
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        sprites.set(key, c);
      }
      return c;
    };
    const focusCells = (g: CanvasRenderingContext2D, list: Pt[], step: number, scale: number, proj: Proj, color: string, halo: number, device = dpr, size = 0, ref = WEEK_REF) => {
      if (!list.length) return;
      g.setTransform(device, 0, 0, device, 0, 0);
      const cell = step * scale; // px of the target
      const lr = Math.log(ref + 1);
      const weight = (n: number) => Math.min(1, Math.log((n || 1) + 1) / lr);
      const glow = sprite('glow:' + color, [[0, color], [0.25, color + 'aa'], [1, color + '00']]);
      // the detection itself: a small round core on a tight dark shadow, pre-composited in one sprite
      // (the shadow gives the core its contrast on sunlit slopes; it is too small to merge into a patch)
      let dot = sprites.get('dot:' + color);
      if (!dot) {
        dot = document.createElement('canvas');
        dot.width = dot.height = 64;
        const d = dot.getContext('2d')!;
        const sh = d.createRadialGradient(32, 32, 0, 32, 32, 32);
        sh.addColorStop(0, C.shadow);
        sh.addColorStop(0.55, 'rgba(6, 3, 1, 0.35)');
        sh.addColorStop(1, 'rgba(6, 3, 1, 0)');
        d.fillStyle = sh;
        d.fillRect(0, 0, 64, 64);
        const co = d.createRadialGradient(32, 32, 0, 32, 32, 16);
        co.addColorStop(0, '#fff8e6');
        co.addColorStop(0.45, color);
        co.addColorStop(0.8, color);
        co.addColorStop(1, color + '00');
        d.fillStyle = co;
        d.fillRect(16, 16, 32, 32);
        sprites.set('dot:' + color, dot);
      }
      const k = size || 0.6;
      // glow, sized and weighted by the detections
      if (halo > 0) {
        g.globalCompositeOperation = 'lighter';
        for (const [lon, lat, n] of list) {
          const w = weight(n);
          const [x, y] = proj(lon, lat);
          const r = Math.max(cell * (1 + 1.6 * w) * k * 1.4, 3);
          g.globalAlpha = halo * (0.2 + 0.8 * w);
          g.drawImage(glow, x - r, y - r, 2 * r, 2 * r);
        }
      }
      // shadow + core (the core is half the sprite's radius)
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      for (const [lon, lat, n] of list) {
        const [x, y] = proj(lon, lat);
        const r = Math.max(cell * (0.35 + 0.35 * weight(n)) * k * 1.4, 1.1) * 2;
        g.drawImage(dot, x - r, y - r, 2 * r, 2 * r);
      }
    };

    const unsub = subscribe(onFrame);
    return () => { live = false; unsub(); unsubExplore(); ro.disconnect(); canvas.removeEventListener('click', onClick); };
  }, []);

  return (
    <div ref={wrap} className={styles.map}>
      <canvas
        ref={cv}
        className={styles.canvas}
        data-tour-canvas="map"
        role="img"
        aria-label="Mapa de Sudamérica con las provincias argentinas y los focos de calor semanales detectados por satélite en cada incendio del recorrido"
      />
    </div>
  );
}

function addGeometry(p: Path2D, g: any) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  polys.forEach((poly: number[][][]) => poly.forEach((ring) => {
    ring.forEach(([lon, lat], i) => (i === 0 ? p.moveTo(lon * K, -lat) : p.lineTo(lon * K, -lat)));
    p.closePath();
  }));
}

function toProv(f: any): Prov {
  const p = new Path2D();
  const b: Box = [180, -180, 90, -90];
  addGeometry(p, f.geometry);
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  polys.forEach((poly: number[][][]) => poly[0].forEach(([lon, lat]) => {
    if (lon < b[0]) b[0] = lon; if (lon > b[1]) b[1] = lon;
    if (lat < b[2]) b[2] = lat; if (lat > b[3]) b[3] = lat;
  }));
  return { name: f.properties.name, path: p, box: b };
}
