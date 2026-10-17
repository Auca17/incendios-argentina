'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import PROVINCIAS_GEOJSON from '../public/data/provincias.json';
import { ARGENTINA_VIEWBOX, ARGENTINA_STATIC_PATHS } from '../lib/argentinaStaticSvg';
import { loadFoci, type Foci } from '../lib/data';
import styles from './ArgentinaMap.module.css';

// Argentina continental + South Atlantic Ocean bounding box: [minLon, maxLon, minLat, maxLat]
// Extended eastward (-49.0) and southward (-56.5) to capture the Atlantic maritime shelf & Tierra del Fuego
const LON0 = -75.2, LON1 = -49.0, LAT0 = -56.5, LAT1 = -21.0;
const K = Math.cos((38 * Math.PI) / 180);
const COUNTRY_BOX = [LON0, LON1, LAT0, LAT1];

// Stylized natural landscape & biome palette (continuous, borderless terrain)
export const BIOME_COLORS: Record<string, string> = {
  // Nordeste: Selva subtropical, humedales y vegetación exuberante
  'Misiones': '#1d4525',
  'Corrientes': '#244d34',
  'Entre Ríos': '#2b5438',

  // Centro y llanura pampeana: Pastizales, campos y sierras
  'Santa Fe': '#3b4d2f',
  'Buenos Aires': '#36492c',
  'Ciudad de Buenos Aires': '#33442a',
  'Córdoba': '#524b33',
  'La Pampa': '#494830',

  // Chaco y Norte: Parque chaqueño, monte y transición
  'Chaco': '#46502e',
  'Formosa': '#424d2c',
  'Santiago del Estero': '#4d4b30',

  // Noroeste (NOA): Yungas a valles andinos
  'Tucumán': '#29482e',
  'Salta': '#444d36',
  'Jujuy': '#53503c',

  // Cuyo y Oeste: Tierras áridas, desérticas, ocres y cordillera
  'Mendoza': '#63533e',
  'San Juan': '#695742',
  'La Rioja': '#685641',
  'Catamarca': '#6c5a45',
  'San Luis': '#5a5036',

  // Patagonia: Estepas frías, mesetas y bosques andino-patagónicos
  'Neuquén': '#44483a',
  'Río Negro': '#4c4538',
  'Chubut': '#433e33',
  'Santa Cruz': '#3e3930',
  'Tierra del Fuego': '#283632',
};

// Target narrative regions in North-to-South sequence
export const CHAPTER_CONFIG = [
  { id: 'misiones', name: 'Misiones', provs: ['Misiones'] },
  { id: 'corrientes', name: 'Corrientes', provs: ['Corrientes'] },
  { id: 'cordoba', name: 'Córdoba', provs: ['Córdoba'] },
  { id: 'delta', name: 'Delta del Paraná', provs: ['Santa Fe', 'Entre Ríos', 'Buenos Aires'] },
  { id: 'mendoza', name: 'Mendoza', provs: ['Mendoza'] },
  { id: 'chubut', name: 'Chubut', provs: ['Chubut'] },
];

type Props = {
  chapterIndex: number; // -1: Intro, 0..5: Active province, 6: Full country wide shot / Epilogue
  chapterProgress: number; // 0..1 deterministic progress in current chapter
  onProvinceClick?: (name: string) => void;
};

type PathItem = { name: string; path: Path2D };

/**
 * Persistent Cartographic Canvas Scene:
 * - Unified, continuous geographic landmass without pre-marked administrative borders.
 * - Dynamic South Atlantic Ocean maritime shelf and deep water backdrop.
 * - Progressive boundary drawing on the active province with warm amber accent glow (#ffa236).
 * - Progressive irreversible carbon darkening with persistent memory.
 * - Real satellite fire pixels (NASA FIRMS) accumulating on calcinated areas.
 * - Frame-0 static SVG fallback guarantees zero blank screen.
 */
export default function ArgentinaMap({
  chapterIndex,
  chapterProgress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Cached NASA fire datasets
  const fociMapRef = useRef<Map<string, Foci>>(new Map());

  // Deterministic camera interpolation: [minLon, maxLon, minLat, maxLat]
  const cameraRef = useRef<number[]>([...COUNTRY_BOX]);
  const targetCameraRef = useRef<number[]>([...COUNTRY_BOX]);

  const chapterIndexRef = useRef(chapterIndex);
  chapterIndexRef.current = chapterIndex;
  const chapterProgressRef = useRef(chapterProgress);
  chapterProgressRef.current = chapterProgress;

  // Pre-load satellite foci data
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
    const padX = Math.max(spanX * 0.32, 0.9);
    const padY = Math.max(spanY * 0.32, 0.9);
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
      const scale = Math.min(w / viewW, h / viewH) * 0.92;
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

      // 1. Maritime & Atmospheric Environment Backdrop (South Atlantic Ocean & Orbital Depth)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const oceanGrad = ctx.createLinearGradient(0, 0, w, h);
      oceanGrad.addColorStop(0, '#06090e'); // Deep space-earth shadow
      oceanGrad.addColorStop(0.55, '#08121f'); // Atlantic oceanic depth
      oceanGrad.addColorStop(1, '#050c16'); // Southern ocean deep blue-slate
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle Atlantic continental shelf bathymetric glow
      const oceanCenter = project(-58.0, -42.0);
      const shelfGlow = ctx.createRadialGradient(
        oceanCenter[0],
        oceanCenter[1],
        scale * 2,
        oceanCenter[0],
        oceanCenter[1],
        scale * 16
      );
      shelfGlow.addColorStop(0, 'rgba(20, 48, 76, 0.28)');
      shelfGlow.addColorStop(0.65, 'rgba(10, 26, 42, 0.12)');
      shelfGlow.addColorStop(1, 'rgba(6, 9, 14, 0)');
      ctx.fillStyle = shelfGlow;
      ctx.fillRect(0, 0, w, h);

      const activeIdx = chapterIndexRef.current;
      const activeProgress = chapterProgressRef.current;
      const activeCfg = activeIdx >= 0 && activeIdx < CHAPTER_CONFIG.length ? CHAPTER_CONFIG[activeIdx] : null;
      const activeProvs = activeCfg ? activeCfg.provs : [];

      // Carbon state per province:
      // - Prior visited chapters: 1.0 (permanently calcinated charcoal)
      // - Active chapter: 0.0 -> 1.0 progressive darkening
      // - Unvisited chapters: 0.0 (natural landscape)
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

      // 2. FILL PROVINCES (Continuous Natural Biomes -> Charcoal Black)
      // Note: NO gaps, seamless landmass
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

      // 3. CONTINENTAL COASTLINE & ACCENT CONTOURS (NO PRE-MARKED PROVINCE BORDERS!)
      // Unvisited provinces have NO border strokes, appearing as a unified continuous geography.
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      paths.forEach(({ name, path }) => {
        const isActive = activeProvs.includes(name);
        const carbon = carbonMap.get(name) || 0;

        if (isActive) {
          // Fase B: Active province contour appears with progressive warm amber glow
          const strokeWidth = 2.0 + Math.sin(Date.now() * 0.004) * 0.4;
          ctx.shadowColor = 'rgba(255, 162, 54, 0.95)';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#ffa236';
          ctx.lineWidth = strokeWidth;
          ctx.stroke(path);
          ctx.shadowBlur = 0;
        } else if (carbon > 0.8) {
          // Fase E: Completed province retains discrete burnt calcinated border memory
          ctx.strokeStyle = 'rgba(197, 82, 33, 0.40)';
          ctx.lineWidth = 1.0;
          ctx.stroke(path);
        }
        // NOTE: Unvisited provinces are intentionally NOT stroked, achieving continuous geography!
      });

      // 4. RENDER REAL NASA SATELLITE HEAT FOCI PIXELS
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
            ctx.fillStyle = '#ffea7a'; // Bright flame core
          } else if (age < 6) {
            ctx.fillStyle = '#ff7a1a'; // Glowing ember
          } else {
            ctx.fillStyle = '#b3300f'; // Burnt dark red
          }

          ctx.fillRect(px - dotSize / 2, py - dotSize / 2, dotSize, dotSize);
        });
      });

      // Mark canvas as ready once initial frame has completed
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
      {/* FRAME-0 STATIC SVG FALLBACK: Continuous landmass without interior borders */}
      <svg
        className={`${styles.fallbackSvg} ${canvasReady ? styles.fallbackHidden : styles.fallbackVisible}`}
        viewBox={ARGENTINA_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden={canvasReady}
      >
        <rect width="400" height="800" fill="#08121f" />
        {Object.entries(ARGENTINA_STATIC_PATHS).map(([pName, dStr]) => {
          const baseColor = BIOME_COLORS[pName] || '#455038';
          const isActive = activeProvs.includes(pName);
          return (
            <path
              key={pName}
              d={dStr}
              fill={baseColor}
              className={isActive ? styles.countryActive : styles.countrySeamless}
            />
          );
        })}
      </svg>

      {/* PERSISTENT INTERACTIVE CANVAS: Smooth camera zoom, fire foci & continuous biomes */}
      <canvas
        ref={canvasRef}
        className={styles.mapCanvas}
        role="img"
        aria-label="Mapa cartográfico continuo de la República Argentina con monitoreo satelital de incendios"
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
