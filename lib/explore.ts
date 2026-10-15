/*
 * Pure logic of the explore screen (home) and the cumulative map (method). Ported from legacy/app.js:
 * colour scales, grid views, ranking, province series, two-year comparison. No React, no DOM.
 */
import { MESES, MESES_L, fmt as fmtN } from './fire';
import { YEARS, type Compare } from './router';

export type Cell = [number, number, number];
export type Pm = Record<string, Record<string, number>>;

export type National = {
  meta: any;
  pm: Pm;
  step: number;
  grids: Record<number, Cell[]>;
  /** highest cell count of any single year / of the 2012-2026 accumulation (colour scale maxima) */
  maxN: number;
  maxAll: number;
  all: Cell[];
};

export const DEFAULT_YEAR = 2020;
export const LAST_YEAR = YEARS[YEARS.length - 1];
export const DIFF_MIN = 3;
/** Complete years, for the seasonal average (legacy FULL). */
export const FULL = YEARS.filter((y) => y > 2012 && y < 2026);

/* ---------- loading ---------- */

export function buildNational(meta: any, pm: Pm, grids: { step: number; year: number; cells: Cell[] }[]): National {
  const byYear: Record<number, Cell[]> = {};
  let step = 0.25;
  let maxN = 1;
  const acc = new Map<string, Cell>();
  grids.forEach((g) => {
    byYear[g.year] = g.cells;
    step = g.step;
    g.cells.forEach((c) => {
      if (c[2] > maxN) maxN = c[2];
      const k = c[0] + ',' + c[1];
      const hit = acc.get(k);
      if (hit) hit[2] += c[2]; else acc.set(k, [c[0], c[1], c[2]]);
    });
  });
  const all = Array.from(acc.values());
  let maxAll = 1;
  all.forEach((c) => { if (c[2] > maxAll) maxAll = c[2]; });
  return { meta, pm, step, grids: byYear, maxN, maxAll, all };
}

/* ---------- colour scales ---------- */

const LUT: string[] = (() => {
  const stops: [number, number[]][] = [[0, [90, 26, 16]], [0.35, [179, 48, 15]], [0.65, [255, 106, 19]], [1, [255, 226, 122]]];
  const out: string[] = [];
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    let a = stops[0], b = stops[1];
    for (let s = 0; s < stops.length - 1; s++) { if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; } }
    const u = (t - a[0]) / (b[0] - a[0] || 1);
    const c = [0, 1, 2].map((k) => Math.round(a[1][k] + (b[1][k] - a[1][k]) * u));
    out.push('rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.35 + 0.65 * t).toFixed(2) + ')');
  }
  return out;
})();

/** Sequential scale: log of the count over the log of the maximum. */
export function colorFor(n: number, mx: number): string {
  const t = Math.min(1, Math.log(n + 1) / Math.log(mx + 1));
  return LUT[Math.round(t * 63)];
}

/** Colour-blind-safe diverging scale: blue = fewer heat spots in B, orange = more; symmetric, log magnitude. */
export function divColor(d: number, mx: number): string {
  const t = Math.min(1, Math.log(1 + Math.abs(d)) / Math.log(1 + mx));
  const a = (0.4 + 0.6 * t).toFixed(2);
  const c = d > 0 ? [200 + 55 * t, 90 + 106 * t, 20 + 100 * t] : [40 + 110 * t, 110 + 100 * t, 190 + 65 * t];
  return 'rgba(' + c.map(Math.round).join(',') + ',' + a + ')';
}

/* ---------- grid views ---------- */

export type CellValue = number | { a: number; b: number };

/** What the canvas draws: cells with their colour and an index (cell key -> value) for the tooltip. */
export type GridView = {
  cells: Cell[];
  color: (n: number) => string;
  index: Map<string, CellValue>;
  step: number;
};

export type ViewSpec = { kind: 'year'; year: number } | { kind: 'all' } | { kind: 'cmp'; cmp: Compare };

export const cellKey = (lon: number, lat: number, step: number) => Math.floor(lon / step) + ',' + Math.floor(lat / step);

const yearCells = (nat: National, y: number): Cell[] => nat.grids[y] || [];

function maxOf(cs: Cell[]): number {
  let m = 1;
  cs.forEach((c) => { if (c[2] > m) m = c[2]; });
  return m;
}

function diffCells(nat: National, a: number, b: number): Cell[] {
  const m = new Map<string, Cell>();
  yearCells(nat, a).forEach((c) => { m.set(c[0] + ',' + c[1], [c[0], c[1], -c[2]]); });
  yearCells(nat, b).forEach((c) => {
    const k = c[0] + ',' + c[1], hit = m.get(k);
    if (hit) hit[2] += c[2]; else m.set(k, [c[0], c[1], c[2]]);
  });
  return Array.from(m.values());
}

export function buildView(nat: National, spec: ViewSpec): GridView {
  const step = nat.step;
  const index = new Map<string, CellValue>();
  if (spec.kind === 'cmp') {
    const C = spec.cmp;
    yearCells(nat, C.a).forEach((c) => { index.set(cellKey(c[0], c[1], step), { a: c[2], b: 0 }); });
    yearCells(nat, C.b).forEach((c) => {
      const k = cellKey(c[0], c[1], step), hit = index.get(k) as { a: number; b: number } | undefined;
      if (hit) hit.b = c[2]; else index.set(k, { a: 0, b: c[2] });
    });
    if (C.view === 'd') {
      const cells = diffCells(nat, C.a, C.b).filter((c) => Math.abs(c[2]) >= DIFF_MIN);
      let md = 1;
      cells.forEach((c) => { if (Math.abs(c[2]) > md) md = Math.abs(c[2]); });
      return { cells, color: (d) => divColor(d, md), index, step };
    }
    const mm = Math.max(maxOf(yearCells(nat, C.a)), maxOf(yearCells(nat, C.b)));
    return { cells: yearCells(nat, C.view === 'a' ? C.a : C.b), color: (n) => colorFor(n, mm), index, step };
  }
  const cells = spec.kind === 'all' ? nat.all : yearCells(nat, spec.year);
  const mx = spec.kind === 'all' ? nat.maxAll : nat.maxN;
  cells.forEach((c) => { index.set(cellKey(c[0], c[1], step), c[2]); });
  return { cells, color: (n) => colorFor(n, mx), index, step };
}

/* ---------- provinces ---------- */

const mkey = (y: number, m: number) => y + '-' + (m < 10 ? '0' : '') + m;

export const totalYear = (meta: any, y: number): number => (meta.por_anio && meta.por_anio[String(y)]) || 0;

export function provYear(pm: Pm, p: string, y: number): number {
  const o = pm[p] || {};
  let s = 0;
  for (let m = 1; m <= 12; m++) s += o[mkey(y, m)] || 0;
  return s;
}

export function provRange(pm: Pm, p: string, y: number, f: number, t: number): number {
  const o = pm[p] || {};
  let s = 0;
  for (let m = f; m <= t; m++) s += o[mkey(y, m)] || 0;
  return s;
}

/** Province ranking for months f..t of year y (default: the whole year, as before). */
export function ranking(pm: Pm, provs: string[], y: number, f = 1, t = 12) {
  return provs.map((n) => ({ n, v: provRange(pm, n, y, f, t) })).sort((a, b) => b.v - a.v);
}

/* ---------- period filter (month / quarter) ---------- */

/** First and last month (1-12) of a period key; null = the whole year. */
export function periodRange(m: string | null): [number, number] {
  if (!m) return [1, 12];
  if (m[0] === 't') { const q = +m.slice(1); return [(q - 1) * 3 + 1, q * 3]; }
  return [+m, +m];
}

/** Label of a period: "T3 (jul–sep)" or "agosto"; null = whole year. */
export function periodLabel(m: string | null): string {
  if (!m) return 'Todo el año';
  const [f, t] = periodRange(m);
  return m[0] === 't' ? 'T' + m.slice(1) + ' (' + MESES[f - 1] + '–' + MESES[t - 1] + ')' : MESES_L[f - 1];
}

/** Honest data caveat of year y for months f..t: 2012 starts on 20 Jan, 2026 ends on 14 Oct (no Nov/Dec). */
export function yearCaveat(y: number, f: number, t: number): string {
  if (y === 2012 && f === 1) return '2012 empieza el 20/01';
  if (y === 2026 && f > 10) return '2026 no tiene datos para este período';
  if (y === 2026 && t >= 10) return '2026 llega hasta el 14/10';
  return '';
}

/** True when a year has no data at all in months f..t. */
export const noData = (y: number, f: number, t: number) => y === 2026 && f > 10;

/** Monthly average over the complete years and the selected year (null = no data yet, 2026 after October). */
export function provSeason(pm: Pm, p: string, y: number) {
  const o = pm[p] || {};
  const avg: number[] = [];
  const sel: (number | null)[] = [];
  for (let m = 1; m <= 12; m++) {
    let s = 0;
    FULL.forEach((yy) => { s += o[mkey(yy, m)] || 0; });
    avg.push(s / FULL.length);
    sel.push(y === 2026 && m > 10 ? null : o[mkey(y, m)] || 0);
  }
  return { avg, sel };
}

/* ---------- two-year comparison ---------- */

/** Months present in both years (2012 starts on 20 Jan, 2026 ends on 14 Oct). */
export function commonMonths(a: number, b: number): [number, number] {
  let f = 1, t = 12;
  [a, b].forEach((y) => { if (y === 2012) f = 2; if (y === 2026) t = 9; });
  return [f, t];
}

export function partialNote(a: number, b: number): string {
  const L: string[] = [];
  if (a === 2026 || b === 2026) L.push('2026 incluye datos solo hasta el 14/10');
  if (a === 2012 || b === 2012) L.push('2012 empieza el 20/01');
  if (!L.length || a === b) return '';
  const cm = commonMonths(a, b);
  return 'Atención: ' + L.join(' y ') + '. El mapa compara años completos, así que la diferencia está sesgada; el ranking usa solo los meses completos en común (' + MESES[cm[0] - 1] + '–' + MESES[cm[1] - 1] + ').';
}

/** Rows of the two-year table over the complete months in common, narrowed to months f0..t0 when a period is chosen. */
export function compareRows(pm: Pm, provs: string[], a: number, b: number, f0 = 1, t0 = 12) {
  const cm = commonMonths(a, b);
  const from = Math.max(cm[0], f0), to = Math.min(cm[1], t0);
  const empty = from > to;
  const rows = provs.map((n) => {
    const va = empty ? 0 : provRange(pm, n, a, from, to), vb = empty ? 0 : provRange(pm, n, b, from, to);
    return { n, a: va, b: vb, d: vb - va };
  }).sort((p, q) => q.d - p.d);
  return { rows, from, to, empty, full: from === 1 && to === 12 };
}

export type CompareRow = ReturnType<typeof compareRows>['rows'][number];

/** One-line reading addition: the province with the largest absolute change, figures from the table, no adjectives. */
export function largestChange(rows: CompareRow[], a: number, b: number, period: string | null): string {
  let top: CompareRow | null = null;
  rows.forEach((r) => { if (r.d !== 0 && (!top || Math.abs(r.d) > Math.abs(top.d))) top = r; });
  if (!top) return '';
  const r: CompareRow = top;
  const lead = period ? 'En ' + periodLabel(period) + ', la' : 'La';
  return `${lead} provincia con mayor cambio fue ${r.n}: ${fmtN(r.a)} focos en ${a} y ${fmtN(r.b)} en ${b} (${signed(r.d)}${fmtN(Math.abs(r.d))}).`;
}

export const monthRangeText = (f: number, t: number) => MESES_L[f - 1] + ' a ' + MESES_L[t - 1];

/* ---------- labels ---------- */

export const signed = (d: number) => (d > 0 ? '+' : d < 0 ? '−' : '');

export function degLabel(v: number, pos: string, neg: string): string {
  return Math.abs(v).toFixed(2).replace('.', ',') + '° ' + (v < 0 ? neg : pos);
}

/** Year plus its data caveat, as shown next to counts (legacy). */
export const yearNote = (y: number) => (y === 2026 ? ' (hasta el 14/10)' : '') + (y === 2012 ? ' (desde el 20/01)' : '');
