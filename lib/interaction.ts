import { seg } from './fire';

/*
 * Scene sequences: a short illustrated sequence in some regions' landscapes (a fire starting and
 * spreading, then the response: a brigade, rain) and, in Chubut, a hydrant plane over the cinematic
 * opening. Nothing is clicked and the page is never held: a sequence starts by itself when the reader
 * reaches its stretch of scroll and plays on its own clock, like a film, while the scroll can push it
 * along. Its progress is max(clock, scroll), with a speed limit (never the whole sequence in less than
 * about half its length), so a reader who stops sees it whole, a reader who scrolls fast still sees
 * it play, and going back above its start re-arms it.
 *
 *   before the stretch: nothing (the landscape's own state)
 *   ignite (p 0..1) → respond (p 0..1) → done          (Chubut has no ignite: its fire already burns)
 *
 * Under reduced motion there is no clock: the sequence follows the scroll only.
 */
export type Def = {
  /** Shown under the scene while it plays, and read by screen readers. */
  label: string;
  /** Seconds of each stage; no ignite: the fire is already burning (Chubut). */
  ignite?: number;
  respond: number;
  /** Text for each stage, under the scene. */
  says: Partial<Record<'ignite' | 'respond' | 'done', string>>;
  /**
   * Its stretch of scroll: of the landscape shot (landT) or, in Chubut, of the cinematic opening
   * (chapterT / CINE_END). The sequence starts at the first value; the scroll alone completes it at the second.
   */
  window: [number, number];
  on: 'land' | 'cine';
};

/*
 * Each region its own mechanic, and only what its sources support: Mendoza's fire was fought by
 * brigades of the provincial plan; Chubut's by hydrant planes among others. For Córdoba and the Delta
 * the sources do not detail the means, so the response is the rain, said to be a representation.
 */
export const DEFS: Record<string, Def> = {
  mendoza: {
    label: 'Ilustración: un incendio de pastizal en el piedemonte y una brigada que lo combate',
    ignite: 4.5,
    respond: 7,
    says: {
      ignite: 'El pastizal seco del piedemonte prende y el fuego corre por la ladera; más allá se abre un segundo frente.',
      respond: 'Dos líneas de brigadistas atacan cada frente desde su lado: donde llega el agua, el fuego se apaga y quedan humo y brasas.',
      done: 'En El Challao lo combatieron brigadistas del Plan Provincial de Manejo del Fuego. La escena es una ilustración.',
    },
    window: [0.34, 0.64],
    on: 'land',
  },
  cordoba: {
    label: 'Ilustración: un frente de fuego en la ladera de una sierra y la lluvia',
    ignite: 5,
    respond: 5,
    says: {
      ignite: 'Un frente avanza por la cara de la sierra, ladera arriba; el humo baja y se junta en el valle.',
      respond: 'Llueve y el frente se apaga de a tramos.',
      done: 'En 2020 la lluvia que cortó la temporada recién llegó en octubre, según el informe provincial. Ilustración: no reproduce el incendio real.',
    },
    window: [0.34, 0.64],
    on: 'land',
  },
  delta: {
    label: 'Ilustración: quemas en las islas del Delta y la lluvia',
    ignite: 4.5,
    respond: 5,
    says: {
      ignite: 'Prende el pajonal de una isla, después el de otras: cerca, en el medio y en el horizonte. El humo se tiende sobre el río.',
      respond: 'Llueve sobre las islas y las llamas bajan; el humo tarda en irse.',
      done: 'La lluvia es una representación, no el clima de un día de 2020: las fuentes no dicen que la lluvia apagara estas quemas.',
    },
    window: [0.34, 0.62],
    on: 'land',
  },
  chubut: {
    label: 'Recreación ilustrada: un avión hidrante descarga agua sobre la línea de fuego',
    respond: 7,
    says: {
      respond: 'Un avión hidrante baja sobre la línea de fuego y suelta su carga.',
      done: 'Una descarga baja las llamas, pero no apaga un incendio forestal: en Chubut trabajaron aviones hidrantes, helicópteros y más de 500 personas. Recreación ilustrada: no es la ruta de un vuelo real.',
    },
    window: [0.14, 0.72],
    on: 'cine',
  },
};

export type SeqPhase = 'ignite' | 'respond' | 'done';
export type Seq = { phase: SeqPhase; p: number; /** Still moving on its own clock. */ live: boolean };

/** Each sequence while the reader is inside its stretch: when it started and how far it has played. */
const runs = new Map<string, { start: number; p: number; t: number }>();
/** The fastest a sequence may play, as a share of its length per second of its own duration. */
const MIN_SHARE = 0.55;

/**
 * The stage of a region's sequence at position `pos` of its stretch (landT, or chapterT / CINE_END in
 * Chubut). Pure in the scroll except for the start time, which it records on first entry and forgets
 * when the reader goes back above the start.
 */
export function seqStage(id: string, pos: number, reduced: boolean, now = performance.now()): Seq | null {
  const d = DEFS[id];
  if (!d) return null;
  const [w0, w1] = d.window;
  if (pos < w0) { runs.delete(id); return null; }
  let r = runs.get(id);
  if (!r) runs.set(id, (r = { start: now, p: 0, t: now }));
  const total = (d.ignite ?? 0) + d.respond;
  const byScroll = seg(pos, w0, w1);
  const byClock = reduced ? 0 : (now - r.start) / 1000 / total;
  const target = Math.min(1, Math.max(byScroll, byClock));
  // the scroll may push it, never faster than the speed limit (reduced motion: the scroll alone)
  if (reduced) r.p = target;
  else if (now > r.t) r.p = Math.max(r.p, Math.min(target, r.p + (now - r.t) / 1000 / (total * MIN_SHARE)));
  r.t = Math.max(r.t, now);
  const P = r.p;
  const live = !reduced && P < 1;
  if (P >= 1) return { phase: 'done', p: 1, live };
  const s = P * total;
  if (d.ignite && s < d.ignite) return { phase: 'ignite', p: s / d.ignite, live };
  return { phase: 'respond', p: (s - (d.ignite ?? 0)) / d.respond, live };
}

/** A sequence started and not finished: its scene stays on screen until it ends (Chubut's opening). */
export const seqPlaying = (id: string) => { const r = runs.get(id); return !!r && r.p < 1; };
/** A sequence that played to its end since the reader entered its stretch. */
export const seqDone = (id: string) => (runs.get(id)?.p ?? 0) >= 1;

/* The renderer publishes the sequence on screen, for the caption under the scene. */
export type Shown = { id: string; phase: SeqPhase } | null;
let shown: Shown = null;
const subs = new Set<(s: Shown) => void>();
export function publish(s: Shown) {
  if (s?.id === shown?.id && s?.phase === shown?.phase) return;
  shown = s;
  subs.forEach((fn) => fn(shown));
}
export function subscribeShown(fn: (s: Shown) => void): () => void {
  subs.add(fn);
  fn(shown);
  return () => { subs.delete(fn); };
}
