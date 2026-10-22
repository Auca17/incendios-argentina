import { ROSARIO, type StoryCfg, type StoryState } from './storyScenes';
import { blob, clamp01, drawFires, hash, lens, stamp, strength, type FireItem, type Proj, type Sites } from './fx';

/*
 * Illustrated layer of the lighter story scenes: the fires of their episode, cartographic labels,
 * and each one's own element (embers that outlast the flames in Misiones, smoke drifting to Rosario
 * in the Delta). Like the other scenes, every place is a geographic point.
 */
export type StoryInput = {
  proj: Proj;
  w: number;
  h: number;
  dpr: number;
  band: [number, number];
  ppd: number;
  cfg: StoryCfg;
  st: StoryState;
  sites: Sites;
  time: number;
  reduced?: boolean;
};

let FONT = '';
const font = () => (FONT ||= (typeof document !== 'undefined' && getComputedStyle(document.body).fontFamily) || 'sans-serif');

/** A place name on the map: small, spaced, white on a dark halo, with a dot for a city. */
function label(g: CanvasRenderingContext2D, x: number, y: number, text: string, a: number, city: boolean) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  g.font = `600 13px ${font()}`;
  g.textBaseline = 'middle';
  (g as any).letterSpacing = '0.06em';
  const tx = city ? x + 9 : x - g.measureText(text).width / 2, ty = city ? y : y;
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(8, 6, 4, 0.85)';
  g.lineWidth = 4;
  g.strokeText(text, tx, ty);
  g.fillStyle = 'rgba(255, 244, 228, 0.95)';
  g.fillText(text, tx, ty);
  if (city) {
    g.beginPath();
    g.arc(x, y, 3.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255, 244, 228, 0.95)';
    g.fill();
    g.lineWidth = 1.5;
    g.stroke();
  }
  g.restore();
}

export function drawStory(g: CanvasRenderingContext2D, f: StoryInput) {
  g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  g.clearRect(0, 0, f.w, f.h);
  const { st, cfg } = f;
  const z = st.zoom;
  if (z <= 0.001) return;
  lens(g, f.w, f.h, f.band, z);
  const span = Math.min(150, Math.max(72, 0.16 * Math.min(f.band[1] - f.band[0], f.h)));
  const items: FireItem[] = f.sites.list.map((s) => {
    const [x, y] = f.proj(s.lon, s.lat);
    return { x, y, seed: s.seed + 40, s: strength(s, st.wf, f.sites), douse: 0, wetting: 0 };
  });

  // Misiones: embers that keep glowing inside the trunks after the flames have gone down
  if (cfg.id === 'misiones') {
    const ember = blob('230, 60, 20', 0.3);
    const emberCore = blob('255, 150, 60', 0.2);
    g.globalCompositeOperation = 'lighter';
    f.sites.list.forEach((s, i) => {
      let peak = 0;
      for (let w = f.sites.w0; w <= st.wf; w++) peak = Math.max(peak, strength(s, w + 0.5, f.sites));
      // once a site has burned it keeps embers, brightest when its flames are gone
      const level = clamp01(0.35 + 1.4 * peak) * (1 - 0.6 * items[i].s);
      if (peak < 0.05) return;
      const { x, y } = items[i];
      g.globalAlpha = z * level * 0.5;
      stamp(g, ember, x, y, span * 0.45, span * 0.22);
      for (let k = 0; k < 14; k++) {
        const r = span * 0.4 * Math.sqrt(hash(s.seed * 17 + k)), a = hash(s.seed * 23 + k) * Math.PI * 2;
        const pulse = 0.55 + 0.45 * Math.sin(f.time * (0.9 + hash(k) * 0.8) + k * 1.7 + s.seed);
        g.globalAlpha = z * level * pulse;
        stamp(g, emberCore, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 3 + 5 * hash(s.seed * 5 + k));
      }
    });
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  // Delta: the smoke goes to Rosario (west of the islands), and a haze settles on the city
  let wind: ((it: FireItem) => [number, number]) | undefined;
  if (cfg.id === 'delta') {
    const [rx, ry] = f.proj(ROSARIO[0], ROSARIO[1]);
    wind = (it) => { const dx = rx - it.x, dy = ry - it.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
    const burning = items.reduce((m, it) => m + it.s, 0) / Math.max(1, items.length);
    const haze = blob('118, 106, 96', 0.5);
    g.globalAlpha = z * Math.min(0.75, burning * 1.6);
    stamp(g, haze, rx, ry, span * 1.6, span * 1.1);
    g.globalAlpha = z * Math.min(0.5, burning);
    stamp(g, haze, rx + span * 0.4, ry + span * 0.15, span * 2.4, span * 1.4);
    g.globalAlpha = 1;
  }

  drawFires(g, items, z, span, f.time, wind);

  for (const l of cfg.labels) {
    const a = z * clamp01((st.u - l.from) / 0.04) * (1 - clamp01((st.u - l.to) / 0.04));
    const [x, y] = f.proj(l.lon, l.lat);
    label(g, x, y, l.text, a, l.text === 'Rosario');
  }
}
