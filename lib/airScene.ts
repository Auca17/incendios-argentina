import type { Foci } from './data';
import { clamp, fociWeek, seg } from './fire';

/*
 * Chubut scene: the timeline of the illustrated air drop. Everything is a pure function of the
 * progress u (0..1) inside the Chubut story, so scrolling back plays it backwards, frame for frame.
 *   0.02-0.36  the fire grows week by week (paced by the detections, not by the calendar)
 *   0.30-0.46  the camera closes in on the Andean valleys where the detections piled up
 *   0.46-0.84  an illustrated water bomber flies along the fire line and drops its load
 *   0.88-0.99  the camera opens back to the province
 * The flames mark the cells with the most detections; the plane and the water are an illustration,
 * not a reconstruction of a real operation.
 */
export const AIR_STORY = 'chubut';

/** Close-up on Epuyén, El Hoyo and Puerto Patriada (minLon, maxLon, minLat, maxLat). */
export const HOTSPOT: [number, number, number, number] = [-73.3, -69.8, -43.5, -41.3];

/** Ground track of the plane, north to south along the line of detections (lon, lat). */
export const TRACK: [[number, number], [number, number]] = [[-71.3, -41.3], [-71.78, -43.75]];
/** Part of the track (0..1) where the load is released. */
export const DROP: [number, number] = [0.32, 0.6];

const smooth = (x: number) => x * x * (3 - 2 * x);

export type Air = {
  /** 0 = province view, 1 = close-up on the hotspot. */
  zoom: number;
  /** Plane position along the track (0..1); 0 before it enters. */
  plane: number;
  /** Visibility of the plane and of the illustration note (0..1). */
  show: number;
};

export function airScene(u: number, reduced = false): Air {
  let zoom = smooth(seg(u, 0.3, 0.46)) * (1 - smooth(seg(u, 0.88, 0.99)));
  if (reduced) zoom = u >= 0.38 && u < 0.935 ? 1 : 0; // the camera cuts instead of travelling
  const plane = seg(u, 0.46, 0.84);
  const show = seg(u, 0.43, 0.48) * (1 - seg(u, 0.84, 0.88));
  return { zoom, plane, show };
}

/**
 * Week shown in a story. In Chubut the fire burned in the first weeks of a 44-week series, so the
 * weeks are paced by the detections (each stretch of scroll shows the same share of foci) and the
 * scene gets the rest of the section. Other stories keep the calendar pacing.
 */
export function storyWeek(id: string, E: Foci, u: number): number {
  if (id !== AIR_STORY) return fociWeek(E, u);
  const p = seg(u, 0.02, 0.36);
  if (p >= 1) return E.weeks;
  const goal = p * E.total;
  let w = E.first + 1;
  while (w < E.weeks && E.cum[w] < goal) w++;
  return clamp(w, E.first + 1, E.weeks);
}
