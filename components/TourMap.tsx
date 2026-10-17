'use client';
import { useEffect, useRef } from 'react';
import { loadFoci, loadGrid, loadProvincias, type Foci } from '../lib/data';
import { getExplore, setExplore, subscribeExplore } from '../lib/exploreState';
import { fociWeek } from '../lib/fire';
import { TOUR_EVENTS } from '../lib/tour';
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
const RELIEF: Box = [-94, -24, -63, 14]; // extent of public/map/sudamerica-ne2.webp
const TENSION = 0.052;
const FRICTION = 0.78;

type Box = [number, number, number, number]; // minLon, maxLon, minLat, maxLat
type Prov = { name: string; path: Path2D; box: Box };

export const MAP_COLORS = {
  sea: '#5184a2', // average deep sea along the edges of the relief image
  seaClear: 'rgba(81, 132, 162, 0)',
  neighbour: 'rgba(20, 24, 28, 0.35)',
  province: '12, 12, 12',
  visited: 'rgba(70, 22, 12, 0.7)',
  active: '#ff5a1f',
  activeHalo: 'rgba(0, 0, 0, 0.55)',
  rim: '#240800',
  hot: '#ffd166',
  ember: '#ff7a1c',
  deep: '#e8401c',
  old: '#b3301a',
  visitedFocus: '#a62a16',
  // year grid of the explore section (log scale, low to high)
  grid: ['#f6b73c', '#ef7d22', '#d9441b', '#9c1f12'],
  selected: '#111418',
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
      lastKey = baseKey = '';
      request();
    }, () => {});
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (live) { relief = img; lastKey = baseKey = ''; request(); } };
    img.src = BASE_PATH + '/map/sudamerica-ne2.webp';
    TOUR_EVENTS.forEach((ev) => loadFoci(ev.id).then((E) => { if (live) { foci.set(ev.id, E); request(); } }, () => {}));
    const grids = new Map<number, { step: number; cells: [number, number, number][] }>();
    const unsubExplore = subscribeExplore(() => request());
    let chapterNow = -2;
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

    const boxFor = (chapter: number): Box => {
      if (chapter === -2) return CONTINENT;
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
      const target = [...boxFor(st.chapter), rl, rr];
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
      const exKey = st.chapter === 7 ? ex.year + ':' + (ex.prov || '') : '';
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
    const ash = document.createElement('canvas');
    const actx = ash.getContext('2d')!;
    let baseKey = '', ashKey = '', ashWeek = 0;
    const byWeek = new Map<string, [number, number][][]>();
    const weeksOf = (id: string, E: Foci) => {
      let b = byWeek.get(id);
      if (!b) {
        b = Array.from({ length: E.weeks + 1 }, () => []);
        for (const [lon, lat, wk] of E.cells) b[wk].push([lon, lat]);
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
      if (base.width !== canvas.width || base.height !== canvas.height) {
        base.width = ash.width = canvas.width;
        base.height = ash.height = canvas.height;
        baseKey = ashKey = '';
      }
      const camKey = c.map((v) => v.toFixed(4)).join(',') + '|' + w + 'x' + h;

      const ex = getExplore();
      const bk = [camKey, chapter, borders.toFixed(3), provs.length, foci.size, !!relief, !!neighbours, chapter === 7 ? ex.year + ':' + (ex.prov || '') + ':' + (grids.get(ex.year)?.cells.length || 0) : ''].join('|');
      if (bk !== baseKey) {
        baseKey = bk;
        ashKey = '';
        drawBase(bctx, world, chapter, borders, px);
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
      const ashW = Math.max(0, week - 8);
      const ak = camKey + '|' + chapter;
      // rebuilt whole whenever it changes: drawing it week by week would round the antialiased edges
      // differently depending on the scroll path, and the same position must give the same pixels
      if (ak !== ashKey || ashW !== ashWeek) {
        ashKey = ak;
        actx.setTransform(1, 0, 0, 1, 0, 0);
        actx.clearRect(0, 0, ash.width, ash.height);
        world(actx);
        for (let wk = 0; wk < ashW; wk++) cells(actx, W[wk], Ea.step, px, C.old, true);
        ashWeek = ashW;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(ash, 0, 0);
      world(ctx);
      for (let wk = ashW; wk < week; wk++) {
        const age = week - 1 - wk;
        cells(ctx, W[wk], Ea.step, px, age < 1 ? C.hot : age < 3 ? C.ember : C.deep);
      }
    };

    const drawBase = (g: CanvasRenderingContext2D, world: (g: CanvasRenderingContext2D) => void, chapter: number, borders: number, px: number) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = C.sea;
      g.fillRect(0, 0, w, h);
      world(g);
      if (relief) {
        g.imageSmoothingQuality = 'high';
        const x0 = RELIEF[0] * K, x1 = RELIEF[1] * K, y0 = -RELIEF[3], y1 = -RELIEF[2];
        g.drawImage(relief, x0, y0, x1 - x0, y1 - y0);
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
        g.strokeStyle = `rgba(${C.province}, ${(0.85 * borders).toFixed(3)})`;
        g.lineWidth = px;
        provs.forEach((p) => g.stroke(p.path));
      }

      if (chapter === 7) {
        drawGrid(g, px);
        return;
      }

      // visited fires: dim outline + all their foci as embers
      const visited = chapter === 6 ? 6 : Math.max(0, chapter);
      for (let i = 0; i < visited; i++) {
        const v = TOUR_EVENTS[i];
        g.strokeStyle = C.visited;
        g.lineWidth = 1.6 * px;
        provs.forEach((p) => { if (v.provs.includes(p.name)) g.stroke(p.path); });
        const Ev = foci.get(v.id);
        if (!Ev) continue;
        const W = weeksOf(v.id, Ev);
        for (let wk = 0; wk < Ev.weeks; wk++) cells(g, W[wk], Ev.step, px, C.visitedFocus, true);
      }
    };

    /** Explore: foci of the chosen year in 0.25-degree cells (log colour scale) and the chosen province. */
    const drawGrid = (g: CanvasRenderingContext2D, px: number) => {
      const ex = getExplore();
      const G = grids.get(ex.year);
      if (G && G.cells.length) {
        let max = 1;
        for (const c of G.cells) if (c[2] > max) max = c[2];
        const lm = Math.log(max + 1);
        const s = G.step * 0.92;
        // opaque dark rim (same as the foci): every tone keeps >= 3:1 against it, whatever the relief
        // below (scripts/contrast.mjs checks the lightest tone)
        for (const [lon, lat, n] of G.cells) {
          const t = Math.log(n + 1) / lm;
          const x = (lon - s / 2) * K, y = -lat - s / 2, w = s * K, h = s; // cells are given by their centre
          g.fillStyle = C.rim;
          g.fillRect(x - 0.8 * px, y - 0.8 * px, w + 1.6 * px, h + 1.6 * px);
          g.fillStyle = C.grid[Math.min(3, Math.floor(t * 4))];
          g.fillRect(x, y, w, h);
        }
      }
      if (ex.prov) {
        provs.forEach((p) => {
          if (p.name !== ex.prov) return;
          g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          g.lineWidth = 5 * px;
          g.stroke(p.path);
          g.strokeStyle = C.selected;
          g.lineWidth = 2.2 * px;
          g.stroke(p.path);
        });
      }
    };

    /**
     * One week of 0.05-degree cells with a dark rim, at least 2.4 px wide so isolated foci stay visible.
     * Older weeks (`small`) are drawn at their true size, translucent: dense fires then read as a
     * density of points over visible terrain, never as a filled province.
     */
    const cells = (g: CanvasRenderingContext2D, list: [number, number][], step: number, px: number, fill: string, small = false) => {
      if (small) {
        // true cell size, translucent, no rim: density reads as density and the terrain stays visible
        const sx = step * K * 0.8, sy = step * 0.8;
        g.globalAlpha = 0.6;
        g.fillStyle = fill;
        for (const [lon, lat] of list) g.fillRect(lon * K - sx / 2, -lat - sy / 2, sx, sy);
        g.globalAlpha = 1;
        return;
      }
      const sx = Math.max(step * K, 2.4 * px);
      const sy = Math.max(step, 2.4 * px);
      g.fillStyle = C.rim;
      for (const [lon, lat] of list) g.fillRect(lon * K - sx / 2 - px, -lat - sy / 2 - px, sx + 2 * px, sy + 2 * px);
      g.fillStyle = fill;
      for (const [lon, lat] of list) g.fillRect(lon * K - sx / 2, -lat - sy / 2, sx, sy);
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
