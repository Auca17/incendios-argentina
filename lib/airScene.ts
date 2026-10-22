import { clamp, seg } from './fire';

/*
 * Chubut scene: a pure function of the progress u (0..1) inside the Chubut story, so scrolling back
 * plays it backwards and any position can be entered directly.
 *
 * The data (VIIRS, weekly 0.05-degree cells) fix the chronology. The observation period runs from
 * 1 January to 10 October 2026, but the fire itself (it began on 5 January) left 99.6 % of its
 * detections in the first eight weeks, up to 25 February: peaks in the weeks of 8 and 22 January,
 * then a fall in February. So each of those eight weeks gets its own stretch of scroll, and the rest
 * of the observation period is a closing balance, not more weeks to watch.
 *   0.00-0.06  week 1: the first detections, still on the province
 *   0.03-0.16  the camera closes in on the valleys of Epuyén, El Hoyo and Puerto Patriada
 *   0.06-0.42  weeks 1-5: the fire spreads, with its two peaks
 *   0.36-0.46  the route of the plane is drawn ahead, as a map annotation
 *   0.44-0.82  week 5 (29 Jan - 4 Feb, the week of the 45,000 ha report): an illustrated air
 *              tanker flies the whole route, in from the north-east edge, down the line of
 *              detections where it drops its load, and out by the south-east edge; time almost
 *              stops while it flies
 *   0.82-0.90  weeks 5-8: the detections fall away; the flown route stays as a faint annotation
 *   0.90-1.00  balance of the episode; the camera opens back to the province
 */
export const AIR_STORY = 'chubut';

/** Close-up on Epuyén, El Hoyo and Puerto Patriada (minLon, maxLon, minLat, maxLat). */
export const HOTSPOT: [number, number, number, number] = [-73.3, -69.8, -43.5, -41.3];

const K = Math.cos((38 * Math.PI) / 180); // the map's own projection: x = lon * K, y = -lat

/*
 * Route of the plane through these points (lon, lat): it starts and ends well outside the close-up,
 * so the plane flies in and out of the frame instead of appearing. A centripetal Catmull-Rom spline
 * through them, resampled at equal lengths, so the plane keeps an even speed along it.
 */
const WAYPOINTS: [number, number][] = [
  [-67.9, -39.9], [-69.9, -40.85], [-71.35, -41.6], [-71.62, -42.3],
  [-71.6, -42.95], [-71.05, -43.55], [-69.6, -44.25], [-67.8, -44.9],
];
export const ROUTE_N = 240;

function buildRoute(): [number, number][] {
  const P = WAYPOINTS.map(([lon, lat]) => [lon * K, -lat]);
  const ext = [[2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]], ...P, [2 * P[P.length - 1][0] - P[P.length - 2][0], 2 * P[P.length - 1][1] - P[P.length - 2][1]]];
  const dense: number[][] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
    const t0 = 0, t1 = t0 + Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.5) || 1e-6;
    const t2 = t1 + (Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), 0.5) || 1e-6);
    const t3 = t2 + (Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), 0.5) || 1e-6);
    for (let k = 0; k < 40; k++) {
      const t = t1 + ((t2 - t1) * k) / 40;
      const L = (a: number[], b: number[], ta: number, tb: number) => [0, 1].map((j) => ((tb - t) * a[j] + (t - ta) * b[j]) / (tb - ta));
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      dense.push(L(B1, B2, t1, t2));
    }
  }
  dense.push(P[P.length - 1]);
  // equal-length resampling
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = acc[acc.length - 1];
  const out: [number, number][] = [];
  let j = 1;
  for (let k = 0; k <= ROUTE_N; k++) {
    const d = (total * k) / ROUTE_N;
    while (j < acc.length - 1 && acc[j] < d) j++;
    const f = (d - acc[j - 1]) / (acc[j] - acc[j - 1] || 1);
    const x = dense[j - 1][0] + (dense[j][0] - dense[j - 1][0]) * f, y = dense[j - 1][1] + (dense[j][1] - dense[j - 1][1]) * f;
    out.push([x / K, -y]); // back to lon, lat
  }
  return out;
}

/** The route, ROUTE_N + 1 points (lon, lat) at equal lengths. */
export const ROUTE = buildRoute();

/** Route position (lon, lat) at s (0..1). */
export function routeAt(s: number): [number, number] {
  const x = clamp(s, 0, 1) * ROUTE_N, i = Math.min(ROUTE_N - 1, Math.floor(x)), f = x - i;
  return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * f, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * f];
}

/** Part of the route (0..1) where the load is released: over the line of detections, 42.0-42.8 S. */
const sAtLat = (lat: number) => ROUTE.findIndex(([, la]) => la <= lat) / ROUTE_N;
export const DROP: [number, number] = [sAtLat(-42.0), sAtLat(-42.8)];

/** Weeks of the episode (0..8, fractional). */
export const EPISODE_WEEKS = 8;

const smooth = (x: number) => x * x * (3 - 2 * x);
const pieces = (u: number, pts: [number, number][]) => {
  if (u <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [u1, v1] = pts[i];
    const [u0, v0] = pts[i - 1];
    if (u <= u1) return v0 + (v1 - v0) * ((u - u0) / (u1 - u0));
  }
  return pts[pts.length - 1][1];
};

export type Phase = 'start' | 'spread' | 'plane' | 'fall' | 'balance';

export type Air = {
  /** 0 = province view, 1 = close-up on the hotspot. */
  zoom: number;
  /** Continuous week of the episode (0..8): weeks of scroll, not of the calendar. */
  wf: number;
  /** Plane position along the route (0..1); it is in the air only strictly between 0 and 1. */
  plane: number;
  /** How much of the route annotation is drawn ahead (0..1). */
  routeIn: number;
  /** Strength of the route annotation: 1 while flown, fainter once the plane has gone. */
  routeDim: number;
  /** The illustration note is shown (0..1). */
  ill: number;
  /** Camera pan that keeps the plane in frame (lon, lat offsets, already eased). */
  pan: [number, number];
  phase: Phase;
};

export function airScene(u: number, reduced = false): Air {
  let zoom = smooth(seg(u, 0.03, 0.16)) * (1 - smooth(seg(u, 0.9, 0.99)));
  if (reduced) zoom = u >= 0.09 && u < 0.945 ? 1 : 0; // the camera cuts instead of travelling
  const wf = pieces(u, [[0, 0], [0.06, 0.6], [0.42, 4.5], [0.82, 4.85], [0.9, EPISODE_WEEKS]]);
  const plane = seg(u, 0.44, 0.82);
  const routeIn = smooth(seg(u, 0.36, 0.46));
  const routeDim = 1 - 0.6 * seg(u, 0.82, 0.88);
  const ill = seg(u, 0.36, 0.39) * (1 - seg(u, 0.85, 0.88));
  // the camera leans a little toward the plane while it is over the fire, and comes back
  let pan: [number, number] = [0, 0];
  if (!reduced && plane > 0 && plane < 1) {
    const [lon, lat] = routeAt(plane);
    const cx = (HOTSPOT[0] + HOTSPOT[1]) / 2, cy = (HOTSPOT[2] + HOTSPOT[3]) / 2;
    const w = Math.sin(Math.PI * plane) ** 2 * 0.3;
    pan = [clamp((lon - cx) * w, -0.8, 0.8), clamp((lat - cy) * w, -0.6, 0.6)];
  }
  const phase: Phase = u < 0.06 ? 'start' : u < 0.42 ? 'spread' : u < 0.82 ? 'plane' : u < 0.9 ? 'fall' : 'balance';
  return { zoom, wf, plane, routeIn, routeDim, ill, pan, phase };
}
