'use client';
import { useEffect, useRef } from 'react';
import { loadFoci, loadGrid, loadProvincias, type Foci } from '../lib/data';
import { getExplore, setExplore, subscribeExplore } from '../lib/exploreState';
import { SCENES, storyWeek, storyWeekFrac, type Scene, type SceneFrame } from '../lib/scenes';
import type { Sites } from '../lib/fx';
import { MORE_OPEN, MORE_PROVINCES, TOUR_EVENTS } from '../lib/tour';
import { request, subscribe, type Frame } from '../lib/scrollDriver';
import { cineOk, cineShown } from '../lib/cine';
import { publishMarks } from '../lib/placement';
import { DESKTOP, mapRect, podRight } from '../lib/tourLayout';
import { mapGlow } from '../lib/mapGlow';
import { CELL_CLASSES, CELL_STORIES, DOT_ALPHA, DOT_HALO, DOT_COVER, DOT_D, DOT_FILL, DOT_SHADE, DOT_SHADE_FROM, HANDOVER, HANDOVER_FADE, ZONE_ALPHA, ZONE_D, ZONE_DEG, ZONE_SHADE_FROM, cellClass, dotMin, zoneClass, zoneMin } from '../lib/density';
import { weekDate } from '../lib/fire';
import CineFire from './CineFire';
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
  const fxv = useRef<HTMLCanvasElement>(null);
  const tipv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext('2d')!;
    const fxc = fxv.current!;
    const fctx = fxc.getContext('2d')!;
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
    // detailed relief of each scene's close-up, drawn over the continental relief when the camera is near
    const closeups: { img: HTMLImageElement; box: Box; ok: boolean }[] = Object.values(SCENES).map((sc) => {
      const im = new Image();
      im.decoding = 'async';
      const c = { img: im, box: sc.relief.box, ok: false };
      im.onload = () => { if (live) { c.ok = true; lastKey = baseKey = ''; request(); } };
      im.src = BASE_PATH + sc.relief.src;
      return c;
    });
    const grids = new Map<number, { step: number; cells: [number, number, number][] }>();
    const unsubExplore = subscribeExplore(() => request());
    let chapterNow = -2;
    let moreNow = -1;
    let moreTNow = 0;
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
      fxc.width = canvas.width;
      fxc.height = canvas.height;
      lastKey = '';
      wrapAt = null;
      request();
    };
    // where the map sits on the page, read once per size (reading it every frame forces a layout)
    let wrapAt: [number, number] | null = null;
    const wrapPos = (): [number, number] => {
      if (!wrapAt) { const r = wrap.current?.getBoundingClientRect(); wrapAt = [r?.left ?? 0, r?.top ?? 0]; }
      return wrapAt;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    // camera: box (4) + target rect left/right in px (2)
    let cam: number[] | null = null;
    const vel = [0, 0, 0, 0, 0, 0];
    let lastKey = '';

    const boxFor = (chapter: number, open: number, more: number, sc?: Scene, sf?: SceneFrame | null): Box => {
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
      // explore: a chosen province fills the map, the camera travels there (and back) as in the tour
      if (chapter === 7 && provs.length) {
        const pr = getExplore().prov, p = pr ? provs.find((x) => x.name === pr) : undefined;
        if (p) {
          const b = p.box, cx = (b[0] + b[1]) / 2, cy = (b[2] + b[3]) / 2;
          const hx = Math.max((b[1] - b[0]) * 0.62, 1.6), hy = Math.max((b[3] - b[2]) * 0.62, 1.6);
          return [cx - hx, cx + hx, cy - hy, cy + hy];
        }
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
      const pb: Box = [b[0] - px, b[1] + px, b[2] - py, b[3] + py];
      // a story with a scene: the camera closes in on its place, then opens again
      if (sc && sf && sf.zoom > 0) {
        const cb = sc.box(w);
        return pb.map((v, i) => v + (cb[i] + sf.pan[i < 2 ? 0 : 1] - v) * sf.zoom) as Box;
      }
      return pb;
    };

    const onFrame = (f: Frame): boolean => {
      if (!w || !h) return false;
      const { st } = f;
      const [rl, rr] = mapRect(w, st.chapter);
      const sid = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter].id : '';
      if (sid !== sceneId) { sceneId = sid; sites = null; }
      scene = SCENES[sid];
      sf = scene ? scene.frame(st.chapterT, f.reduced) : null;
      // the map is under a landscape, the smoke, an illustration or Chubut's opening: nothing to point at
      tipOff = st.land > 0.5 || st.veil > 0.5 || (!!sf && (sf.ill > 0.5 || (!!sf.cine && cineOk()))) || cineShown();
      if (tipOff) hideTip();
      still = f.reduced || !!(window as any).__tourStill;
      reducedNow = f.reduced;
      // the close-up takes the whole band: the photo box steps aside while the scene plays
      const rw = sf ? rr + (mapRect(w, 6)[1] - rr) * sf.zoom : rr;
      const target = [...boxFor(st.chapter, st.open, st.more, scene, sf), rl, rw];
      moreNow = st.more;
      moreTNow = st.moreT;
      // a landscape or the smoke between regions covers the map: the camera is already where it goes
      // (its travel is hidden) and nothing is drawn underneath
      const covered = st.land > 0.995 || st.veil > 0.995;
      coveredNow = covered;
      if (!cam || f.reduced || covered) { cam = target.slice(); vel.fill(0); }
      if (covered) {
        if (lastKey !== 'covered') {
          lastKey = 'covered';
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = C.sea;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          fctx.setTransform(1, 0, 0, 1, 0, 0);
          fctx.clearRect(0, 0, fxc.width, fxc.height);
          fxDrawn = false;
        }
        return false;
      }
      let moving = false;
      for (let i = 0; i < 6; i++) {
        vel[i] = (vel[i] + (target[i] - cam[i]) * TENSION) * FRICTION;
        cam[i] += vel[i];
        const eps = i < 4 ? 0.01 : 1; // about a third of a pixel: the snap is invisible
        if (Math.abs(target[i] - cam[i]) < eps && Math.abs(vel[i]) < eps) { cam[i] = target[i]; vel[i] = 0; } else moving = true;
      }
      // each edge springs on its own, so a deep zoom-in overshoots and the edges cross (the view flips
      // and the plates are drawn enlarged into blocks): the span never goes below 90% of where it is going
      for (const [i, j] of [[0, 1], [2, 3]]) {
        const ts = target[j] - target[i];
        if (cam[j] - cam[i] >= ts * 0.9) continue;
        const m = (cam[i] + cam[j]) / 2, vm = (vel[i] + vel[j]) / 2;
        cam[i] = m - ts * 0.45; cam[j] = m + ts * 0.45;
        vel[i] = vel[j] = vm;
        moving = true;
      }

      const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
      const E = ev ? foci.get(ev.id) : undefined;
      const week = E ? storyWeek(ev.id, E, st.chapterT) : 0;
      frac = E ? storyWeekFrac(ev.id, E, st.chapterT) : 1;
      chapterNow = st.chapter;
      canvas.style.cursor = st.chapter === 7 ? 'pointer' : '';
      const ex = getExplore();
      if (st.chapter === 7 && !grids.has(ex.year)) {
        grids.set(ex.year, { step: 0.25, cells: [] }); // placeholder until loaded
        loadGrid(ex.year).then((g) => { if (live) { grids.set(ex.year, g); baseKey = lastKey = ''; request(); } }, () => {});
      }
      if (st.chapter === 8) loadAllYears();
      const exKey = st.chapter === 7 ? ex.year + ':' + (ex.prov || '') : st.chapter === 8 ? 'more:' + st.more + ':' + (allYears?.length || 0) + ':' + Math.min(1, st.moreT / MORE_OPEN).toFixed(3) : '';
      const key = [cam.map((v) => v.toFixed(4)).join(','), st.chapter, week, frac.toFixed(3), st.borders.toFixed(3), provs.length, foci.size, w, h, exKey].join('|');
      if (key !== lastKey) {
        lastKey = key;
        draw(st.chapter, week, st.borders);
      }
      fxFoci = sf && E ? E : null;
      drawScene();
      return moving;
    };

    /*
     * The illustrated layer of the active story's scene (lib/scenes.ts), on its own canvas over the
     * map. It is redrawn with each scroll frame, and between frames only to let the flames flicker
     * (not under reduced motion).
     */
    let scene: Scene | undefined;
    let sceneId = '';
    let sf: SceneFrame | null = null;
    let still = false;
    let reducedNow = false;
    let coveredNow = false;
    let fxFoci: Foci | null = null;
    let sites: Sites | null = null;
    let fxDrawn = false;
    let ticking = 0;
    const drawScene = () => {
      const active = !coveredNow && !!scene && !!sf && sf.zoom > 0.001 && !!fxFoci;
      if (!active) {
        if (fxDrawn) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fxc.width, fxc.height); fxDrawn = false; }
        return;
      }
      sites ??= scene!.sites(fxFoci!);
      const { scale, ox, oy } = view;
      sf!.draw(fctx, {
        proj: (lon, lat) => [ox + lon * K * scale, oy - lat * scale],
        w, h, dpr, band: [cam![4], cam![5]], ppd: scale,
        time: still ? 0 : performance.now() / 1000,
        reduced: reducedNow,
      }, sites);
      fxDrawn = true;
      if (!still && !ticking) ticking = requestAnimationFrame(() => { ticking = 0; if (live) drawScene(); });
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
    /*
     * A relief image cut to the land once: neighbours at 72 %, Argentina at full strength, the sea
     * transparent. Clipping a large image to hundreds of province outlines on every camera frame was
     * the most expensive step of the map; now it is one drawImage.
     */
    const landPlates = new Map<HTMLImageElement, HTMLCanvasElement>();
    const landPlate = (img: HTMLImageElement, b: Box) => {
      let c = landPlates.get(img);
      if (c) return c;
      c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const pg = c.getContext('2d')!;
      const sx = c.width / ((b[1] - b[0]) * K), sy = c.height / (b[3] - b[2]);
      const arg = new Path2D();
      provs.forEach((p) => arg.addPath(p.path));
      ([[land!, 0.72], [arg, 1]] as [Path2D, number][]).forEach(([path, alpha]) => {
        pg.save();
        pg.setTransform(sx, 0, 0, sy, -b[0] * K * sx, b[3] * sy); // world -> plate pixels
        pg.clip(path);
        pg.setTransform(1, 0, 0, 1, 0, 0);
        pg.globalAlpha = alpha;
        pg.drawImage(img, 0, 0);
        pg.restore();
      });
      landPlates.set(img, c);
      return c;
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
    const ZOOM_RES = 480; // px per degree of the close-up plates of big fires
    const zoomKeys: string[] = [];
    const zbaseKeys: string[] = [];
    const weekKeys: string[] = [];
    const smoothstep = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    /** How far into the current week's stretch the scroll is (0..1): the newest week fades in with it. */
    let frac = 1;
    /*
     * Weeks already past, and the fires of other stories: small points on their dark shadow, no halo.
     * With a halo, and at their earlier size, thousands of them merged into solid red blocks that read
     * as a burnt area; at this size they stay points, with the land showing between them.
     */
    const OLD_SIZE = 0.25;
    const nearKeys: string[] = [];
    const oldPlate = (id: string, E: Foci, c0: number) => plate(`old:${id}:${c0}`, fireBox(E), FIRE_RES, (g, pp) => {
      const W = weeksOf(id, E);
      for (let wk = c0; wk < c0 + CHUNK; wk++) focusCells(g, W[wk] || [], E.step, FIRE_RES, pp, C.old, 0, 1, OLD_SIZE);
    });
    const visitedPlate = (id: string, E: Foci) => plate('visited:' + id, fireBox(E), FIRE_RES, (g, pp) => {
      const W = weeksOf(id, E);
      for (let wk = 0; wk < E.weeks; wk++) focusCells(g, W[wk], E.step, FIRE_RES, pp, C.visitedFocus, 0, 1, OLD_SIZE);
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
    /*
     * Close-up plates of a big fire (ZOOM_RES): the accumulated base of its old weeks (each one the
     * previous plus a week) and a hot plate per week, inside the box the close-up can show.
     */
    const zoomBox = (id: string): Box => {
      const sc = SCENES[id];
      return sc.relief.box;
    };
    const inside = (bx: Box) => (c: Pt) => c[0] >= bx[0] && c[0] <= bx[1] && c[1] >= bx[2] && c[1] <= bx[3];
    const zoomBase = (id: string, E: Foci, n: number): Plate | null => {
      if (n <= 0) return null;
      const bk = `zb:${id}:${n}`;
      const hit = plates.get(bk);
      if (hit) return hit;
      const W = weeksOf(id, E), bx = zoomBox(id), inBox = inside(bx);
      const prev = plates.get(`zb:${id}:${n - 1}`) || null;
      const pl = plate(bk, bx, ZOOM_RES, (pg, pp) => {
        if (prev) { pg.setTransform(1, 0, 0, 1, 0, 0); pg.drawImage(prev.c, 0, 0); }
        for (let wk = prev ? n - 1 : 0; wk < n; wk++) focusCells(pg, W[wk].filter(inBox), E.step, ZOOM_RES, pp, C.old, 0, 1, OLD_SIZE, WEEK_REF, 4);
      });
      zbaseKeys.push(bk);
      while (zbaseKeys.length > 2) plates.delete(zbaseKeys.shift()!);
      return pl;
    };
    const zoomHot = (id: string, E: Foci, wk: number): Plate => {
      const key = `zhot:${id}:${wk}`;
      if (!plates.has(key)) { zoomKeys.push(key); while (zoomKeys.length > 3) plates.delete(zoomKeys.shift()!); }
      const W = weeksOf(id, E), bx = zoomBox(id), inBox = inside(bx);
      return plate(key, bx, ZOOM_RES, (pg, pp) => focusCells(pg, W[wk].filter(inBox), E.step, ZOOM_RES, pp, C.hot, 0.55, 1, 0, WEEK_REF, 7, 1, 1));
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

    /*
     * A story's detections as cells (lib/density.ts): one dot per cell with detections, at its centre,
     * sized and lit by the sum of its detections up to the shown week; far away, one dot per zone of
     * 5 x 5 cells, by the mean per cell of the same sums. The classes are worked out once per story,
     * week by week (cls[k][i], zcls[k][z]: class counting the weeks before k, 255 = none yet).
     */
    type CellSeries = { lon: Float64Array; lat: Float64Array; cls: Uint8Array[]; zone: Int32Array; zlon: Float64Array; zlat: Float64Array; zcls: Uint8Array[] };
    const cellSeries = new Map<string, CellSeries>();
    const seriesOf = (id: string, E: Foci): CellSeries => {
      let s = cellSeries.get(id);
      if (s) return s;
      const index = new Map<string, number>();
      for (const [lon, lat] of E.cells) { const k = lon + ',' + lat; if (!index.has(k)) index.set(k, index.size); }
      const n = index.size, lon = new Float64Array(n), lat = new Float64Array(n), sum = new Float64Array(n);
      for (const [k, i] of index) { const [x, y] = k.split(','); lon[i] = +x; lat[i] = +y; }
      // each cell's zone (its centre never falls on a zone's edge: cells are centred on .025 / .075)
      const zindex = new Map<string, number>(), zone = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        const zk = Math.floor(lon[i] / ZONE_DEG) + ',' + Math.floor(lat[i] / ZONE_DEG);
        if (!zindex.has(zk)) zindex.set(zk, zindex.size);
        zone[i] = zindex.get(zk)!;
      }
      const nz = zindex.size, zlon = new Float64Array(nz), zlat = new Float64Array(nz), zsum = new Float64Array(nz);
      for (const [zk, z] of zindex) { const [a, b] = zk.split(',').map(Number); zlon[z] = (a + 0.5) * ZONE_DEG; zlat[z] = (b + 0.5) * ZONE_DEG; }
      const W = weeksOf(id, E), cls: Uint8Array[] = [], zcls: Uint8Array[] = [];
      for (let k = 0; k <= E.weeks; k++) {
        const c = new Uint8Array(n).fill(255), zc = new Uint8Array(nz).fill(255);
        for (let i = 0; i < n; i++) if (sum[i] > 0) c[i] = cellClass(sum[i]);
        for (let z = 0; z < nz; z++) if (zsum[z] > 0) zc[z] = zoneClass(zsum[z]);
        cls.push(c);
        zcls.push(zc);
        for (const [x, y, m] of W[k] || []) { const i = index.get(x + ',' + y)!; sum[i] += m; zsum[zone[i]] += m; }
      }
      s = { lon, lat, cls, zone, zlon, zlat, zcls };
      cellSeries.set(id, s);
      return s;
    };
    /*
     * Hover: what a mark is. The marks of the active story drawn in the last frame are kept (position,
     * radius, cell or zone); under the pointer the nearest one shows its real sum of detections up to
     * the shown week, what it covers (a 5-km cell, or a zone of 25 cells that is not a single fire),
     * the period and its class. Read from the data on demand, never stored as an estimate.
     */
    type Hit = { x: number; y: number; r: number; zone: boolean; i: number };
    let hits: Hit[] = [];
    let hitCtx: { id: string; E: Foci; S: CellSeries; wk: number } | null = null;
    let mouse: [number, number] | null = null;
    let tipOff = false;
    let onCanvas = false;
    let tipKey = '';
    const tip = tipv.current!;
    const fmtN = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
    const deg = (v: number, pos: string, neg: string) => `${fmtN(Math.abs(Math.round(v * 100) / 100))}° ${v < 0 ? neg : pos}`;
    const hideTip = () => { if (!tip.hidden) { tip.hidden = true; tipKey = ''; } };
    const showTip = (hit: Hit, mx: number, my: number) => {
      const { id, E, S, wk } = hitCtx!;
      const key = [id, wk, hit.zone, hit.i].join('|');
      if (key !== tipKey) {
        tipKey = key;
        const W = weeksOf(id, E);
        let sum = 0;
        const cells = new Set<string>();
        const zx = Math.floor(S.zlon[hit.i] / ZONE_DEG), zy = Math.floor(S.zlat[hit.i] / ZONE_DEG);
        for (let k = 0; k < wk; k++) for (const [x, y, m] of W[k] || []) {
          const inside = hit.zone ? Math.floor(x / ZONE_DEG) === zx && Math.floor(y / ZONE_DEG) === zy : x === S.lon[hit.i] && y === S.lat[hit.i];
          if (inside) { sum += m; cells.add(x + ',' + y); }
        }
        const c = hit.zone ? zoneClass(sum) : cellClass(sum);
        // short and in reading order: how many, when, where. The caveat stays in the legend, always in sight
        const from = new Date(E.start + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
        const short = (d: string) => d.replace(/(\d+) de (\p{L}+) de (\d{4})/u, (_, dd, mm, yy) => `${dd} ${mm.slice(0, 3)} ${yy}`);
        const [a, b] = [short(from), short(weekDate(E, wk))];
        const span = a.slice(-4) === b.slice(-4) ? `${a.slice(0, -5)} – ${b}` : `${a} – ${b}`;
        const swatch = `<i style="background:${DOT_FILL[c]}"></i>`;
        const count = `<b class="${styles.tipClass}">${swatch}${fmtN(sum)} ${sum === 1 ? 'foco' : 'focos'} de calor</b><span class="${styles.tipWhen}">${span}</span>`;
        tip.innerHTML = hit.zone
          ? count + `<span>Zona de unos 27 km con ${cells.size} ${cells.size === 1 ? 'celda' : 'celdas'} de 5 km con focos. No es un incendio individual.</span>`
          : count + `<span>Celda de unos 5 km · ${deg(S.lat[hit.i], 'N', 'S')}, ${deg(S.lon[hit.i], 'E', 'O')}</span>`;
        tip.hidden = false;
      }
      // beside the pointer, flipped near the right and bottom edges so it never leaves the screen
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const x = mx + 18 + tw > w - 12 ? mx - 18 - tw : mx + 18;
      const y = Math.min(Math.max(12, my - th / 2), h - th - 12);
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    /*
     * Explore: a cell of the year's grid under the pointer says how many foci it had that year and,
     * if it lies in a province, what share of the province's foci that is. Both from the same grid
     * (the province's year is the sum of its cells), so the numbers always agree with the map.
     */
    const cellIdx = new Map<number, Map<string, number>>();
    const cellProv = new Map<string, string>();
    const provYear = new Map<string, number>();
    const keyOf = (lon: number, lat: number) => lon.toFixed(3) + ',' + lat.toFixed(3);
    // the box first: a path test only for the few provinces whose box holds the point
    const inBox = (q: { box: number[] }, lon: number, lat: number) => lon >= q.box[0] && lon <= q.box[1] && lat >= q.box[2] && lat <= q.box[3];
    const provAt = (lon: number, lat: number) => {
      const k = keyOf(lon, lat);
      let name = cellProv.get(k);
      if (name === undefined) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        name = provs.find((q) => inBox(q, lon, lat) && ctx.isPointInPath(q.path, lon * K, -lat))?.name ?? '';
        cellProv.set(k, name);
      }
      return name;
    };
    const exploreHover = () => {
      const ex = getExplore(), G = grids.get(ex.year);
      if (!mouse || !onCanvas || !G || !G.cells.length || !provs.length) { hideTip(); return; }
      let idx = cellIdx.get(ex.year);
      if (!idx) { idx = new Map(G.cells.map(([lo, la, n]) => [keyOf(lo, la), n])); cellIdx.set(ex.year, idx); }
      const [mx, my] = mouse;
      const lon = (mx - view.ox) / view.scale / K, lat = -(my - view.oy) / view.scale;
      const st = G.step, clon = Math.floor(lon / st) * st + st / 2, clat = Math.floor(lat / st) * st + st / 2;
      const n = idx.get(keyOf(clon, clat));
      if (!n) { hideTip(); return; }
      const key = ex.year + '|' + clon + '|' + clat;
      if (key !== tipKey) {
        tipKey = key;
        const prov = provAt(clon, clat);
        let line = 'Celda de unos 25 km';
        if (prov) {
          const pk = ex.year + '|' + prov;
          let tot = provYear.get(pk);
          if (tot === undefined) {
            const q = provs.find((x) => x.name === prov)!;
            tot = 0;
            for (const [lo, la, m] of G.cells) if (inBox(q, lo, la) && provAt(lo, la) === prov) tot += m;
            provYear.set(pk, tot);
          }
          const share = (100 * n) / Math.max(1, tot);
          line += ` en ${prov} · ${share < 1 ? 'menos del 1' : fmtN(Math.round(share))} % de la provincia ese año`;
        }
        const tier = Math.min(3, Math.floor((Math.log(n + 1) / Math.log(GRID_MAX + 1)) * 4));
        tip.innerHTML = `<b class="${styles.tipClass}"><i style="background:${C.grid[tier]}"></i>${fmtN(n)} ${n === 1 ? 'foco' : 'focos'} en ${ex.year}</b><span>${line}</span>`;
        tip.hidden = false;
      }
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const x = mx + 18 + tw > w - 12 ? mx - 18 - tw : mx + 18;
      const y = Math.min(Math.max(12, my - th / 2), h - th - 12);
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    const hover = () => {
      if (chapterNow === 7) { exploreHover(); return; }
      if (!mouse || tipOff || !hits.length || !hitCtx) { hideTip(); return; }
      const [mx, my] = mouse;
      let best: Hit | null = null, bd = Infinity;
      for (const hh of hits) {
        const d = Math.hypot(hh.x - mx, hh.y - my);
        if (d < Math.max(hh.r + 4, 9) && d < bd) { bd = d; best = hh; }
      }
      if (best) showTip(best, mx, my); else hideTip();
    };
    let hoverRaf = 0;
    const onMove = (e: MouseEvent) => {
      // over the reading column, the controls or a dialog the map is not what is pointed at
      const t = e.target as Element | null;
      onCanvas = t === canvas;
      if (t?.closest?.('aside, nav, button, a, dialog, [role="dialog"]')) mouse = null;
      else { const r = wrap.current!.getBoundingClientRect(); mouse = [e.clientX - r.left, e.clientY - r.top]; }
      if (!hoverRaf) hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; hover(); });
    };
    const onLeave = () => { mouse = null; hideTip(); };
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);

    const mixHex = (a: string, b: string, t: number) => {
      const p = (h: string, o: number) => parseInt(h.slice(o, o + 2), 16);
      const m = (o: number) => Math.round(p(a, o) + (p(b, o) - p(a, o)) * t);
      return `rgb(${m(1)},${m(3)},${m(5)})`;
    };
    /*
     * The newest week comes in over its stretch of scroll and settles: the cells it adds or moves up a
     * class grow from their previous dot to their new one, a little lighter on the way, and end exactly
     * in their class (the same frame whichever way the scroll arrives). Nothing blinks, and the light
     * never stands for heat. A cell whose change has not started (t = 0) or has ended (t = 1) is drawn
     * in its class's batch, so the end of a week is, pixel for pixel, the start of the next.
     */
    let zoneMix = -1; // how far the legend has turned to the zones (published as a CSS variable)
    const cellMarks = (id: string, E: Foci, week: number, proj: Proj, scale: number, rx: number, rw: number) => {
      const S = seriesOf(id, E);
      const wk = Math.min(week, E.weeks), wb = Math.max(0, wk - 1);
      const t = reducedNow ? 1 : smoothstep(frac / 0.6);
      const lift = reducedNow ? 0 : 0.5 * Math.sin(Math.PI * t);
      const cs = Math.min(E.step * K * scale, E.step * scale), zsz = cs * (ZONE_DEG / E.step);
      // ---- the fine dots (one per cell) ----
      // never wider than 90 % of the cell, so far away neighbouring dots never touch and merge into a surface
      const dia = (c: number) => Math.min(Math.max(cs * DOT_D[c], dotMin(c)), cs * 0.9);
      // the light a dot may lay on its cell: where it would cover much of it (far away) it dims in
      // proportion, so a crowd of cells reads as a grain, never as a lit area (close up it is never reached)
      const budget = (c: number) => { const d = dia(c); return Math.min(1, DOT_COVER[c] / ((Math.PI * d * d) / 4 / (cs * cs))); };
      // the shade gives way as the dots get small (far away it would turn into a grid of dark specks);
      // the light of the smallest dots is a little lower, so far away they stay a fine grain
      const shadeK = smoothstep((cs - 3) / 7), lightK = 0.7 + 0.3 * smoothstep((cs - 2) / 5);
      const FINE = { dia, shadeFrom: DOT_SHADE_FROM, shade: shadeK, alpha: (c: number) => DOT_ALPHA[c] * lightK * budget(c) };
      // ---- the zone dots (one per zone of 5 x 5 cells), growing into place as they take over ----
      const zdia = (c: number, grow: number) => Math.min(Math.max(zsz * ZONE_D[c], zoneMin(c)), zsz * 0.9) * grow;
      const ZONE = { dia: (c: number) => zdia(c, 1), shadeFrom: ZONE_SHADE_FROM, shade: smoothstep((zsz - 3) / 7), alpha: (c: number) => ZONE_ALPHA[c] };
      // ---- the hand-over: each zone switches at its own scale, the ones nearest the map's centre first ----
      const cx0 = rx + rw / 2, cy0 = h / 2, rmax = Math.hypot(rw / 2, h / 2);
      const zw = new Float32Array(S.zlon.length); // 1 = the zone's dot, 0 = its cells' dots
      for (let z = 0; z < zw.length; z++) {
        const [x, y] = proj(S.zlon[z], S.zlat[z]);
        const at = HANDOVER[0] + (HANDOVER[1] - HANDOVER[0]) * Math.min(1, Math.hypot(x - cx0, y - cy0) / rmax);
        zw[z] = 1 - smoothstep((cs - at + HANDOVER_FADE) / (2 * HANDOVER_FADE));
      }
      const mix = 1 - smoothstep((cs - HANDOVER[0]) / (HANDOVER[1] - HANDOVER[0]));
      if (Math.abs(mix - zoneMix) > 0.002) { zoneMix = mix; document.documentElement.style.setProperty('--zone-mix', mix.toFixed(3)); }
      // where the reading column's shade ends the dots thin out, never cut (desktop only)
      const fx0 = w >= DESKTOP ? podRight(w) - 64 : -1, fx1 = fx0 + 120;
      const fadeAt = (x: number) => (fx0 < 0 ? 1 : smoothstep((x - fx0) / (fx1 - fx0)));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // each mark is a pixel: a square on the cell's centre, snapped to whole pixels so its edges stay sharp
      const disc = (pts: [number, number, ...number[]][], r: number) => {
        ctx.beginPath();
        const s = Math.max(1, Math.round(2 * r));
        for (const [x, y] of pts) ctx.rect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
        ctx.fill();
      };
      const glow = (pts: [number, number, ...number[]][], r: number) => { ctx.beginPath(); for (const [x, y] of pts) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); } ctx.fill(); };
      /*
       * Weight for each pixel: a dark keyline around it (it stands on any relief), and from class 3 up a
       * hot core, lighter, as in the old pixel marks: the strongest cells read as burning embers.
       */
      const pixel = (pts: [number, number, ...number[]][], r: number, c: number, a: number) => {
        const s = Math.max(1, Math.round(2 * r));
        if (s >= 3) {
          ctx.globalAlpha = a * 0.85;
          ctx.strokeStyle = 'rgba(24,10,4,0.9)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const [x, y] of pts) ctx.rect(Math.round(x - s / 2) - 0.5, Math.round(y - s / 2) - 0.5, s + 1, s + 1);
          ctx.stroke();
        }
        ctx.globalAlpha = a;
        disc(pts, r);
        if (c >= 2 && s >= 5) {
          const k = Math.max(1, Math.round(s * (c >= 4 ? 0.42 : c >= 3 ? 0.34 : 0.26)));
          ctx.fillStyle = c >= 4 ? '#ffd27a' : c >= 3 ? '#ffb15a' : '#ffd48a';
          ctx.globalAlpha = a * (c >= 3 ? 0.95 : 0.6);
          ctx.beginPath();
          for (const [x, y] of pts) ctx.rect(Math.round(x - k / 2), Math.round(y - k / 2), k, k);
          ctx.fill();
        }
      };
      /*
       * One set of marks (cells or zones): settled ones batched per class and per weight (the column
       * fade times the hand-over, in tenths, so neither shows steps); the ones the newest week adds or
       * moves up a class, one by one while they change. A change within a thousandth of its ends counts
       * as not started or ended (the scroll never lands exactly on a week's edge): the hand-over
       * between weeks is exact, pixel for pixel.
       */
      const layer = (now: Uint8Array, before: Uint8Array, at: (i: number) => [number, number], weight: (i: number) => number, spec: typeof FINE, grow: (wgt: number) => number, zone: boolean) => {
        // key: class, column fade and hand-over, each in tenths (the hand-over also sets a zone's growth)
        const sets = new Map<number, [number, number, number][]>();
        const moving: [number, number, number][] = [];
        for (let i = 0; i < now.length; i++) {
          const c = now[i] === before[i] || t >= 0.999 ? now[i] : t <= 0.001 ? before[i] : 254;
          if (c === 255) continue;
          const [x, y] = at(i);
          if (x < -40 || y < -40 || x > w + 40 || y > h + 40) continue;
          const fd = fadeAt(x), hw = weight(i);
          if (fd * hw < 0.03) continue;
          if (c === 254) { moving.push([i, x, y]); continue; }
          const key = c * 256 + Math.round(fd * 10) * 16 + Math.round(hw * 10);
          let s = sets.get(key);
          if (!s) sets.set(key, (s = []));
          s.push([x, y, i]);
        }
        for (const [key, pts] of sets) {
          const c = key >> 8, hw = (key & 15) / 10, wgt = (((key >> 4) & 15) / 10) * hw, r = (spec.dia(c) * grow(hw)) / 2;
          if (c >= spec.shadeFrom && spec.shade > 0.01) for (const [dr, a] of DOT_SHADE) { ctx.globalAlpha = a * spec.shade * wgt; ctx.fillStyle = '#000'; disc(pts, r + dr); }
          ctx.globalAlpha = spec.alpha(c) * wgt;
          // the halo helps far away; close up the dots are big enough and it would only crowd them
          const haloK = 1 - 0.75 * spec.shade;
          if (DOT_HALO[c][1] > 0 && haloK > 0.05) {
            ctx.globalAlpha = DOT_HALO[c][1] * wgt * haloK;
            ctx.fillStyle = DOT_FILL[c];
            ctx.globalCompositeOperation = 'lighter';
            glow(pts, r * DOT_HALO[c][0]);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = spec.alpha(c) * wgt;
          }
          ctx.fillStyle = DOT_FILL[c];
          pixel(pts, r, c, spec.alpha(c) * wgt);
          if (wgt > 0.3) for (const [x, y, i] of pts) hits.push({ x, y, r, zone, i });
        }
        for (const [i, x, y] of moving) {
          const c1 = now[i], c0 = before[i], fresh = c0 === 255, hw = weight(i), wgt = fadeAt(x) * hw;
          const r = (((fresh ? 0 : spec.dia(c0)) + (spec.dia(c1) - (fresh ? 0 : spec.dia(c0))) * t) * grow(hw)) / 2;
          if (r < 0.05) continue;
          const f = wgt * (fresh ? Math.min(1, t * 1.5) : 1);
          if (c1 >= spec.shadeFrom && spec.shade > 0.01) for (const [dr, a] of DOT_SHADE) { ctx.globalAlpha = a * spec.shade * f; ctx.fillStyle = '#000'; disc([[x, y]], r + dr); }
          const a = (fresh ? spec.alpha(c1) : spec.alpha(c0) + (spec.alpha(c1) - spec.alpha(c0)) * t) * f;
          ctx.globalAlpha = a;
          ctx.fillStyle = mixHex(fresh ? DOT_FILL[c1] : DOT_FILL[c0], DOT_FILL[c1], t);
          pixel([[x, y]], r, c1, a);
          if (wgt > 0.3) hits.push({ x, y, r, zone, i });
          if (lift > 0.001) { ctx.globalAlpha = a * lift * 0.7; ctx.fillStyle = '#fff6dc'; disc([[x, y]], r); }
        }
      };
      hitCtx = { id, E, S, wk };
      layer(S.cls[wk], S.cls[wb], (i) => proj(S.lon[i], S.lat[i]), (i) => 1 - zw[S.zone[i]], FINE, () => 1, false);
      if (mix > 0.001 || zw.some((v) => v > 0.001)) layer(S.zcls[wk], S.zcls[wb], (z) => proj(S.zlon[z], S.zlat[z]), (z) => zw[z], ZONE, (wgt) => 0.55 + 0.45 * wgt, true);
      ctx.globalAlpha = 1;
    };
    /**
     * A story already visited, seen from afar: its zones as at the end of its series, the same dots as the
     * active story's zones at this scale, at half their light (the active story leads). No shade, no motion.
     */
    const VISITED_LIGHT = 0.5;
    const visitedZones = (g: CanvasRenderingContext2D, id: string, E: Foci, proj: Proj, scale: number) => {
      const S = seriesOf(id, E), now = S.zcls[E.weeks];
      const zsz = Math.min(E.step * K * scale, E.step * scale) * (ZONE_DEG / E.step);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      for (let c = 0; c < DOT_FILL.length; c++) {
        const r = Math.min(Math.max(zsz * ZONE_D[c], zoneMin(c)), zsz * 0.9) / 2;
        g.globalAlpha = ZONE_ALPHA[c] * VISITED_LIGHT;
        g.fillStyle = DOT_FILL[c];
        g.beginPath();
        for (let z = 0; z < now.length; z++) {
          if (now[z] !== c) continue;
          const [x, y] = proj(S.zlon[z], S.zlat[z]);
          g.moveTo(x + r, y);
          g.arc(x, y, r, 0, 6.2832);
        }
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    };

    const draw = (chapter: number, week: number, borders: number) => {
      // the marks under the pointer are those of this frame (none outside a story's cells)
      hits = []; hitCtx = null;
      queueMicrotask(hover);
      // the boxes over the map keep clear of these marks (lib/placement.ts)
      queueMicrotask(() => { const [l, t] = wrapPos(); publishMarks(hits, l, t); });
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
      const bk = [camKey, chapter, borders.toFixed(3), provs.length, foci.size, !!relief, !!neighbours, chapter === 7 ? ex.year + ':' + (ex.prov || '') + ':' + (grids.get(ex.year)?.cells.length || 0) : chapter === 8 ? moreNow + ':' + (allYears?.length || 0) + ':' + Math.min(1, moreTNow / MORE_OPEN).toFixed(3) : ''].join('|');
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
      // in the stories drawn as cells the outline steps back as the map closes in on the dots (thinner,
      // its glow gone): far away it still frames the region, close up the dots lead
      const fine = Ea && CELL_STORIES.has(a.id) ? smoothstep((Math.min(Ea.step * K * scale, Ea.step * scale) - 3) / (HANDOVER[1] - 3)) : 0;
      provs.forEach((p) => {
        if (!a.provs.includes(p.name)) return;
        ctx.globalAlpha = 1 - fine;
        ctx.strokeStyle = C.activeHalo;
        ctx.lineWidth = 4.5 * px;
        ctx.stroke(p.path);
        ctx.globalAlpha = 1 - 0.28 * fine;
        ctx.strokeStyle = C.active;
        ctx.lineWidth = (2 - 0.75 * fine) * px;
        ctx.stroke(p.path);
      });
      ctx.globalAlpha = 1;
      if (!Ea) return;
      // where this story's detections are on screen (the landscape's warm light goes there)
      if (mapGlow.id !== a.id + camKey) {
        let sx = 0, sy = 0, sn = 0;
        for (const [lon, lat, , n] of Ea.cells) { const [x, y] = proj(lon, lat); sx += x * n; sy += y * n; sn += n; }
        mapGlow.id = a.id + camKey; mapGlow.x = sn ? sx / sn : w / 2; mapGlow.y = sn ? sy / sn : h / 2; mapGlow.on = sn > 0;
      }
      if (CELL_STORIES.has(a.id)) {
        cellMarks(a.id, Ea, week, proj, scale, rx, rw);
        return;
      }
      const W = weeksOf(a.id, Ea);
      // older weeks come from fixed blocks of CHUNK weeks, each rendered once and kept; only the weeks
      // after the last whole block are drawn live. Same position, same blocks, same pixels.
      // in a close-up the cached plates would be enlarged into blocks: a small fire is drawn live instead
      const close = scale > FIRE_RES * 1.3;
      const sharp = close && Ea.cells.length < 3000;
      const sc = SCENES[a.id];
      /*
       * Each week comes in and cools down with the scroll, never at once: the newest week fades in
       * over the first half of its stretch, hot (white-yellow); a week a step older cools to ember
       * over the first half of the next stretch, and later to the dull red of the old weeks. The colour
       * only tells how old a detection is; nothing moves, spreads or is added between real detections.
       */
      const cls = (age: number) => (age < 1 ? 0 : age < LIVE_WEEKS ? 1 : 2);
      const STYLE = [
        { col: C.hot, halo: 0.55, size: 0, cluster: 1 },
        { col: C.ember, halo: 0, size: 0, cluster: 0.45 },
        { col: C.old, halo: 0, size: OLD_SIZE, cluster: 0 },
      ];
      const fadeIn = reducedNow ? 1 : smoothstep(frac / 0.5);
      const cool = reducedNow ? 1 : smoothstep(frac / 0.5);
      /** The live weeks, each one drawn by `paint(wk, class, opacity)`; a week between two classes is drawn in both. */
      const liveWeeks = (from: number, paint: (wk: number, c: number, alpha: number) => void) => {
        for (let wk = from; wk < week; wk++) {
          const age = week - 1 - wk;
          if (age === 0) { paint(wk, 0, fadeIn); continue; }
          const c = cls(age), pc = cls(age - 1);
          // a real cross-fade: the old colour goes down as the new one comes up (drawn at full both, the
          // two would add up and flash)
          if (pc !== c && cool < 1) { paint(wk, c, cool); paint(wk, pc, 1 - cool); } else paint(wk, c, 1);
        }
      };
      if (close && !sharp && sc && sf && sf.zoom > 0.3) {
        // a big fire in a close-up: an accumulated base of the old weeks (one plate per block of
        // weeks), then each recent week from its own plate at the close-up's resolution, placed with
        // its opacity (rebuilt only when a week first shows, the last few kept)
        /*
         * Two plates per week, not one per week and colour: an accumulated base where every past
         * week is already in its old colour, and a hot plate per week. The newest week's hot plate
         * fades in; the previous one's fades out over the base, where that week already is old.
         */
        const base = zoomBase(a.id, Ea, week - 1);
        if (base) placePlate(ctx, world, base);
        const place = (pl: Plate, alpha: number) => { if (alpha <= 0.001) return; ctx.globalAlpha = alpha; placePlate(ctx, world, pl); ctx.globalAlpha = 1; };
        if (week >= 2) place(zoomHot(a.id, Ea, week - 2), 1 - cool);
        place(zoomHot(a.id, Ea, week - 1), fadeIn);
        return;
      }
      const ashW = sharp ? 0 : Math.max(0, Math.floor((week - LIVE_WEEKS - 1) / CHUNK) * CHUNK);
      for (let c0 = 0; c0 < ashW; c0 += CHUNK) placePlate(ctx, world, oldPlate(a.id, Ea, c0));
      if (sharp) {
        // a small fire in a close-up is drawn live (plates would be enlarged into blocks)
        liveWeeks(0, (wk, c, alpha) => {
          const st = STYLE[c];
          focusCells(ctx, W[wk], Ea.step, scale, proj, st.col, st.halo, dpr, st.size, WEEK_REF, 5, alpha, st.cluster);
        });
        return;
      }
      // each recent week from its own plate (map resolution), placed with its opacity
      liveWeeks(ashW, (wk, c, alpha) => {
        if (alpha <= 0.001) return;
        const st = STYLE[c];
        const key = `wk:${a.id}:${wk}:${c}`;
        if (!plates.has(key)) { weekKeys.push(key); while (weekKeys.length > 8) plates.delete(weekKeys.shift()!); }
        // away from a close-up the cluster glow is fainter: at that distance it would read as a burnt area
        const pl = plate(key, fireBox(Ea), FIRE_RES, (pg, pp) => focusCells(pg, W[wk], Ea.step, FIRE_RES, pp, st.col, st.halo, 1, st.size, WEEK_REF, Infinity, 1, st.cluster * 0.4));
        ctx.globalAlpha = alpha;
        placePlate(ctx, world, pl);
        ctx.globalAlpha = 1;
      });
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
        // relief on land only: the sea stays one flat dark tone, so the image never shows its edges
        if (!land && provs.length && neighbours) {
          land = new Path2D(neighbours);
          provs.forEach((p) => land!.addPath(p.path));
          landPlates.clear();
        }
        if (land) {
          // the coast: a faint light rim around the land, so it separates from the dark sea
          g.save();
          g.strokeStyle = C.coast;
          g.lineWidth = 2.2 * px;
          g.stroke(land);
          g.restore();
          // the relief already cut to the land (composited once, then only placed)
          const pl = landPlate(relief, RELIEF);
          g.drawImage(pl, x0, y0, x1 - x0, y1 - y0);
          // a close-up's own relief fades in as the camera comes down to it (it is 15-40 times sharper)
          const cam0 = cam!, span = cam0[1] - cam0[0];
          for (const cu of closeups) {
            const b = cu.box, bw = b[1] - b[0];
            if (!cu.ok || cam0[1] < b[0] || cam0[0] > b[1] || cam0[3] < b[2] || cam0[2] > b[3]) continue;
            const a = Math.min(1, Math.max(0, (bw * 4 - span) / (bw * 2.5)));
            if (a <= 0) continue;
            g.globalAlpha = a;
            g.drawImage(landPlate(cu.img, b), b[0] * K, -b[3], (b[1] - b[0]) * K, b[3] - b[2]);
          }
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
      // in a scene's close-up the visited fires' plates would be enlarged into blocks: they wait
      const visited = scale > FIRE_RES * 1.3 ? 0 : chapter === 6 ? 6 : Math.max(0, chapter);
      for (let i = 0; i < visited; i++) {
        const v = TOUR_EVENTS[i];
        world(g);
        g.strokeStyle = C.visited;
        g.lineWidth = 1.2 * px;
        provs.forEach((p) => { if (v.provs.includes(p.name)) g.stroke(p.path); });
        const Ev = foci.get(v.id);
        if (!Ev) continue;
        if (CELL_STORIES.has(v.id)) visitedZones(g, v.id, Ev, proj, scale);
        else placePlate(g, world, visitedPlate(v.id, Ev));
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
        const p = ex.prov ? provs.find((x) => x.name === ex.prov) : undefined;
        // with a province chosen the rest of the country steps back
        if (p) g.globalAlpha = 0.3;
        placePlate(g, world, plate('grid:' + ex.year, [-75, -52, -56, -21], 28, (pg, pp) => {
        // more foci, bigger and brighter square; only the two upper tiers glow
          tiers.forEach((list, i) => focusCells(pg, list, G.step, 28, pp, C.grid[i], 0.28, 1, 0.5, GRID_MAX));
        }));
        g.globalAlpha = 1;
        /*
         * Close on a province the national plate would be soft dots: its cells are drawn again as what
         * they are, squares of a quarter degree (about 25 km) in their colour, sharp, with a hairline
         * gap; only the province's own cells (their centre inside it): the rest stays dimmed around.
         */
        if (p) {
          const b = p.box, m = 0.5;
          placePlate(g, world, plate('grid:' + ex.year + ':' + p.name, [b[0] - m, b[1] + m, b[2] - m, b[3] + m], 120, (pg, pp) => {
            const st = G.step;
            tiers.forEach((list, i) => {
              pg.fillStyle = C.grid[i];
              pg.globalAlpha = 0.55 + 0.15 * i;
              for (const [lon, lat] of list) {
                if (lon < b[0] - m || lon > b[1] + m || lat < b[2] - m || lat > b[3] + m) continue;
                pg.setTransform(1, 0, 0, 1, 0, 0);
                if (!pg.isPointInPath(p.path, lon * K, -lat)) continue;
                const [x0, y0] = pp(lon - st / 2, lat + st / 2), [x1, y1] = pp(lon + st / 2, lat - st / 2);
                pg.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
              }
            });
            pg.globalAlpha = 1;
          }));
        }
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
        const tiers: Pt[][] = [[], [], [], []];
        for (const [lon, lat, n] of cells) tiers[Math.min(3, Math.floor((Math.log(n + 1) / lm) * 4))].push([lon, lat, n]);
        // the national opening reveals the cells strongest first, one tier after another; fifteen
        // years pile up, so small points keep it a density of detections, not a filled area
        const r = Math.min(1, moreTNow / MORE_OPEN / 0.75);
        const name = MORE_PROVINCES[moreNow];
        const pv = name ? provs.find((p) => p.name === name) : undefined;
        if (pv && 1 / px > 50) {
          // on a province the 25 km cells would grow into big discs: a plate of its surroundings at a
          // finer resolution keeps every cell a point of the same size (the last two are kept)
          const b = pv.box, cx = (b[0] + b[1]) / 2, cy = (b[2] + b[3]) / 2, hw = Math.max((b[1] - b[0]) * 1.4, 6), hh = Math.max((b[3] - b[2]) * 1.4, 6);
          const box: Box = [cx - hw, cx + hw, cy - hh, cy + hh];
          const key = 'grid:all:near:' + name;
          if (!plates.has(key)) { nearKeys.push(key); while (nearKeys.length > 2) plates.delete(nearKeys.shift()!); }
          placePlate(g, world, plate(key, box, 150, (pg, pp) => {
            const near = (c: Pt) => c[0] >= box[0] && c[0] <= box[1] && c[1] >= box[2] && c[1] <= box[3];
            tiers.forEach((list, i) => focusCells(pg, list.filter(near), 0.25, 150, pp, C.grid[i], 0.4, 1, 0.42, allMax, 12));
          }));
        } else for (let i = 3; i >= 0; i--) {
          const k = 3 - i, a = Math.min(1, Math.max(0, (r - k * 0.2) / 0.35));
          if (a <= 0) continue;
          g.globalAlpha = a;
          placePlate(g, world, plate('grid:all:' + i, [-75, -52, -56, -21], 56, (pg, pp) => {
            focusCells(pg, tiers[i], 0.25, 56, pp, C.grid[i], 0.25, 1, 0.42, allMax);
          }));
        }
        g.globalAlpha = 1;
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
    /** fade: opacity of the whole set (a week coming in); cluster: strength of the glow where detections crowd together. */
    /** The ceiling of a cluster's glow (its accumulated light is laid at most at this opacity). */
    const GLOW_CEIL = 0.6;
    let glowC: HTMLCanvasElement | null = null;
    const glowCanvas = (cw: number, ch: number) => {
      if (!glowC) glowC = document.createElement('canvas');
      if (glowC.width !== cw || glowC.height !== ch) { glowC.width = cw; glowC.height = ch; }
      return glowC;
    };
    const focusCells = (g: CanvasRenderingContext2D, list: Pt[], step: number, scale: number, proj: Proj, color: string, halo: number, device = dpr, size = 0, ref = WEEK_REF, cap = Infinity, fade = 1, cluster = 0) => {
      if (!list.length) return;
      g.setTransform(device, 0, 0, device, 0, 0);
      // px of the target; in a close-up a cell would grow into a disc, so it is capped: a detection
      // is a point, never an area
      const cell = Math.min(step * scale, cap);
      const lr = Math.log(ref + 1);
      const weight = (n: number) => Math.min(1, Math.log((n || 1) + 1) / lr);
      // the halo of the newest detections is amber, not their near-white core colour: added up between
      // neighbours a white halo burnt out into a pale patch (Chubut); the core stays white-yellow
      const hc = color === C.hot ? C.ember : color;
      const glow = sprite('glow:' + hc, [[0, hc], [0.25, hc + 'aa'], [1, hc + '00']]);
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
      if (fade <= 0.001) return;
      // the glow of a cluster: a wide, faint light per detection, added up, so it only builds up where
      // many detections crowd together (it marks density, not an outline: it has no edge)
      if (cluster > 0) {
        // a fixed size on the ground (about 0.1 degree), so it never grows into a patch when the
        // camera is far: its reach on screen shrinks with the scale, like the land. Amber, added up
        // apart and laid with a ceiling: where many detections crowd together it glows, but it never
        // burns out to a white patch (that would read as the size of the fire)
        const rc = Math.max(0.1 * scale, 6);
        const amber = sprite('glow:' + C.ember, [[0, C.ember], [0.25, C.ember + 'aa'], [1, C.ember + '00']]);
        const tmp = glowCanvas(g.canvas.width, g.canvas.height);
        const tg = tmp.getContext('2d')!;
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, tmp.width, tmp.height);
        tg.setTransform(device, 0, 0, device, 0, 0);
        tg.globalCompositeOperation = 'lighter';
        for (const [lon, lat, n] of list) {
          const [x, y] = proj(lon, lat);
          tg.globalAlpha = Math.min(1, cluster * 0.11 * (0.3 + 0.7 * weight(n)));
          tg.drawImage(amber, x - rc, y - rc, 2 * rc, 2 * rc);
        }
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = GLOW_CEIL * fade;
        g.drawImage(tmp, 0, 0);
        g.restore();
      }
      // glow, sized and weighted by the detections
      if (halo > 0) {
        g.globalCompositeOperation = 'lighter';
        for (const [lon, lat, n] of list) {
          const w = weight(n);
          const [x, y] = proj(lon, lat);
          const r = Math.max(cell * (1 + 1.6 * w) * k * 1.4, 3);
          g.globalAlpha = halo * (0.2 + 0.8 * w) * fade;
          g.drawImage(glow, x - r, y - r, 2 * r, 2 * r);
        }
      }
      // shadow + core (the core is half the sprite's radius)
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = fade;
      for (const [lon, lat, n] of list) {
        const [x, y] = proj(lon, lat);
        const r = Math.max(cell * (0.35 + 0.35 * weight(n)) * k * 1.4, 1.1) * 2;
        g.drawImage(dot, x - r, y - r, 2 * r, 2 * r);
      }
      g.globalAlpha = 1;
    };

    const unsub = subscribe(onFrame);
    return () => {
      live = false; cancelAnimationFrame(ticking); cancelAnimationFrame(hoverRaf); unsub(); unsubExplore(); ro.disconnect(); canvas.removeEventListener('click', onClick);
      window.removeEventListener('mousemove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave);
    };
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
      <canvas ref={fxv} className={styles.fx} data-tour-canvas="fx" aria-hidden="true" />
      <div ref={tipv} className={styles.tip} role="tooltip" hidden />
      <CineFire />
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
