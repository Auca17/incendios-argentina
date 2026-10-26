import type { Foci } from './data';
import { clamp, fociWeek } from './fire';
import { AIR_STORY, EPISODE_WEEKS, HOTSPOT, airScene } from './airScene';
import { CHALLAO_NARROW, CHALLAO_WIDE, GROUND_STORY, groundScene } from './groundScene';
import { drawFx, fireSites, type Proj, type Sites } from './fx';
import { drawGround } from './fxGround';
import { STORIES, storyState } from './storyScenes';
import { drawStory } from './fxStories';
import { CINE_END, afterCine } from './cine';

/*
 * The story scenes, one per story that has one. Each is a pure function of the story's progress u
 * (0..1), like the rest of the tour: it says how far the camera closes in (and on which box), which
 * week the map shows, what the notes on the map say, and draws its illustrated layer. The map only
 * asks the scene of the active story; stories without a scene keep the calendar pacing.
 */
type Box = [number, number, number, number];
export type DrawArgs = { proj: Proj; w: number; h: number; dpr: number; band: [number, number]; ppd: number; time: number; reduced: boolean };
export type SceneFrame = {
  /** 0 = province view, 1 = the scene's close-up. */
  zoom: number;
  /** Camera pan added to the close-up (lon, lat). */
  pan: [number, number];
  /** The illustration note is shown (0..1). */
  ill: number;
  /** The flames note is shown. */
  flames: boolean;
  /** Chubut's closing balance replaces the weekly counter. */
  balance: boolean;
  /** Chubut's cinematic opening is on screen (its own note; the map waits under it). */
  cine?: boolean;
  draw: (g: CanvasRenderingContext2D, a: DrawArgs, sites: Sites) => void;
};
export type Scene = {
  box: (w: number) => Box;
  /** Detailed relief of the close-up (scripts/gen-closeups.mjs: same file and box). */
  relief: { src: string; box: Box };
  frame: (u: number, reduced: boolean) => SceneFrame;
  week: (E: Foci, u: number) => number;
  /** The scene's continuous week at u, or null once the whole series is shown. */
  wf: (u: number) => number | null;
  sites: (E: Foci) => Sites;
  /** Notes on the map: [bold lead, rest]. */
  notes: { flames: [string, string]; ill: [string, string]; cine?: [string, string] };
};

const FLAMES_NOTE: [string, string] = ['Brillo:', ' donde el satélite acumuló más focos. No mide superficie quemada.'];

const chubut: Scene = {
  box: () => HOTSPOT,
  relief: { src: '/map/closeup-epuyen.webp', box: [-73.6, -69.5, -43.8, -41.0] },
  // the first part of the story is the cinematic opening (lib/cine.ts); the map's scene runs after it
  frame: (u, reduced) => {
    const a = airScene(afterCine(u), reduced);
    return {
      // the hydrant plane no longer flies over the map: it is part of the cinematic opening, where the
      // reader calls it (lib/interaction.ts); the map keeps the fire's weeks and its flames
      zoom: a.zoom, pan: a.pan, ill: 0, flames: a.zoom > 0.5 && a.phase !== 'balance', balance: a.phase === 'balance', cine: u < CINE_END - 0.02,
      draw: (g, d, sites) => drawFx(g, { ...d, zoom: a.zoom, wf: a.wf, plane: 0, routeIn: 0, routeDim: a.routeDim, ill: 0, sites }),
    };
  },
  week: (E, u) => (afterCine(u) >= 0.9 ? E.weeks : clamp(Math.floor(airScene(afterCine(u)).wf) + 1, 1, E.weeks)),
  wf: (u) => (afterCine(u) >= 0.9 ? null : airScene(afterCine(u)).wf),
  sites: (E) => fireSites(E.cells, 0, EPISODE_WEEKS),
  notes: {
    flames: FLAMES_NOTE,
    ill: ['Ilustración.', ' En este incendio trabajaron aviones hidrantes.'],
    cine: ['Recreación ilustrada,', ' no una imagen de Epuyén.'],
  },
};

const mendoza: Scene = {
  box: (w) => (w < 1024 ? CHALLAO_NARROW : CHALLAO_WIDE),
  relief: { src: '/map/closeup-challao.webp', box: [-70.6, -67.4, -34.2, -31.9] },
  frame: (u, reduced) => {
    // the brigade left the map (a side-view crew on a map from above did not sit in it): it works in
    // the landscape of Mendoza, where the reader calls it (lib/interaction.ts). The map keeps the fire.
    const s = { ...groundScene(u, reduced), truck: 0, walk: [0, 0, 0], jets: 0, douse: 0, ill: 0 };
    return {
      zoom: s.zoom, pan: [0, 0], ill: s.ill, flames: s.zoom > 0.5 && s.ill < 0.5, balance: false,
      draw: (g, d, sites) => drawGround(g, { ...d, st: s, sites }),
    };
  },
  week: (E, u) => (u >= 0.9 ? E.weeks : clamp(Math.floor(groundScene(u).wf) + 1, 1, E.weeks)),
  wf: (u) => (u >= 0.9 ? null : groundScene(u).wf),
  // the cells of El Challao in the weeks around 29 October (one flame per cell: they are few). A
  // cell east of it, in the city, has detections almost every week of the year (a steady heat
  // source, not this fire): the 10 % share keeps it as a dot on the map but without a flame.
  sites: (E) => fireSites(E.cells, 42, 45, 6, 0.03, CHALLAO_WIDE, 0.1),
  notes: { flames: FLAMES_NOTE, ill: ['Ilustración.', ' El fuego lo combatieron brigadistas del Plan Provincial de Manejo del Fuego.'] },
};

/** Misiones, Corrientes, Córdoba and Delta, built from their data in lib/storyScenes.ts. */
const lighter = Object.fromEntries(STORIES.map((c): [string, Scene] => [c.id, {
  box: (w) => (w < 1024 ? c.narrow : c.box),
  relief: c.relief,
  frame: (u, reduced) => {
    const st = storyState(c, u, reduced);
    return {
      zoom: st.zoom, pan: st.pan, ill: 0, flames: st.zoom > 0.5 && st.ill > 0.5, balance: false,
      draw: (g, d, sites) => drawStory(g, { ...d, cfg: c, st, sites }),
    };
  },
  week: (E, u) => (u >= c.full ? E.weeks : clamp(Math.floor(storyState(c, u).wf) + 1, 1, E.weeks)),
  wf: (u) => (u >= c.full ? null : storyState(c, u).wf),
  sites: (E) => fireSites(E.cells, c.sites.w0, c.sites.w1, c.sites.max, c.sites.gap, c.sites.box),
  notes: { flames: c.note, ill: c.note },
}]));

export const SCENES: Record<string, Scene> = { ...lighter, [AIR_STORY]: chubut, [GROUND_STORY]: mendoza };

/** Week shown in a story (the map draws the weeks before it). */
export function storyWeek(id: string, E: Foci, u: number): number {
  const sc = SCENES[id];
  return sc ? sc.week(E, u) : fociWeek(E, u);
}

/**
 * How far into the shown week's stretch the story is (0..1): the newest week fades in with it. 1 when
 * the whole series is shown or the week does not move (nothing then is still coming in).
 */
export function storyWeekFrac(id: string, E: Foci, u: number): number {
  const v = SCENES[id]?.wf(u);
  if (v === null || v === undefined || Math.floor(v) + 1 > E.weeks || v < 0) return 1;
  return v - Math.floor(v);
}
