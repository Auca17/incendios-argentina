import { EVENTS } from './events';

export type Slide =
  | { type: 'intro'; name: string }
  | { type: 'event'; name: string; ev: any }
  | { type: 'method'; name: string };

/** Screens in order: intro, the six fires, method. Same order as legacy app.js. */
export const SLIDES: Slide[] = [
  { type: 'intro', name: 'Inicio' },
  ...EVENTS.map((ev): Slide => ({ type: 'event', name: ev.region, ev })),
  { type: 'method', name: 'Cómo se hizo' },
];

export const SITE_TITLE = 'Lo que el fuego se llevó: 15 años, 6 historias';
