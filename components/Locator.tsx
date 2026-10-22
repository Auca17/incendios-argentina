'use client';
import { useEffect, useRef } from 'react';
import { loadProvincias } from '../lib/data';

/*
 * A small map that says where a region is: Argentina with the region's provinces lit and a dot on the
 * place of the story ('country'), or the region itself with its neighbours and the dot ('region', in
 * "Más información"). Natural Earth provinces (public/data/provincias.json), drawn once per change.
 */
type Box = [number, number, number, number];
const K = Math.cos((38 * Math.PI) / 180);
const ARGENTINA: Box = [-74.2, -52.8, -55.4, -21.6];

type Props = { provs: string[]; marker?: [number, number]; mode?: 'country' | 'region'; label: string; className?: string };

export default function Locator({ provs, marker, mode = 'country', label, className }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    let live = true;
    const draw = (fc: any) => {
      if (!live) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const g = canvas.getContext('2d')!;
      let box: Box = ARGENTINA;
      if (mode === 'region') {
        const b: Box = [180, -180, 90, -90];
        fc.features.forEach((f: any) => {
          if (!provs.includes(f.properties.name)) return;
          walk(f.geometry, (lon, lat) => {
            if (lon < b[0]) b[0] = lon; if (lon > b[1]) b[1] = lon;
            if (lat < b[2]) b[2] = lat; if (lat > b[3]) b[3] = lat;
          }, true);
        });
        const px = Math.max((b[1] - b[0]) * 0.25, 0.8), py = Math.max((b[3] - b[2]) * 0.25, 0.8);
        box = [b[0] - px, b[1] + px, b[2] - py, b[3] + py];
      }
      const sx = (box[1] - box[0]) * K, sy = box[3] - box[2];
      const s = Math.min(w / sx, h / sy) * 0.94;
      const ox = (w - sx * s) / 2 - box[0] * K * s, oy = (h - sy * s) / 2 + box[3] * s;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const path = (f: any) => {
        const p = new Path2D();
        walk(f.geometry, (lon, lat, first) => (first ? p.moveTo(ox + lon * K * s, oy - lat * s) : p.lineTo(ox + lon * K * s, oy - lat * s)), false, () => p.closePath());
        return p;
      };
      g.lineJoin = 'round';
      fc.features.forEach((f: any) => {
        const on = provs.includes(f.properties.name);
        const p = path(f);
        g.fillStyle = on ? 'rgba(255,154,92,0.9)' : 'rgba(195,204,213,0.14)';
        g.fill(p);
        g.strokeStyle = on ? 'rgba(255,190,140,0.9)' : 'rgba(195,204,213,0.32)';
        g.lineWidth = mode === 'region' ? 1 : 0.6;
        g.stroke(p);
      });
      if (marker) {
        const x = ox + marker[0] * K * s, y = oy - marker[1] * s;
        g.beginPath(); g.arc(x, y, mode === 'region' ? 9 : 5, 0, Math.PI * 2);
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); g.arc(x, y, mode === 'region' ? 3.5 : 2, 0, Math.PI * 2);
        g.fillStyle = '#fff'; g.fill();
      }
    };
    let fcRef: any = null;
    loadProvincias().then((fc) => { fcRef = fc; draw(fc); }, () => {});
    const ro = new ResizeObserver(() => { if (fcRef) draw(fcRef); });
    ro.observe(canvas);
    return () => { live = false; ro.disconnect(); };
  }, [provs, marker, mode]);

  return <canvas ref={cv} className={className} role="img" aria-label={label} />;
}

/** Calls fn for every vertex of a (multi)polygon; outer rings only when `outer`. */
function walk(geom: any, fn: (lon: number, lat: number, first: boolean) => void, outer: boolean, close?: () => void) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  polys.forEach((poly: number[][][]) => (outer ? [poly[0]] : poly).forEach((ring) => {
    ring.forEach(([lon, lat], i) => fn(lon, lat, i === 0));
    close?.();
  }));
}
