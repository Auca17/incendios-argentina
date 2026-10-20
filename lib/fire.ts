/*
 * Fire-chapter helpers shared by sidebar, map and scene. Ported from legacy/app.js; the figures, the
 * chapter assignment of each fact and the p -> scene mapping are unchanged.
 */
import type { Foci } from './data';

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

/** When two sources give different figures, both are shown side by side. */
export const ALT: Record<string, [string, string][]> = {
  cordoba: [['316.150 ha', 'Secretaría de Ambiente de Córdoba'], ['321.688 ha', 'Ministerio de Seguridad']],
  delta: [['328.000 ha', 'Ministerio de Ambiente de Santa Fe'], ['350.000–400.000 ha', 'Taller Ecologista, estimación no oficial']],
  corrientes: [['934.238 ha', 'INTA Corrientes'], ['unas 632 mil ha', 'Servicio Nacional de Manejo del Fuego']],
};

export type Fact = { figure: string; text: string; tag?: string };

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
