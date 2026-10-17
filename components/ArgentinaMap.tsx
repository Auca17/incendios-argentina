'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import PROVINCIAS_GEOJSON from '../public/data/provincias.json';
import { ARGENTINA_VIEWBOX, ARGENTINA_STATIC_PATHS } from '../lib/argentinaStaticSvg';
import { loadFoci, type Foci } from '../lib/data';
import styles from './ArgentinaMap.module.css';

// Argentina continental bounding box: [minLon, maxLon, minLat, maxLat]
const LON0 = -73.6, LON1 = -53.6, LAT0 = -55.1, LAT1 = -21.7;
const K = Math.cos((38 * Math.PI) / 180);
const COUNTRY_BOX = [LON0, LON1, LAT0, LAT1];

// Natural biome colors per province
export const BIOME_COLORS: Record<string, string> = {
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

// Target regions in North-to-South sequence
export const CHAPTER_CONFIG = [
  { id: 'misiones', name: 'Misiones', provs: ['Misiones'] },
  { id: 'corrientes', name: 'Corrientes', provs: ['Corrientes'] },
  { id: 'cordoba', name: 'Córdoba', provs: ['Córdoba'] },
  { id: 'delta', name: 'Delta del Paraná', provs: ['Santa Fe', 'Entre Ríos', 'Buenos Aires'] },
  { id: 'mendoza', name: 'Mendoza', provs: ['Mendoza'] },
  { id: 'chubut', name: 'Chubut', provs: ['Chubut'] },
];

type Props = {
  chapterIndex: number; // -1: Intro, 0..5: Provinces, 6: Full country wide shot / Epilogue
  chapterProgress: number; // 0..1 within current chapter
  onProvinceClick?: (name: string) => void;
};

type PathItem = { name: string; path: Path2D };

/**
 * Persistent Cartographic Canvas Scene with Progressive Rendering:
 * 1. FRAME 0: Renders instant inline SVG with all 24 provinces & biome colors (never blank/white).
 * 2. FRAME 1+: Hardware-accelerated HTML5 Canvas mounts, interpolates camera smoothly,
 *    burns provinces into charcoal black irreversibly, and renders real NASA satellite fire pixels.
 */
export default function ArgentinaMap({
  chapterIndex,
  chapterProgress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Cached fire datasets
  const fociMapRef = useRef<Map<string, Foci>>(new Map());

  // Camera interpolation state: [minLon, maxLon, minLat, maxLat]
  const cameraRef = useRef<number[]>([...COUNTRY_BOX]);
  const targetCameraRef = useRef<number[]>([...COUNTRY_BOX]);

  const chapterIndexRef = useRef(chapterIndex);
  chapterIndexRef.current = chapterIndex;
  const chapterProgressRef = useRef(chapterProgress);
  chapterProgressRef.current = chapterProgress;

  // Pre-load satellite foci data asynchronously
  useEffect(() => {
    let active = true;
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

  // Compute camera bounding box for active chapter
  const getBoxForProvinces = useCallback((provNames: string[]): number[] => {
    const geo = (PROVINCIAS_GEOJSON as any).features || [];
    if (!geo.length || !provNames.length) return [...COUNTRY_BOX];

    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    geo.forEach((f: any) => {
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
    const padX = Math.max(spanX * 0.28, 0.8);
    const padY = Math.max(spanY * 0.28, 0.8);
    return [minLon - padX, maxLon + padX, minLat - padY, maxLat + padY];
  }, []);

  // Update target camera box based on active chapter
  useEffect(() => {
    if (chapterIndex < 0 || chapterIndex >= CHAPTER_CONFIG.length) {
      targetCameraRef.current = [...COUNTRY_BOX];
    } else {
      const cfg = CHAPTER_CONFIG[chapterIndex];
      targetCameraRef.current = getBoxForProvinces(cfg.provs);
    }
  }, [chapterIndex, getBoxForProvinces]);

  // Main 60 FPS Canvas rendering loop
  useEffect(() => {
    const cv = canvasRef.current;
    const cont = containerRef.current;
    if (!cv || !cont) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const geo = (PROVINCIAS_GEOJSON as any).features || [];

    const render = () => {
      animId = requestAnimationFrame(render);

      // Read real layout dimensions from container
      const w = cont.clientWidth;
      const h = cont.clientHeight;
      if (w <= 10 || h <= 10) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (cv.width !== targetW || cv.height !== targetH) {
        cv.width = targetW;
        cv.height = targetH;
      }

      // Smooth camera interpolation (lerp)
      const curCam = cameraRef.current;
      const tgtCam = targetCameraRef.current;
      const lerpSpeed = 0.085;
      for (let i = 0; i < 4; i++) {
        curCam[i] += (tgtCam[i] - curCam[i]) * lerpSpeed;
      }

      // Compute projection frame
      const viewW = (curCam[1] - curCam[0]) * K;
      const viewH = curCam[3] - curCam[2];
      const scale = Math.min(w / viewW, h / viewH) * 0.90;
      const ox = (w - viewW * scale) / 2;
      const oy = (h - viewH * scale) / 2;

      const project = (lon: number, lat: number): [number, number] => [
        ox + (lon - curCam[0]) * K * scale,
        oy + (curCam[3] - lat) * scale,
      ];

      // Build Path2D objects for each province
      const paths: PathItem[] = geo.map((f: any) => {
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
        return { name: f.properties.name as string, path: p };
      });

      // Clear with dark atmospheric background
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0a0807';
      ctx.fillRect(0, 0, w, h);

      const activeIdx = chapterIndexRef.current;
      const activeProgress = chapterProgressRef.current;
      const activeCfg = activeIdx >= 0 && activeIdx < CHAPTER_CONFIG.length ? CHAPTER_CONFIG[activeIdx] : null;
      const activeProvs = activeCfg ? activeCfg.provs : [];

      // Persistent charcoal carbon state
      const carbonMap = new Map<string, number>();
      CHAPTER_CONFIG.forEach((cfg, i) => {
        let val = 0;
        if (activeIdx > i) {
          val = 1; // Completed province persists in charcoal black
        } else if (activeIdx === i) {
          val = Math.min(1, activeProgress * 1.5);
        }
        cfg.provs.forEach((pName) => {
          const prev = carbonMap.get(pName) || 0;
          carbonMap.set(pName, Math.max(prev, val));
        });
      });

      // 1. Fill Provinces (Natural Biomes -> Charcoal Black)
      paths.forEach(({ name, path }) => {
        const baseColor = BIOME_COLORS[name] || '#455038';
        const carbon = carbonMap.get(name) || 0;

        if (carbon > 0.01) {
          ctx.fillStyle = carbon >= 0.99
            ? '#110f0e'
            : interpolateColor(baseColor, '#110f0e', carbon);
        } else {
          ctx.fillStyle = baseColor;
        }
        ctx.fill(path);
      });

      // 2. Stroke Provincial Boundaries
      ctx.lineJoin = 'round';
      paths.forEach(({ name, path }) => {
        const isActive = activeProvs.includes(name);
        const carbon = carbonMap.get(name) || 0;

        if (isActive) {
          // Prominent glowing border for current province
          ctx.shadowColor = 'rgba(255, 162, 54, 0.9)';
          ctx.shadowBlur = 10;
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
          // Subtle natural boundary
          ctx.strokeStyle = 'rgba(235, 225, 210, 0.28)';
          ctx.lineWidth = 0.75;
          ctx.stroke(path);
        }
      });

      // 3. Render Real NASA Heat Foci Pixels
      CHAPTER_CONFIG.forEach((cfg, i) => {
        let fireP = 0;
        if (activeIdx > i) {
          fireP = 1; // Completed fire map persists forever
        } else if (activeIdx === i) {
          fireP = Math.max(0, (activeProgress - 0.15) / 0.85);
        }

        if (fireP <= 0.01) return;

        const foci = fociMapRef.current.get(cfg.id);
        if (!foci || !foci.cells) return;

        const maxWeek = Math.max(1, Math.floor(foci.weeks * fireP));
        const dotSize = Math.max(scale * foci.step * K, 2.6);

        foci.cells.forEach(([lon, lat, week]) => {
          if (week >= maxWeek) return;
          const [px, py] = project(lon, lat);

          const age = maxWeek - week;
          if (age < 2) {
            ctx.fillStyle = '#ffea7a'; // Bright yellow-orange flame
          } else if (age < 6) {
            ctx.fillStyle = '#ff7a1a'; // Glowing hot ember
          } else {
            ctx.fillStyle = '#b3300f'; // Calcinated dark red
          }

          ctx.fillRect(px - dotSize / 2, py - dotSize / 2, dotSize, dotSize);
        });
      });

      // Mark canvas as actively drawing
      if (!canvasReady) {
        setCanvasReady(true);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [canvasReady]);

  const activeCfg = chapterIndex >= 0 && chapterIndex < CHAPTER_CONFIG.length ? CHAPTER_CONFIG[chapterIndex] : null;
  const activeProvs = activeCfg ? activeCfg.provs : [];

  return (
    <div ref={containerRef} className={styles.mapContainer}>
      {/* 1. FRAME-0 STATIC SVG FALLBACK: Guarantees Argentina is visible instantly without network delay */}
      <svg
        className={`${styles.fallbackSvg} ${canvasReady ? styles.fallbackHidden : styles.fallbackVisible}`}
        viewBox={ARGENTINA_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden={canvasReady}
      >
        <rect width="400" height="800" fill="#0a0807" />
        {Object.entries(ARGENTINA_STATIC_PATHS).map(([pName, dStr]) => {
          const baseColor = BIOME_COLORS[pName] || '#455038';
          const isActive = activeProvs.includes(pName);
          return (
            <path
              key={pName}
              d={dStr}
              fill={baseColor}
              className={isActive ? styles.countryActive : styles.countryBorder}
            />
          );
        })}
      </svg>

      {/* 2. PERSISTENT INTERACTIVE CANVAS: Smooth camera zoom, fire dots, and carbon transformation */}
      <canvas
        ref={canvasRef}
        className={styles.mapCanvas}
        role="img"
        aria-label="Mapa cartográfico interactivo de Argentina con detección satelital de incendios"
      />
    </div>
  );
}

/** Utility: Hex/RGB color interpolation */
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
