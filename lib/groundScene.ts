import { seg } from './fire';

/*
 * Mendoza scene: El Challao, on the foothills west of the city, a pure function of the progress u
 * (0..1) inside the Mendoza story.
 *
 * The story is the fire of 28 and 29 October 2023 in the piedemonte of El Challao (Los Andes, with
 * data from the provincial fire plan). The VIIRS cells agree: the week of 29 October has 153
 * detections in the province and its strongest cell (-68.975, -32.875, 82 detections) is in El
 * Challao. The source also says that brigades of the provincial fire plan fought it; the crew
 * below is an illustration of that kind of work, not a reconstruction of a real operation.
 *   0.00-0.30  the year 2023 week by week on the province
 *   0.24-0.40  the camera goes down to El Challao; the week of 29 October lights it up
 *   0.38-0.50  a fire engine drives in from the east along a track and stops
 *   0.48-0.58  three brigade members get down and walk toward the fire, hoses unrolling behind them
 *   0.58-0.80  water on the fire: it is knocked down where the jets reach
 *   0.80-0.88  the crew holds its ground; the fire smoulders
 *   0.88-1.00  the camera opens back to the province
 */
export const GROUND_STORY = 'mendoza';

/** Close-up on El Challao (minLon, maxLon, minLat, maxLat); tighter on narrow screens. */
export const CHALLAO_WIDE: [number, number, number, number] = [-69.42, -68.52, -33.14, -32.6];
export const CHALLAO_NARROW: [number, number, number, number] = [-69.17, -68.67, -33.06, -32.7];

/** The engine's track (lon, lat), from the east edge of the close-up to where it stops. */
export const TRUCK_PATH: [number, number][] = [[-68.5, -32.955], [-68.62, -32.935], [-68.72, -32.915], [-68.79, -32.905]];
/** Where each crew member steps down (by the engine) and where they take position, facing west. */
export const CREW: { from: [number, number]; to: [number, number] }[] = [
  { from: [-68.8, -32.902], to: [-68.875, -32.868] },
  { from: [-68.795, -32.905], to: [-68.868, -32.884] },
  { from: [-68.79, -32.908], to: [-68.872, -32.9] },
];

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

export type Ground = {
  zoom: number;
  /** Continuous week of 2023 (0..52). */
  wf: number;
  /** Engine along its track (0..1), eased so it slows down to stop. */
  truck: number;
  /** Each crew member's walk (0..1). */
  walk: number[];
  /** Water flowing from the nozzles (0..1). */
  jets: number;
  /** How far the water has worked on the fire (0..1). */
  douse: number;
  ill: number;
  phase: 'year' | 'fire' | 'crew' | 'water' | 'after';
};

export function groundScene(u: number, reduced = false): Ground {
  let zoom = smooth(seg(u, 0.24, 0.4)) * (1 - smooth(seg(u, 0.88, 0.98)));
  if (reduced) zoom = u >= 0.32 && u < 0.93 ? 1 : 0;
  const wf = pieces(u, [[0, 0], [0.3, 42], [0.4, 43.2], [0.8, 43.6], [0.88, 45], [0.9, 52]]);
  const t = seg(u, 0.38, 0.5);
  const truck = 1 - (1 - t) * (1 - t); // decelerates into its stop
  const walk = [0, 1, 2].map((i) => smooth(seg(u, 0.48 + i * 0.02, 0.56 + i * 0.02)));
  const jets = seg(u, 0.58, 0.61) * (1 - seg(u, 0.8, 0.83));
  const douse = smooth(seg(u, 0.6, 0.78));
  const ill = seg(u, 0.36, 0.39) * (1 - seg(u, 0.86, 0.89));
  const phase = u < 0.3 ? 'year' : u < 0.38 ? 'fire' : u < 0.58 ? 'crew' : u < 0.8 ? 'water' : 'after';
  return { zoom, wf, truck, walk, jets, douse, ill, phase };
}
