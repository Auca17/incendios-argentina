/*
 * Fire-chapter helpers shared by sidebar, map and scene. Ported from legacy/app.js; the figures, the
 * chapter assignment of each fact and the p -> scene mapping are unchanged.
 */
import { S_FIRE, S_FIGHT } from './scene';
import type { Foci } from './data';

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

export const STAGE_NAMES = ['Cómo empezó', 'El fuego', 'Combate'];
export const CHAPTERS = ['Cómo empezó', 'El fuego', 'Cómo se combatió'];

/** Chapter of each fact, keyed by its figure (texts in EVENTS stay untouched); default: 1, the fire. */
const FACT_STAGE: Record<string, Record<string, number>> = {
  cordoba: { Octubre: 2 },
  delta: { Bajante: 0 },
  misiones: { '+200': 2, '1': 2, 'Por dentro': 2, Denuncia: 0 },
  chubut: { '+500': 2, '4 provincias': 2 },
};
const FACT_TAG: Record<string, Record<string, string>> = { mendoza: { '+30 %': 'a nivel provincial' } };

/** When two sources give different figures, both are shown side by side. */
export const ALT: Record<string, [string, string][]> = {
  cordoba: [['316.150 ha', 'Secretaría de Ambiente de Córdoba'], ['321.688 ha', 'Ministerio de Seguridad']],
  delta: [['328.000 ha', 'Ministerio de Ambiente de Santa Fe'], ['350.000–400.000 ha', 'Taller Ecologista, estimación no oficial']],
  corrientes: [['934.238 ha', 'INTA Corrientes'], ['unas 632 mil ha', 'Servicio Nacional de Manejo del Fuego']],
};

export type Fact = { figure: string; text: string; tag?: string };

/** Facts of one chapter (0 start, 1 fire, 2 fight). */
export function factsFor(ev: any, stage: number): Fact[] {
  const map = FACT_STAGE[ev.id] || {};
  const tags = FACT_TAG[ev.id] || {};
  return (ev.facts as string[][])
    .filter((f) => (f[0] in map ? map[f[0]] : 1) === stage)
    .map((f) => ({ figure: f[0], text: f[1], tag: tags[f[0]] }));
}

function shortCause(ev: any): string {
  return ({
    intencional: 'Fuego provocado de manera intencional.',
    sequia: 'Sequía extrema, calor y vegetación seca.',
    quema: 'Quema de pastizal fuera de control.',
  } as Record<string, string>)[ev.cause.kind];
}

function meansText(m: { plane?: number; heli?: number }): string {
  const L: string[] = [];
  if (m.plane) L.push('avión hidrante');
  if (m.heli) L.push('helicóptero con helibalde');
  L.push('brigadistas con mangueras');
  return L.join(', ') + '.';
}

/** Caption under the scene: [bold lead, rest]. */
export function stageCaption(ev: any, st: number): [string, string] {
  if (st === 0) return ['Cómo empezó:', ' ' + shortCause(ev)];
  if (st === 1) return ['Punto máximo:', ` ${fmt(ev.hero.value)} ${ev.hero.unit} afectadas.`];
  return ['Combate en el terreno:', ' ' + meansText(ev.means || { crew: 3 })];
}

/* ---------- reading progress -> scene ---------- */

/** p: scroll progress 0..1. a, b: p at which the headings of chapters 2 and 3 reach the reading line. */
export type Read = { p: number; a: number; b: number };
export const READ_0: Read = { p: 0, a: 0.3, b: 0.55 };

const soft = (t: number) => 0.4 * t + 0.6 * t * t * (3 - 2 * t); // gentle ease inside each stage

/** Piecewise map so each scene stage lines up with its text section (legacy toScene). */
export function toScene(r: Read): number {
  const S1 = S_FIRE, S2 = S_FIGHT;
  if (r.p <= r.a) return S1 * soft(r.p / r.a);
  if (r.p <= r.b) return S1 + (S2 - S1) * soft((r.p - r.a) / (r.b - r.a));
  return S2 + (1 - S2) * soft((r.p - r.b) / (1 - r.b));
}

export const stageOf = (s: number) => (s < S_FIRE ? 0 : s < S_FIGHT ? 1 : 2);

/* ---------- map readout ---------- */

/** Week shown for progress p; never empty, it starts at the first week that has foci (legacy fociWeek). */
export function fociWeek(E: Foci, p: number): number {
  return p < 0.9 ? E.first + 1 + Math.floor(seg(p, 0, 0.9) * (E.weeks - E.first - 1)) : E.weeks;
}

export function weekDate(E: Foci, w: number): string {
  const d = new Date(E.start + 'T00:00:00');
  d.setDate(d.getDate() + 7 * w - 1);
  const last = E.last ? new Date(E.last + 'T00:00:00') : null;
  if (last && d > last) d.setTime(last.getTime());
  return `${d.getDate()} de ${MESES_L[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Foci per month of one year summed over provinces (legacy monthSeries). */
export function monthSeries(pm: Record<string, Record<string, number>>, provs: string[], year: number): number[] {
  const out: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = year + '-' + (m < 10 ? '0' : '') + m;
    let s = 0;
    provs.forEach((p) => { s += (pm[p] && pm[p][key]) || 0; });
    out.push(s);
  }
  return out;
}
