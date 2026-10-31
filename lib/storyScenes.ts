import { seg } from './fire';

/*
 * The four lighter story scenes (Misiones, Corrientes, Córdoba, Delta), as data: where the camera
 * closes in, how the weeks are paced over the scroll, which weeks and box feed the fires, and the
 * one element of their own (lib/fxStories.ts). All pure functions of the story's progress u.
 *
 * Where and when come from the weekly VIIRS cells and the story's own source (lib/events.ts):
 *  - Misiones: Yabotí, November 2020; 235 detections inside the reserve's box in the last weeks of the
 *    series. "Los troncos de gran diámetro siguieron encendidos por dentro": embers that keep glowing
 *    once the flames are gone (an illustration of that sentence).
 *  - Corrientes: the Iberá, January and February 2022 (37,193 detections in eight weeks, the most
 *    around the north of the wetlands; peak in the week of 12 February).
 *  - Córdoba: the sierras, May to November 2020; the strongest cells fall in Cruz del Eje, Punilla and
 *    Río Cuarto, the three departments the provincial report names. The camera frames the 0.25-degree
 *    zones with the most detections each week (keyframes below, from semanas-cordoba.json): it leans
 *    north in mid August (30.6 S); in the peak weeks, late September and early October, two zones burn
 *    almost even, 31.1 S and 32.9 S (760 and 761 detections), and the whole range is in frame.
 *  - Delta: 2020, worst in August (the source says so, and the cells agree), concentrated on the
 *    islands in front of Rosario. "El humo sobre Rosario": smoke drifts to the city (illustration).
 */
type Box = [number, number, number, number];
export type Label = { lon: number; lat: number; text: string; from: number; to: number };
export type StoryCfg = {
  id: 'misiones' | 'corrientes' | 'cordoba' | 'delta';
  box: Box;
  narrow: Box;
  relief: { src: string; box: Box };
  /** u at which the camera starts and ends coming down; u at which it starts and ends going back. */
  zoom: [number, number, number, number];
  /** u -> continuous week pieces; after `full` the whole series is shown. */
  pace: [number, number][];
  full: number;
  sites: { w0: number; w1: number; max: number; gap: number; box?: Box };
  /** Camera travel: from this offset (lon, lat) to that one, between two u. */
  travel?: { from: [number, number]; to: [number, number]; u: [number, number] };
  /** Camera following the data: offsets (lon, lat) from the box's centre by continuous week (Córdoba). */
  follow?: [number, number, number][];
  labels: Label[];
  /** Note shown with the close-up: [bold lead, rest]. */
  note: [string, string];
};

const FLAMES: [string, string] = ['Brillo:', ' donde el satélite acumuló más focos. No mide superficie quemada.'];

export const STORIES: StoryCfg[] = [
  {
    id: 'misiones',
    box: [-54.75, -53.45, -27.55, -26.5], narrow: [-54.45, -53.65, -27.4, -26.65],
    relief: { src: '/map/closeup-yaboti.webp', box: [-55.0, -53.2, -27.8, -26.2] },
    zoom: [0.2, 0.34, 0.88, 0.98],
    pace: [[0, 0], [0.28, 26], [0.7, 31.5], [0.86, 34]], full: 0.9,
    sites: { w0: 26, w1: 36, max: 7, gap: 0.12, box: [-54.75, -53.45, -27.55, -26.5] },
    labels: [{ lon: -53.95, lat: -27.05, text: 'Reserva de Biosfera Yabotí', from: 0.3, to: 0.9 }],
    note: FLAMES,
  },
  {
    id: 'corrientes',
    box: [-58.4, -55.9, -29.3, -27.1], narrow: [-58.0, -56.2, -29.0, -27.3],
    relief: { src: '/map/closeup-ibera.webp', box: [-58.9, -55.5, -29.7, -26.8] },
    zoom: [0.06, 0.2, 0.88, 0.98],
    pace: [[0, 0], [0.14, 0.6], [0.82, 8], [0.86, 8.5]], full: 0.9,
    sites: { w0: 0, w1: 8, max: 12, gap: 0.2 },
    labels: [{ lon: -57.05, lat: -28.45, text: 'Esteros del Iberá', from: 0.16, to: 0.9 }],
    note: FLAMES,
  },
  {
    id: 'cordoba',
    // the whole range in one frame, Cruz del Eje (30.7 S) to Río Cuarto (33 S): the camera only leans
    box: [-65.6, -63.7, -33.3, -30.0], narrow: [-65.25, -64.05, -31.55, -30.25],
    relief: { src: '/map/closeup-sierras.webp', box: [-67.2, -62.6, -34.2, -29.4] },
    zoom: [0.08, 0.2, 0.88, 0.98],
    pace: [[0, 0], [0.16, 13], [0.84, 26], [0.88, 28]], full: 0.9,
    sites: { w0: 10, w1: 29, max: 12, gap: 0.18 },
    // week -> offset from the box's centre (-64.65, -31.65): the frame leans toward that week's strongest
    // zones (north in mid August), and is centred when the centre and the south burn together
    follow: [[13, 0.05, 0], [15, 0.1, 0.35], [16.5, 0.1, 0.3], [20, 0.05, 0.05], [21, 0, -0.1], [22.5, 0, -0.1], [24, 0.05, 0.05], [26, 0.05, 0]],
    labels: [
      { lon: -64.81, lat: -30.73, text: 'Cruz del Eje', from: 0.18, to: 0.5 },
      { lon: -64.47, lat: -31.24, text: 'Punilla', from: 0.24, to: 0.62 },
      { lon: -64.72, lat: -32.95, text: 'Río Cuarto', from: 0.56, to: 0.92 },
    ],
    note: FLAMES,
  },
  {
    id: 'delta',
    box: [-61.1, -59.4, -33.8, -32.35], narrow: [-60.95, -59.75, -33.55, -32.55],
    relief: { src: '/map/closeup-delta.webp', box: [-61.5, -58.8, -34.4, -31.9] },
    // the smoke of the landscape opens straight onto the islands: no wide shot in between
    zoom: [-0.02, 0, 0.88, 0.98],
    pace: [[0, 0], [0.26, 28], [0.76, 35], [0.86, 40]], full: 0.9,
    sites: { w0: 26, w1: 40, max: 10, gap: 0.14, box: [-61.1, -59.4, -33.8, -32.35] },
    labels: [{ lon: -60.65, lat: -32.95, text: 'Rosario', from: 0.3, to: 0.92 }],
    note: FLAMES,
  },
];

/** Rosario: the city the Delta's smoke drifts to. */
export const ROSARIO: [number, number] = [-60.65, -32.95];

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

export type StoryState = { zoom: number; wf: number; pan: [number, number]; ill: number; u: number };

export function storyState(c: StoryCfg, u: number, reduced = false): StoryState {
  const [a, b, d, e] = c.zoom;
  let zoom = smooth(seg(u, a, b)) * (1 - smooth(seg(u, d, e)));
  if (reduced) zoom = u >= (a + b) / 2 && u < (d + e) / 2 ? 1 : 0;
  let pan: [number, number] = [0, 0];
  if (c.travel) {
    // reduced motion: the camera does not travel, it cuts at the middle of the journey
    const k = reduced ? (u < (c.travel.u[0] + c.travel.u[1]) / 2 ? 0 : 1) : smooth(seg(u, c.travel.u[0], c.travel.u[1]));
    pan = [c.travel.from[0] + (c.travel.to[0] - c.travel.from[0]) * k, c.travel.from[1] + (c.travel.to[1] - c.travel.from[1]) * k];
  }
  const wf = pieces(u, c.pace);
  if (c.follow) {
    // reduced motion: no travel, two cuts (north, then south) at the middle of the journey
    const wk = reduced ? (wf < 19 ? 15 : 22.5) : wf;
    pan = [pieces(wk, c.follow.map(([w, x]) => [w, x] as [number, number])), pieces(wk, c.follow.map(([w, , y]) => [w, y] as [number, number]))];
  }
  const ill = seg(u, b - 0.04, b) * (1 - seg(u, d - 0.02, d + 0.01));
  return { zoom, wf, pan, ill, u };
}
