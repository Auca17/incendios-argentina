'use client';
/*
 * State of the "Explorá" section: the year shown on the map and the selected province. It lives in
 * the address (?y=2020&p=Corrientes, replaceState: no history spam) so a view can be shared, and is
 * shared by the panel and the map through a tiny store.
 *
 * Legacy links keep working: the old explorer hash (#0&y=…&p=…&c=…) opens this section with its year
 * and province; the old chapter hashes #1..#6 (legacy EVENTS order) open the matching story and #7
 * (method) opens the sources.
 */
export const YEARS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
export const DEFAULT_YEAR = 2020;

export type Explore = { year: number; prov: string | null };

let state: Explore = { year: DEFAULT_YEAR, prov: null };
const subs = new Set<(s: Explore) => void>();

export const getExplore = () => state;

export function setExplore(patch: Partial<Explore>) {
  state = { ...state, ...patch };
  const url = new URL(location.href);
  url.searchParams.set('y', String(state.year));
  if (state.prov) url.searchParams.set('p', state.prov); else url.searchParams.delete('p');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  subs.forEach((fn) => fn(state));
}

export function subscribeExplore(fn: (s: Explore) => void): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

const validYear = (v: string | null) => (v && YEARS.includes(+v) ? +v : null);

/** Reads ?y=&p= and the legacy hashes. Returns where to go: 'explore', a story index 0..5 in legacy order, 'sources' or null. */
export function readAddress(): { go: 'explore' | 'sources' | number | null } {
  const url = new URL(location.href);
  let year = validYear(url.searchParams.get('y'));
  let prov = url.searchParams.get('p');
  let go: 'explore' | 'sources' | number | null = year || prov ? 'explore' : null;

  let raw = location.hash.replace(/^#/, '');
  try { raw = decodeURIComponent(raw); } catch { /* keep raw */ }
  const m = raw.match(/^(\d+)(.*)$/);
  if (m) {
    const n = +m[1];
    const kv: Record<string, string> = {};
    m[2].split('&').forEach((p) => { const i = p.indexOf('='); if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1); });
    if (n === 0) {
      const c = (kv.c || '').split('-');
      year = validYear(c[1] || null) ?? validYear(kv.y ?? null) ?? year;
      prov = kv.p || prov;
      go = 'explore';
    } else if (n >= 1 && n <= 6) go = n - 1;
    else go = 'sources';
  }
  state = { year: year ?? DEFAULT_YEAR, prov: prov || null };
  if (m) history.replaceState(null, '', url.pathname + (year || prov ? `?y=${state.year}${state.prov ? '&p=' + encodeURIComponent(state.prov) : ''}` : ''));
  return { go };
}
