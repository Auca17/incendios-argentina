'use client';
import { useEffect, useRef } from 'react';
import { loadFoci, loadProvincias, type Foci } from '../lib/data';
import { fociWeek } from '../lib/fire';
import { TOUR_EVENTS } from '../lib/tour';
import { request, subscribe, type Frame } from '../lib/scrollDriver';
import { mapRect } from '../lib/tourLayout';
import styles from './TourMap.module.css';

/*
 * Map of the tour, drawn on one canvas. Everything it shows comes from the scroll state:
 *  - territory in a neutral cold slate (no biome or land-cover layer: the project has no such data);
 *  - provincial borders, 1 px, faded in when Argentina is revealed;
 *  - the active fire's provinces outlined in amber, its weekly foci lit up to the current week;
 *  - visited provinces keep only a dim outline and their real accumulated foci as ash dots.
 *    No province is ever filled as burnt: the foci are the only marks.
 * The camera follows a spring (tension 0.052, friction 0.78) whose target depends only on the
 * chapter, and snaps exactly onto the target when it settles, so a scroll position always ends on
 * the same frame.
 */
const K = Math.cos((38 * Math.PI) / 180);
const COUNTRY: Box = [-74.2, -52.8, -55.4, -21.6];
const TENSION = 0.052;
const FRICTION = 0.78;

type Box = [number, number, number, number]; // minLon, maxLon, minLat, maxLat
type Prov = { name: string; path: Path2D; box: Box };

const C = {
  sea0: '#08121f',
  sea1: '#050c16',
  land0: '#16222e',
  land1: '#1f2f3d',
  border: '49, 70, 90',
  visited: 'rgba(122, 140, 158, 0.55)',
  active: '#ffa236',
  activeGlow: 'rgba(255, 162, 54, 0.22)',
  hot: '#ffd27a',
  ember: '#ff8a1f',
  deep: '#b3361a',
  ash: '#4a4540',
  ashLit: '#6e655c',
};

export default function TourMap() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext('2d')!;
    let provs: Prov[] = [];
    const foci = new Map<string, Foci>();
    let live = true;

    loadProvincias().then((fc) => {
      if (!live) return;
      provs = fc.features.map((f: any) => toProv(f));
      request();
    }, () => {});
    TOUR_EVENTS.forEach((ev) => loadFoci(ev.id).then((E) => { if (live) { foci.set(ev.id, E); request(); } }, () => {}));

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
      if (chapter < 0 || chapter > 5 || !provs.length) return COUNTRY;
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
        const eps = i < 4 ? 0.002 : 0.5;
        if (Math.abs(target[i] - cam[i]) < eps && Math.abs(vel[i]) < eps) { cam[i] = target[i]; vel[i] = 0; } else moving = true;
      }

      const ev = st.chapter >= 0 && st.chapter <= 5 ? TOUR_EVENTS[st.chapter] : null;
      const E = ev ? foci.get(ev.id) : undefined;
      const week = E ? fociWeek(E, st.chapterT) : 0;
      const key = [cam.map((v) => v.toFixed(4)).join(','), st.chapter, week, st.borders.toFixed(3), provs.length, foci.size, w, h].join('|');
      if (key !== lastKey) {
        lastKey = key;
        draw(st.chapter, week, st.borders);
      }
      return moving;
    };

    /*
     * Layers, so a scroll frame inside a fire draws little: `base` holds sea, land, borders and the
     * visited fires (rebuilt when the camera, the chapter or the borders change); `ash` holds the
     * active fire's weeks older than 8, extended week by week; only the 8 recent weeks are drawn
     * each frame. Same scroll position, same layers, same pixels.
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
      if (base.width !== canvas.width || base.height !== canvas.height) {
        base.width = ash.width = canvas.width;
        base.height = ash.height = canvas.height;
        baseKey = ashKey = '';
      }
      const camKey = c.map((v) => v.toFixed(4)).join(',') + '|' + w + 'x' + h;

      const bk = [camKey, chapter, borders.toFixed(3), provs.length, foci.size].join('|');
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
        ctx.strokeStyle = C.activeGlow;
        ctx.lineWidth = 6 * px;
        ctx.stroke(p.path);
        ctx.strokeStyle = C.active;
        ctx.lineWidth = 1.6 * px;
        ctx.stroke(p.path);
      });
      if (!Ea) return;
      const W = weeksOf(a.id, Ea);
      const ashW = Math.max(0, week - 8);
      const ak = camKey + '|' + chapter;
      if (ak !== ashKey || ashW < ashWeek) {
        ashKey = ak;
        actx.setTransform(1, 0, 0, 1, 0, 0);
        actx.clearRect(0, 0, ash.width, ash.height);
        ashWeek = 0;
      }
      if (ashW > ashWeek) {
        world(actx);
        actx.fillStyle = C.ash;
        for (let wk = ashWeek; wk < ashW; wk++) cells(actx, W[wk], Ea.step, px);
        ashWeek = ashW;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(ash, 0, 0);
      world(ctx);
      for (let wk = ashW; wk < week; wk++) {
        const age = week - 1 - wk;
        ctx.fillStyle = age < 1 ? C.hot : age < 3 ? C.ember : C.deep;
        cells(ctx, W[wk], Ea.step, px);
      }
    };

    const drawBase = (g: CanvasRenderingContext2D, world: (g: CanvasRenderingContext2D) => void, chapter: number, borders: number, px: number) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sea = g.createLinearGradient(0, 0, 0, h);
      sea.addColorStop(0, C.sea0);
      sea.addColorStop(1, C.sea1);
      g.fillStyle = sea;
      g.fillRect(0, 0, w, h);
      if (!provs.length) return;

      world(g);
      const land = g.createLinearGradient(0, 21, 0, 56);
      land.addColorStop(0, C.land1);
      land.addColorStop(1, C.land0);
      g.fillStyle = land;
      provs.forEach((p) => g.fill(p.path));

      g.lineJoin = 'round';
      if (borders > 0) {
        g.strokeStyle = `rgba(${C.border}, ${(0.6 * borders).toFixed(3)})`;
        g.lineWidth = px;
        provs.forEach((p) => g.stroke(p.path));
      }

      // visited fires: dim outline + all their foci as ash (the last two weeks a little lighter)
      const visited = chapter === 6 ? 6 : Math.max(0, chapter);
      for (let i = 0; i < visited; i++) {
        const v = TOUR_EVENTS[i];
        g.strokeStyle = C.visited;
        g.lineWidth = 1.2 * px;
        provs.forEach((p) => { if (v.provs.includes(p.name)) g.stroke(p.path); });
        const Ev = foci.get(v.id);
        if (!Ev) continue;
        const W = weeksOf(v.id, Ev);
        for (let wk = 0; wk < Ev.weeks; wk++) {
          g.fillStyle = Ev.weeks - 1 - wk < 2 ? C.ashLit : C.ash;
          cells(g, W[wk], Ev.step, px);
        }
      }
    };

    /** One week of 0.05-degree cells, at least 2.4 px wide so isolated foci stay visible. */
    const cells = (g: CanvasRenderingContext2D, list: [number, number][], step: number, px: number) => {
      const sx = Math.max(step * K, 2.4 * px);
      const sy = Math.max(step, 2.4 * px);
      for (const [lon, lat] of list) g.fillRect(lon * K - sx / 2, -lat - sy / 2, sx, sy);
    };

    const unsub = subscribe(onFrame);
    return () => { live = false; unsub(); ro.disconnect(); };
  }, []);

  return (
    <div ref={wrap} className={styles.map}>
      <canvas
        ref={cv}
        className={styles.canvas}
        data-tour-canvas="map"
        role="img"
        aria-label="Mapa de Argentina con sus provincias y los focos de calor semanales detectados por satélite en cada incendio del recorrido"
      />
    </div>
  );
}

function toProv(f: any): Prov {
  const p = new Path2D();
  const b: Box = [180, -180, 90, -90];
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  polys.forEach((poly: number[][][]) => {
    poly.forEach((ring) => {
      ring.forEach(([lon, lat], i) => {
        if (i === 0) p.moveTo(lon * K, -lat); else p.lineTo(lon * K, -lat);
        if (lon < b[0]) b[0] = lon; if (lon > b[1]) b[1] = lon;
        if (lat < b[2]) b[2] = lat; if (lat > b[3]) b[3] = lat;
      });
      p.closePath();
    });
  });
  return { name: f.properties.name, path: p, box: b };
}
