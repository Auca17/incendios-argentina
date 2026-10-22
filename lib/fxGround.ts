import { CREW, TRUCK_PATH, type Ground } from './groundScene';
import { blob, clamp01, drawFires, hash, lens, stamp, strength, type FireItem, type Proj, type Sites } from './fx';

/*
 * Illustrated layer of the Mendoza scene: a fire engine, three brigade members and their hoses on
 * the foothills of El Challao. Like the flames, the people and the engine are drawn standing up on
 * the map (side view), each with its shadow on the ground, so they read as figures and not as
 * symbols; their places are geographic points, so they stay on the terrain when the camera moves.
 */
export type GroundInput = {
  proj: Proj;
  w: number;
  h: number;
  dpr: number;
  band: [number, number];
  /** CSS px per degree of latitude. */
  ppd: number;
  st: Ground;
  sites: Sites;
  time: number;
  reduced?: boolean;
};

const C = {
  shirt: '#d9b13b', // the yellow flame-resistant shirt of wildland crews
  pants: '#3d4630',
  helmet: '#f1ead8',
  skin: '#c89a74',
  ink: 'rgba(20, 14, 10, 0.65)',
  engine: '#b3261e',
  hose: '#b23a24',
};

/** Point along a projected polyline at fraction t of its length, with its direction. */
function along(pts: [number, number][], t: number): { x: number; y: number; dx: number } {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = clamp01(t) * L[L.length - 1];
  let i = 1;
  while (i < pts.length - 1 && L[i] < d) i++;
  const f = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
  return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, dx: pts[i][0] - pts[i - 1][0] };
}

/** A shadow on the ground, cast to the south-east like the relief's. */
function shadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  g.save();
  g.fillStyle = 'rgba(6, 4, 2, 0.45)';
  g.beginPath();
  g.ellipse(x + rx * 0.35, y + ry * 0.4, rx, ry, 0.25, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/*
 * One brigade member, facing west (toward the fire), feet at (x, y), height H. `step` is the walk
 * cycle (radians), `walking` 0..1 how much they walk, `stance` 0..1 how far into the working pose
 * (front leg forward, hose nozzle held in both hands).
 */
function person(g: CanvasRenderingContext2D, x: number, y: number, H: number, step: number, walking: number, stance: number) {
  shadow(g, x, y, H * 0.3, H * 0.08);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const hipY = y - H * 0.47;
  const swing = Math.sin(step) * 0.5 * walking;
  // legs: walking swing, then a braced stance
  const leg = (a: number, spread: number) => {
    g.beginPath();
    g.moveTo(x, hipY);
    g.lineTo(x + Math.sin(a) * H * 0.47 + spread, y);
    g.strokeStyle = C.pants;
    g.lineWidth = H * 0.13;
    g.stroke();
  };
  leg(swing, -H * 0.12 * stance);
  leg(-swing, H * 0.1 * stance);
  // body
  const lean = -H * 0.05 * stance;
  g.fillStyle = C.shirt;
  g.strokeStyle = C.ink;
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(x - H * 0.15 + lean, y - H * 0.83, H * 0.3, H * 0.4, H * 0.08);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(244, 240, 226, 0.95)'; // reflective band
  g.fillRect(x - H * 0.15 + lean, y - H * 0.62, H * 0.3, H * 0.04);
  // arms: swinging while walking, reaching forward to the nozzle when working
  const hx = x - H * (0.12 + 0.2 * stance) + lean, hy = y - H * (0.55 + 0.08 * stance) + Math.sin(step) * H * 0.04 * walking;
  g.beginPath();
  g.moveTo(x + lean, y - H * 0.76);
  g.lineTo(hx, hy);
  g.strokeStyle = C.shirt;
  g.lineWidth = H * 0.1;
  g.stroke();
  // nozzle
  if (stance > 0.05) {
    g.beginPath();
    g.moveTo(hx + H * 0.04, hy + H * 0.02);
    g.lineTo(hx - H * 0.14 * stance, hy - H * 0.04 * stance);
    g.strokeStyle = '#2a2622';
    g.lineWidth = H * 0.06;
    g.stroke();
  }
  // head and helmet
  g.fillStyle = C.skin;
  g.beginPath();
  g.arc(x + lean * 1.4, y - H * 0.9, H * 0.08, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = C.helmet;
  g.beginPath();
  g.arc(x + lean * 1.4, y - H * 0.92, H * 0.1, Math.PI, 0);
  g.fill();
  g.fillRect(x + lean * 1.4 - H * 0.14, y - H * 0.93, H * 0.28, H * 0.035);
  g.lineWidth = 1;
  g.strokeStyle = C.ink;
  g.beginPath();
  g.arc(x + lean * 1.4, y - H * 0.92, H * 0.1, Math.PI, 0);
  g.stroke();
  return { nx: hx - H * 0.14 * stance, ny: hy - H * 0.04 * stance };
}

/** A small wildland fire engine, side view, facing west; (x, y) is the middle of its wheelbase. */
function engine(g: CanvasRenderingContext2D, x: number, y: number, L: number, roll: number, facing: number) {
  shadow(g, x, y, L * 0.55, L * 0.1);
  g.save();
  g.translate(x, y);
  g.scale(facing, 1);
  const H = L * 0.42;
  g.lineJoin = 'round';
  g.strokeStyle = C.ink;
  g.lineWidth = 1;
  // tank body
  g.fillStyle = C.engine;
  g.beginPath();
  g.roundRect(-L * 0.18, -H * 0.95, L * 0.68, H * 0.72, L * 0.03);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(244, 240, 226, 0.9)';
  g.fillRect(-L * 0.18, -H * 0.58, L * 0.68, H * 0.07);
  // hose reel at the back
  g.fillStyle = '#4a2a20';
  g.beginPath();
  g.arc(L * 0.38, -H * 0.72, H * 0.14, 0, Math.PI * 2);
  g.fill();
  // cab at the front (left)
  g.fillStyle = C.engine;
  g.beginPath();
  g.moveTo(-L * 0.2, -H * 0.23);
  g.lineTo(-L * 0.2, -H * 1.0);
  g.lineTo(-L * 0.36, -H * 1.0);
  g.lineTo(-L * 0.5, -H * 0.62);
  g.lineTo(-L * 0.5, -H * 0.23);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(150, 178, 196, 0.9)';
  g.beginPath();
  g.moveTo(-L * 0.24, -H * 0.62);
  g.lineTo(-L * 0.24, -H * 0.92);
  g.lineTo(-L * 0.34, -H * 0.92);
  g.lineTo(-L * 0.45, -H * 0.62);
  g.closePath();
  g.fill();
  // light bar
  g.fillStyle = '#ffb24a';
  g.fillRect(-L * 0.33, -H * 1.08, L * 0.1, H * 0.08);
  // chassis and wheels
  g.fillStyle = '#2a2420';
  g.fillRect(-L * 0.5, -H * 0.3, L, H * 0.1);
  for (const wx of [-L * 0.34, L * 0.32]) {
    g.fillStyle = '#1b1714';
    g.beginPath();
    g.arc(wx, -H * 0.12, H * 0.2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#8a8178';
    g.lineWidth = Math.max(1, H * 0.04);
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = roll + (k * Math.PI * 2) / 3;
      g.moveTo(wx, -H * 0.12);
      g.lineTo(wx + Math.cos(a) * H * 0.12, -H * 0.12 + Math.sin(a) * H * 0.12);
    }
    g.stroke();
  }
  g.restore();
}

export function drawGround(g: CanvasRenderingContext2D, f: GroundInput) {
  g.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  g.clearRect(0, 0, f.w, f.h);
  const z = f.st.zoom;
  if (z <= 0.001) return;
  const st = f.st;
  const H = Math.max(20, Math.min(50, f.ppd * 0.04)); // a person, px (illustration scale)
  lens(g, f.w, f.h, f.band, z);

  // the fire, from the detections of El Challao; the jets work on the sites they aim at
  const items: FireItem[] = f.sites.list.map((s) => {
    const [x, y] = f.proj(s.lon, s.lat);
    return { x, y, seed: s.seed + 20, s: strength(s, st.wf, f.sites), douse: 0, wetting: 0 };
  });

  // engine along its track; the track is drawn ahead as a faint annotation, the driven part amber
  const track = TRUCK_PATH.map(([lon, lat]) => f.proj(lon, lat));
  const tp = f.reduced ? (st.truck > 0 ? 1 : 0) : st.truck;
  const show = clamp01((st.ill - 0.2) / 0.3);
  if (show > 0) {
    g.save();
    g.globalAlpha = z * show * 0.8;
    g.lineCap = 'round';
    g.beginPath();
    track.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.strokeStyle = 'rgba(10, 6, 3, 0.7)';
    g.lineWidth = 4;
    g.stroke();
    g.setLineDash([6, 6]);
    g.strokeStyle = 'rgba(255, 236, 208, 0.75)';
    g.lineWidth = 1.5;
    g.stroke();
    g.restore();
  }

  const crew = CREW.map((c, i) => {
    const [ax, ay] = f.proj(c.from[0], c.from[1]), [bx, by] = f.proj(c.to[0], c.to[1]);
    const k = f.reduced ? (st.walk[i] > 0 ? 1 : 0) : st.walk[i];
    return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, k, i };
  });
  // who aims at which fire: the nearest site to each position
  const aim = crew.map((c) => {
    let best = -1, bd = Infinity;
    items.forEach((it, j) => { const d = Math.hypot(it.x - c.x, it.y - c.y); if (it.s > 0.05 && d < bd) { bd = d; best = j; } });
    return best;
  });
  aim.forEach((j) => { if (j >= 0) { items[j].douse = Math.max(items[j].douse, st.douse * 0.85); items[j].wetting = st.jets * (0.4 + 0.6 * st.douse); } });

  drawFires(g, items, z, H * 4.2, f.time);

  if (tp <= 0) { g.globalAlpha = 1; return; }
  const at = along(track, tp);
  const L = H * 2.4;
  g.globalAlpha = z;

  engine(g, at.x, at.y, L, -tp * 14, at.dx > 0 ? -1 : 1);

  // hoses: from the back of the engine to each nozzle, lying on the ground
  const drawn: { x: number; y: number; nx: number; ny: number; i: number; k: number }[] = [];
  const order = [...crew].sort((a, b) => a.y - b.y);
  for (const c of order) {
    if (c.k <= 0) continue;
    const step = c.k * 9 + c.i; // a step every so many pixels of the walk: it follows the scroll
    const walking = f.reduced ? 0 : Math.sin(Math.PI * c.k);
    const stance = clamp01((c.k - 0.85) / 0.15);
    const hose = () => {
      g.beginPath();
      g.moveTo(at.x + L * 0.38, at.y - H * 0.2);
      g.quadraticCurveTo((at.x + c.x) / 2, Math.max(at.y, c.y) + H * 0.25, c.x - H * 0.1, c.y - H * 0.05);
      g.strokeStyle = 'rgba(10, 6, 3, 0.6)';
      g.lineWidth = Math.max(2.4, H * 0.1);
      g.stroke();
      g.strokeStyle = C.hose;
      g.lineWidth = Math.max(1.4, H * 0.06);
      g.stroke();
    };
    hose();
    const n = person(g, c.x, c.y, H, step, walking, stance);
    drawn.push({ ...c, nx: n.nx, ny: n.ny });
  }

  // the jets: an arc of water from each nozzle to its fire, with spray where it lands
  if (st.jets > 0) {
    const drop = blob('214, 232, 242', 0.35);
    for (const c of drawn) {
      const j = aim[c.i];
      if (j < 0) continue;
      const tx = items[j].x + (hash(c.i + 3) - 0.5) * H * 0.8, ty = items[j].y - H * 0.25;
      const dx = tx - c.nx, dy = ty - c.ny, arc = Math.hypot(dx, dy) * 0.28;
      const p = (t: number): [number, number] => [c.nx + dx * t, c.ny + dy * t - arc * 4 * t * (1 - t)];
      const reach = st.jets;
      g.beginPath();
      for (let k = 0; k <= 20; k++) { const [x, y] = p((k / 20) * reach); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = 'rgba(214, 232, 242, 0.45)';
      g.lineWidth = Math.max(1.5, H * 0.07);
      g.stroke();
      const flow = f.time * 1.3 + c.i * 0.37;
      for (let k = 0; k < 18; k++) {
        const t = ((k / 18 + flow) % 1) * reach;
        const [x, y] = p(t);
        g.globalAlpha = z * 0.8 * (0.4 + 0.6 * t);
        stamp(g, drop, x, y, H * (0.05 + 0.08 * t));
      }
      if (reach >= 1) {
        for (let k = 0; k < 6; k++) {
          g.globalAlpha = z * 0.35 * st.jets;
          stamp(g, drop, tx + (hash(c.i * 11 + k) - 0.5) * H * 1.2, ty - hash(c.i * 7 + k) * H * 0.5, H * (0.25 + 0.2 * hash(k)));
        }
      }
      g.globalAlpha = z;
    }
  }
  g.globalAlpha = 1;
}
