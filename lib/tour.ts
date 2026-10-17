import { EVENTS } from './events';

/** The guided tour visits the six fires in geographic order, north to south (not chronological). */
const NORTH_TO_SOUTH = ['misiones', 'corrientes', 'cordoba', 'delta', 'mendoza', 'chubut'];

export const TOUR_EVENTS: any[] = NORTH_TO_SOUTH.map((id) => EVENTS.find((e) => e.id === id));
