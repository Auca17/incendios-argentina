import { EVENTS } from './events';

export type Slide =
  | { type: 'intro'; name: string }
  | { type: 'event'; name: string; ev: any }
  | { type: 'method'; name: string };

/**
 * Geographic descent (North to South):
 * Misiones (-27.0°) -> Corrientes (-28.5°) -> Córdoba (-32.15°) -> Delta (-32.7°) -> Mendoza (-32.8°) -> Chubut (-42.2°)
 */
const NORTH_TO_SOUTH_IDS = ['misiones', 'corrientes', 'cordoba', 'delta', 'mendoza', 'chubut'];

export const GEOGRAPHIC_EVENTS = [...EVENTS].sort(
  (a, b) => NORTH_TO_SOUTH_IDS.indexOf(a.id) - NORTH_TO_SOUTH_IDS.indexOf(b.id)
);

/** Screens in geographic descent order: intro, the six fires from North to South, method. */
export const SLIDES: Slide[] = [
  { type: 'intro', name: 'Inicio' },
  ...GEOGRAPHIC_EVENTS.map((ev): Slide => ({ type: 'event', name: ev.region, ev })),
  { type: 'method', name: 'Cómo se hizo' },
];

export const SITE_TITLE = 'Lo que el fuego se llevó: 15 años, 6 historias';
