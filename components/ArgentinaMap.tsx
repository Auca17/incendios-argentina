'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProvincias, loadFoci, type Foci } from '../lib/data';
import { EVENTS } from '../lib/events';

// Argentina bounding box: [minLon, maxLon, minLat, maxLat]
const LON0 = -73.8, LON1 = -53.4, LAT0 = -55.3, LAT1 = -21.6;
const K = Math.cos((38 * Math.PI) / 180);
const COUNTRY_BOX = [LON0, LON1, LAT0, LAT1];

// Natural biome colors per province
const BIOME_COLORS: Record<string, string> = {
  'Misiones': '#264e32',
  'Corrientes': '#2d5a44',
  'Entre Ríos': '#335c46',
  'Santa Fe': '#445938',
  'Chaco': '#4c5732',
  'Formosa': '#465530',
  'Santiago del Estero': '#505234',
  'Córdoba': '#5a5336',
  'San Luis': '#5e5439',
  'Buenos Aires': '#425838',
  'Ciudad de Buenos Aires': '#3e5538',
  'La Pampa': '#525238',
  'Mendoza': '#665542',
  'San Juan': '#6a5845',
  'La Rioja': '#685644',
  'Catamarca': '#6d5d4b',
  'Tucumán': '#325236',
  'Salta': '#4a533c',
  'Jujuy': '#5a5746',
  'Neuquén': '#484f42',
  'Río Negro': '#564e42',
  'Chubut': '#4e483e',
  'Santa Cruz': '#4a443a',
  'Tierra del Fuego': '#33433e',
};

// Target regions in North-to-South order
export const CHAPTER_CONFIG = [
  { id: 'misiones', name: 'Misiones', provs: ['Misiones'] },
  { id: 'corrientes', name: 'Corrientes', provs: ['Corrientes'] },
  { id: 'cordoba', name: 'Córdoba', provs: ['Córdoba'] },
  { id: 'delta', name: 'Delta del Paraná', provs: ['Santa Fe', 'Entre Ríos', 'Buenos Aires'] },
  { id: 'mendoza', name: 'Mendoza', provs: ['Mendoza'] },
  { id: 'chubut', name: 'Chubut', provs: ['Chubut'] },
];

type Props = {
  chapterIndex: number; // -1: Intro, 0..5: The 6 provinces, 6: Final wide view / Epilogue
  chapterProgress: number; // 0 to 1 within the current active chapter
  onProvinceClick?: (name: string) => void;
};

type PathItem = { name: string; path: Path2D; box: number[] };

/**
 * Single persistent cartographic canvas for the whole experience.
 * Features:
 *  - Geographically accurate GeoJSON geometries for all 23 provinces + CABA.
 *  - Biome-based natural coloring that progressively transforms into charcoal black.
 *  - Persistent memory: completed provinces stay black with their fire foci indefinitely.
 *  - Smooth cinematic camera zoom/pan between full country and regional close-ups.
 *  - Real NASA satellite heat foci dots rendered on the darkened territory.
 */
export default function ArgentinaMap({
  chapterIndex,
  chapterProgress,
  onProvinceClick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geoRef = useRef<any[]>([]);
  const [geo, setGeo] = useState<any[]>([]);
  const pathsRef = useRef<PathItem[]>([]);
  const fociMapRef = useRef<Map<string, Foci>>(new Map());

  // Camera interpolation state: [minLon, maxLon, minLat, maxLat]
  const cameraRef = useRef<number[]>([...COUNTRY_BOX]);
  const targetCameraRef = useRef<number[]>([...COUNTRY_BOX]);

  const chapterIndexRef = useRef(chapterIndex);
  chapterIndexRef.current = chapterIndex;
  const chapterProgressRef = useRef(chapterProgress);
  chapterProgressRef.current = chapterProgress;

  // 1. Load GeoJSON provinces and all 6 fire event datasets
  useEffect(() => {
    let active = true;

    loadProvincias().then((fc) => {
      if (!active) return;
      geoRef.current = fc.features;
      setGeo(fc.features);
    });

    CHAPTER_CONFIG.forEach((c) => {
      loadFoci(c.id).then((foci) => {
        if (!active) return;
        fociMapRef.current.set(c.id, foci);
      });
    });

    return () => {
      active = false;
    };
  }, []);

  // 2. Compute camera target bounding box
  const getBoxForProvinces = useCallback((provNames: string[]): number[] => {
    if (!geo.length || !provNames.length) return [...COUNTRY_BOX];

    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    geo.forEach((f) => {
      if (!provNames.includes(f.properties.name)) return;
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach((poly: number[][][]) => {
        poly[0].forEach((pt) => {
          if (pt[0] < minLon) minLon = pt[0];
          if (pt[0] > maxLon) maxLon = pt[0];
          if (pt[1] < minLat) minLat = pt[1];
          if (pt[1] > maxLat) maxLat = pt[1];
        });
      });
    });

    if (minLon > maxLon) return [...COUNTRY_BOX];
    const spanX = maxLon - minLon;
    const spanY = maxLat - minLat;
    const padX = Math.max(spanX * 0.22, 0.6);
    const padY = Math.max(spanY * 0.22, 0.6);
    return [minLon - padX, maxLon + padX, minLat - padY, maxLat + padY];
  }, [geo]);

  // Update target camera box based on active chapter
  useEffect(() => {
    if (!geo.length || chapterIndex < 0 || chapterIndex >= CHAPTER_CONFIG.length) {
      targetCameraRef.current = [...COUNTRY_BOX];
    } else {
      const cfg = CHAPTER_CONFIG[chapterIndex];
      targetCameraRef.current = getBoxForProvinces(cfg.provs);
    }
  }, [geo, chapterIndex, getBoxForProvinces]);

  // 3. Animation loop & rendering
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let dpr = window.devicePixelRatio || 1;

    const render = () => {
      animId = requestAnimationFrame(render);

      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (w <= 0 || h <= 0) return;

      const expectedW = Math.round(w * dpr);
      const expectedH = Math.round(h * dpr);
      if (cv.width !== expectedW || cv.height !== expectedH) {
        cv.width = expectedW;
        cv.height = expectedH;
      }

      // Smooth camera interpolation (lerp)
      const curCam = cameraRef.current;
      const tgtCam = targetCameraRef.current;
      const lerpSpeed = 0.085;
      for (let i = 0; i < 4; i++) {
        curCam[i] += (tgtCam[i] - curCam[i]) * lerpSpeed;
      }

      // Compute exact projection frame for the current camera view
      const viewW = (curCam[1] - curCam[0]) * K;
      const viewH = curCam[3] - curCam[2];
      const scale = Math.min(w / viewW, h / viewH) * 0.88;
      const ox = (w - viewW * scale) / 2;
      const oy = (h - viewH * scale) / 2;

      const project = (lon: number, lat: number): [number, number] => [
        ox + (lon - curCam[0]) * K * scale,
        oy + (curCam[3] - lat) * scale,
      ];

      // Build SVG paths if not cached or camera moved
      const geo = geoRef.current;
      const paths = geo.map((f) => {
        const p = new Path2D();
        const g = f.geometry;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
        polys.forEach((poly: number[][][]) => {
          poly.forEach((ring) => {
            ring.forEach((pt, idx) => {
              const q = project(pt[0], pt[1]);
              if (idx === 0) p.moveTo(q[0], q[1]);
              else p.lineTo(q[0], q[1]);
            });
            p.closePath();
          });
        });
        return { name: f.properties.name as string, path: p, box: [] };
      });
      pathsRef.current = paths;

      // 4. DRAWING
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const activeIdx = chapterIndexRef.current;
      const activeProgress = chapterProgressRef.current;
      const activeCfg = activeIdx >= 0 && activeIdx < CHAPTER_CONFIG.length ? CHAPTER_CONFIG[activeIdx] : null;
      const activeProvs = activeCfg ? activeCfg.provs : [];

      // Determine carbon state per province
      // If chapter > i: completed, persists in black (1.0)
      // If chapter === i: darkens progressively (0.0 to 1.0)
      // If chapter < i: unvisited natural biome (0.0)
      const carbonMap = new Map<string, number>();
      CHAPTER_CONFIG.forEach((cfg, i) => {
        let val = 0;
        if (activeIdx > i) {
          val = 1; // Persistent charcoal black
        } else if (activeIdx === i) {
          val = Math.min(1, activeProgress * 1.6);
        }
        cfg.provs.forEach((pName) => {
          const prev = carbonMap.get(pName) || 0;
          carbonMap.set(pName, Math.max(prev, val));
        });
      });

      // A. Fill provinces (Natural biomes -> Charcoal Black)
      paths.forEach(({ name, path }) => {
        const baseColor = BIOME_COLORS[name] || '#455038';
        const carbon = carbonMap.get(name) || 0;

        if (carbon > 0.01) {
          // Interpolate to charcoal black #0f0d0b
          ctx.fillStyle = carbon >= 0.99
            ? '#110f0e'
            : interpolateColor(baseColor, '#110f0e', carbon);
        } else {
          ctx.fillStyle = baseColor;
        }
        ctx.fill(path);
      });

      // B. Stroke province boundaries
      ctx.lineJoin = 'round';
      paths.forEach(({ name, path }) => {
        const isActive = activeProvs.includes(name);
        const carbon = carbonMap.get(name) || 0;

        if (isActive) {
          // Highlighted active territory
          ctx.shadowColor = 'rgba(255, 140, 20, 0.9)';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#ffa236';
          ctx.lineWidth = 2.4;
          ctx.stroke(path);
          ctx.shadowBlur = 0;
        } else if (carbon > 0.8) {
          // Burned border memory
          ctx.strokeStyle = 'rgba(197, 82, 33, 0.45)';
          ctx.lineWidth = 1.0;
          ctx.stroke(path);
        } else {
          // Natural soft territory border
          ctx.strokeStyle = 'rgba(235, 225, 210, 0.28)';
          ctx.lineWidth = 0.75;
          ctx.stroke(path);
        }
      });

      // C. Draw Fire Foci Pixels (accumulating and persistent!)
      CHAPTER_CONFIG.forEach((cfg, i) => {
        let fireP = 0;
        if (activeIdx > i) {
          fireP = 1; // Persistent complete fire map
        } else if (activeIdx === i) {
          fireP = Math.max(0, (activeProgress - 0.18) / 0.82);
        }

        if (fireP <= 0.01) return;

        const foci = fociMapRef.current.get(cfg.id);
        if (!foci || !foci.cells) return;

        const maxWeek = Math.max(1, Math.floor(foci.weeks * fireP));
        const dotSize = Math.max(scale * foci.step * K, 2.4);

        foci.cells.forEach(([lon, lat, week]) => {
          if (week >= maxWeek) return;
          const [px, py] = project(lon, lat);

          const age = maxWeek - week;
          if (age < 2) {
            ctx.fillStyle = '#ffea7a'; // Fresh bright flame
          } else if (age < 6) {
            ctx.fillStyle = '#ff7a1a'; // Glowing ember
          } else {
            ctx.fillStyle = '#b3300f'; // Darker burnt red
          }

          ctx.fillRect(px - dotSize / 2, py - dotSize / 2, dotSize, dotSize);
        });
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0807]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        role="img"
        aria-label="Mapa cartográfico persistente de la República Argentina con monitoreo satelital de incendios"
      />
    </div>
  );
}

/** Utility: simple hex/rgb color interpolation */
function interpolateColor(col1: string, col2: string, factor: number): string {
  const c1 = parseInt(col1.replace('#', ''), 16);
  const c2 = parseInt(col2.replace('#', ''), 16);

  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}
