import type { Foci } from './data';
import { clamp, fociWeek, seg } from './fire';

/*
 * Chubut scene: a pure function of the progress u (0..1) inside the Chubut story, so scrolling back
 * plays it backwards, frame for frame.
 *
 * The data (VIIRS, weekly 0.05-degree cells) fix the chronology. The observation period runs from
 * 1 January to 10 October 2026, but the fire itself (it began on 5 January) left 99.6 % of its
 * detections in the first eight weeks, up to 25 February: peaks in the weeks of 8 and 22 January,
 * then a fall in February. So the scene gives each of those eight weeks its own stretch of scroll,
 * and treats the rest of the observation period as a closing balance, not as more weeks to watch.
 *   0.00-0.06  week 1: the first detections, still on the province
 *   0.03-0.16  the camera closes in on the valleys of Epuyén, El Hoyo and Puerto Patriada
 *   0.06-0.46  weeks 1-5: the fire spreads, with its two peaks
 *   0.46-0.74  week 5 (29 Jan - 4 Feb, the week of the 45,000 ha report): the air drop, an
 *              illustration; time almost stops while it plays
 *   0.74-0.86  weeks 5-8: the detections fall away
 *   0.88-1.00  balance of the episode; the camera opens back to the province
 */
export const AIR_STORY = 'chubut';

/** Close-up on Epuyén, El Hoyo and Puerto Patriada (minLon, maxLon, minLat, maxLat). */
export const HOTSPOT: [number, number, number, number] = [-73.3, -69.8, -43.5, -41.3];

/**
 * Ground track of the plane: a cubic curve (lon, lat control points). It comes in from the
 * north-east, turns onto the line of detections, runs down it for the drop and climbs away east.
 */
export const PATH: [number, number][] = [[-70.2, -41.1], [-71.75, -41.55], [-71.75, -42.95], [-70.75, -43.75]];
/** Part of the track (0..1) where the load is released. */
export const DROP: [number, number] = [0.36, 0.6];
/** Weeks of the episode (0..8, fractional) and the last of them. */
export const EPISODE_WEEKS = 8;

const smooth = (x: number) => x * x * (3 - 2 * x);
const lerpPieces = (u: number, pts: [number, number][]) => {
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
  /** Plane position along the track (0..1); 0 before it enters. */
  plane: number;
  /** Visibility of the plane (0..1). */
  show: number;
  phase: Phase;
};

export function airScene(u: number, reduced = false): Air {
  let zoom = smooth(seg(u, 0.03, 0.16)) * (1 - smooth(seg(u, 0.88, 0.98)));
  if (reduced) zoom = u >= 0.09 && u < 0.93 ? 1 : 0; // the camera cuts instead of travelling
  const wf = lerpPieces(u, [[0, 0], [0.06, 0.6], [0.46, 4.5], [0.74, 4.85], [0.86, EPISODE_WEEKS]]);
  const plane = seg(u, 0.47, 0.74);
  const show = seg(u, 0.45, 0.49) * (1 - seg(u, 0.73, 0.77));
  const phase: Phase = u < 0.06 ? 'start' : u < 0.46 ? 'spread' : u < 0.74 ? 'plane' : u < 0.88 ? 'fall' : 'balance';
  return { zoom, wf, plane, show, phase };
}

/**
 * Week shown in a story (the map draws the weeks before it). In Chubut it follows the episode's
 * chronology above, and the whole observation period once the balance is shown. Other stories keep
 * the calendar pacing.
 */
export function storyWeek(id: string, E: Foci, u: number): number {
  if (id !== AIR_STORY) return fociWeek(E, u);
  if (u >= 0.88) return E.weeks;
  return clamp(Math.floor(airScene(u).wf) + 1, 1, E.weeks);
}
