'use client';
import { hold } from './scrollDriver';

/*
 * Scene interactions: the reader touches a spot of a region's landscape and a short illustrated
 * sequence plays there (a fire starting and spreading, and in some regions the response). While it
 * plays the story is held: the scroll driver keeps its last frame (hold) and the page cannot scroll,
 * so nothing advances, rewinds or restarts. The sequence runs on its own clock; when it ends, or
 * when the reader leaves it, the page is released at the exact scroll position it had.
 *
 * States (one interaction at a time):
 *   idle ─begin→ ignite ─(time)→ ready ─respond→ respond ─(time)→ done   (Chubut starts at respond)
 *   any running state ─exit→ idle (nothing is kept)
 *   done: the page is free again and the controls are gone; the region keeps its end state (smoke,
 *   embers) and offers a discreet "Ver otra vez", which starts the sequence again from the start.
 * Transitions happen only through these functions and through tick(), called by the one renderer
 * that draws the scene (components/Landscape.tsx), so no listener can fire a step twice.
 */
export type Phase = 'idle' | 'ignite' | 'ready' | 'respond' | 'mid' | 'done';

export type Def = {
  /**
   * Where the spot sits, as a fraction of the viewport. Only a fallback for the landscapes: their spot
   * is on the fire's ground (lib/landFire.ts spotOn), placed by the renderer; Chubut's is this one.
   */
  spot: [number, number];
  /** Shown by the spot, and its accessible name. */
  cue: string;
  label: string;
  /** Seconds of each sequence; no ignite: the fire is already burning (Chubut). */
  ignite?: number;
  respond?: number;
  respondLabel?: string;
  /** Live text for each stage, read by screen readers and shown under the scene. */
  says: Partial<Record<'ignite' | 'ready' | 'respond', string>>;
  /** When the spot is offered: a window of the landscape shot (landT) or of the story (chapterT). */
  window: { landT?: [number, number]; chapterT?: [number, number] };
};

/*
 * Each region its own mechanic, and only what its sources support: Mendoza's fire was fought by
 * brigades of the provincial plan; Chubut's by hydrant planes among others. For Córdoba and the Delta
 * the sources do not detail the means, so there is no response: the reader follows the fire instead.
 */
export const DEFS: Record<string, Def> = {
  mendoza: {
    spot: [0.33, 0.54],
    cue: 'Tocá el foco',
    label: 'Encender el foco del piedemonte (ilustración)',
    ignite: 9,
    respond: 10,
    respondLabel: 'Intentar apagar el fuego',
    says: {
      ignite: 'El fuego prende en el pastizal seco del piedemonte y el viento lo empuja por la ladera.',
      ready: 'El frente avanzó por el piedemonte.',
      respond: 'Una cuadrilla moja el borde: las llamas bajan y quedan humo y brasas. En El Challao lo combatieron brigadistas del Plan Provincial de Manejo del Fuego. Ilustración.',
    },
    window: { landT: [0.34, 0.64] },
  },
  cordoba: {
    spot: [0.6, 0.6],
    cue: 'Seguí el frente',
    label: 'Seguir un frente de fuego en la ladera (ilustración)',
    ignite: 10,
    respond: 10,
    respondLabel: 'Esperar la lluvia',
    says: {
      ignite: 'Un frente avanza por la cara de la sierra y el humo baja al valle.',
      ready: 'El frente sigue por la ladera.',
      respond: 'La lluvia apaga el frente. En 2020 recién llegó en octubre, según el informe provincial. Ilustración: no reproduce el incendio real.',
    },
    window: { landT: [0.34, 0.64] },
  },
  delta: {
    spot: [0.62, 0.585],
    cue: 'Tocá la isla',
    label: 'Ver las quemas en las islas (ilustración)',
    ignite: 11,
    respond: 11,
    respondLabel: 'Esperar la lluvia',
    says: {
      ignite: 'Una quema prende en el pajonal de una isla, después en otras: cerca, en el medio y en el horizonte.',
      ready: 'El humo se tiende sobre el río y cubre el horizonte.',
      respond: 'Llueve sobre las islas y los focos se apagan de a uno; el humo tarda en irse. La lluvia es una representación, no el clima de un día de 2020.',
    },
    window: { landT: [0.34, 0.64] },
  },
  chubut: {
    spot: [0.56, 0.48],
    cue: 'Llamá al avión',
    label: 'Hacer pasar un avión hidrante sobre el fuego (ilustración)',
    respond: 10,
    says: {
      respond: 'Un avión hidrante suelta su carga sobre la línea de fuego. Una descarga baja las llamas, pero no apaga un incendio forestal: en Chubut trabajaron aviones hidrantes, helicópteros y más de 500 personas. Ilustración.',
    },
    window: { chapterT: [0.1, 0.19] },
  },
};

/**
 * first: the first sequence of this page load (it explains how the pause works, how to leave and how
 * to go on). reduced: reduced motion, played as fixed stages (see begin). half: under reduced motion
 * the response is two fades, to the response itself and then to the after, with a stop between them
 * ('mid') where the reader chooses to go on.
 */
export type Run = { id: string | null; phase: Phase; start: number; dur: number; first: boolean; reduced: boolean; half: 0 | 1 };

const IDLE: Run = { id: null, phase: 'idle', start: 0, dur: 0, first: false, reduced: false, half: 0 };
let run: Run = IDLE;
/** Whether a sequence was started since the page loaded (memory only: a reload explains again). */
let explained = false;
/** Under reduced motion every stage is a short fade, not an animation. */
const FADE = 1.2;
const done = new Set<string>();
const subs = new Set<(r: Run) => void>();
let savedY = 0;
let reducedNow = false;

const emit = () => subs.forEach((fn) => fn(run));
const secs = (s: number) => (reducedNow ? FADE : s) * 1000;

function lock(on: boolean) {
  const html = document.documentElement;
  if (on) {
    savedY = window.scrollY;
    html.dataset.hold = '1';
    hold(true);
  } else {
    delete html.dataset.hold;
    if (Math.abs(window.scrollY - savedY) > 1) window.scrollTo(0, savedY);
    hold(false);
  }
}

function enter(phase: Phase, dur = 0) {
  run = { ...run, phase, start: performance.now(), dur };
  emit();
}

export const getRun = () => run;
/** No sequence started yet in this page load: the spot explains what it does. */
export const firstTime = () => !explained;
export const isDone = (id: string) => done.has(id);
export function subscribeRun(fn: (r: Run) => void): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

/** Starts a region's sequence (also "repeat" after it is done). Ignored while another one runs. */
export function begin(id: string, reduced: boolean) {
  const d = DEFS[id];
  if (!d || (run.phase !== 'idle' && run.phase !== 'done')) return;
  reducedNow = reduced;
  done.delete(id);
  run = { ...IDLE, id, first: !explained, reduced };
  explained = true;
  lock(true);
  if (d.ignite) enter('ignite', secs(d.ignite));
  else enter('respond', secs(d.respond!));
}

/** The response, once the fire has developed. */
export function respond() {
  const d = run.id ? DEFS[run.id] : null;
  if (!d || !d.respond) return;
  if (run.phase === 'ready') { run = { ...run, half: 0 }; enter('respond', secs(d.respond)); }
  // reduced motion: from the response to the after
  else if (run.phase === 'mid') { run = { ...run, half: 1 }; enter('respond', secs(d.respond)); }
}

/** Leaves the sequence at any point: the page is released where it was, nothing is kept. */
export function exit() {
  if (run.phase === 'idle' || run.phase === 'done') return;
  run = IDLE;
  lock(false);
  emit();
}

/** Clears a finished sequence when its region is left. */
export function forget(id: string) {
  if (run.id === id && run.phase === 'done') { run = IDLE; emit(); }
}

/**
 * Progress of the running stage (0..1), advancing the state when a timed stage ends. Called by the
 * renderer once per drawn frame.
 */
export function tick(now = performance.now()): number {
  if (run.phase !== 'ignite' && run.phase !== 'respond') return run.phase === 'idle' ? 0 : 1;
  const p = run.dur > 0 ? Math.min(1, (now - run.start) / run.dur) : 1;
  if (p < 1) return p;
  const d = DEFS[run.id!];
  if (run.phase === 'ignite' && d.respond) { enter('ready'); return 1; }
  if (run.phase === 'respond' && run.reduced && run.half === 0) { enter('mid'); return 1; }
  // the sequence is over: the region keeps its end state and the page is released
  done.add(run.id!);
  enter('done');
  lock(false);
  return 1;
}

/**
 * What the renderer draws now: the stage and its progress. Under reduced motion the response is
 * drawn as two halves (0 to 0.5, a stop at 0.5, then 0.5 to 1).
 */
export function stageNow(now = performance.now(), advance = true): { phase: 'ignite' | 'ready' | 'respond' | 'done'; p: number } | null {
  if (run.phase === 'idle') return null;
  const p = advance ? tick(now) : run.phase === 'ignite' || run.phase === 'respond' ? (run.dur > 0 ? Math.min(1, (now - run.start) / run.dur) : 1) : 1;
  const r = run;
  if (r.phase === 'idle') return null;
  if (r.phase === 'mid') return { phase: 'respond', p: 0.5 };
  if (r.phase === 'respond' && r.reduced) return { phase: 'respond', p: r.half === 0 ? 0.5 * p : 0.5 + 0.5 * p };
  return { phase: r.phase, p };
}
