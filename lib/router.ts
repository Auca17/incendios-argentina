'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Hash routing, compatible with the legacy format:
 *   #<slide>&y=<year>&p=<province>&c=<yearA>-<yearB>-<view>
 * Legacy app.js decodes the whole hash, splits on "&", and reads: slide (int), y (a year with data),
 * p (province name, URI-encoded when written) and c (compare: two years + view a|b|d, default d).
 * Unknown keys are ignored. The legacy code writes y/p/c only on slide 0 (the explore screen).
 */
export const YEARS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export type CompareView = 'a' | 'b' | 'd';
export type Compare = { a: number; b: number; view: CompareView };
export type Route = { slide: number; y: number | null; p: string | null; c: Compare | null };

export const EMPTY_ROUTE: Route = { slide: 0, y: null, p: null, c: null };

const clampSlide = (n: number, count: number) => (Number.isFinite(n) ? Math.min(count - 1, Math.max(0, n)) : 0);

/** `provinces`, when given, validates `p` like legacy does; otherwise any non-empty name is kept. */
export function parseHash(hash: string, slideCount: number, provinces?: string[]): Route {
  let raw = (hash || '').replace(/^#/, '');
  try { raw = decodeURIComponent(raw); } catch { /* keep raw */ }
  const parts = raw.split('&');
  const o: Record<string, string> = {};
  parts.slice(1).forEach((kv) => {
    const i = kv.indexOf('=');
    if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1);
  });
  const y = YEARS.includes(+o.y) ? +o.y : null;
  const p = o.p && (!provinces || provinces.includes(o.p)) ? o.p : null;
  const c = (o.c || '').split('-');
  const compare: Compare | null =
    YEARS.includes(+c[0]) && YEARS.includes(+c[1])
      ? { a: +c[0], b: +c[1], view: /^[abd]$/.test(c[2]) ? (c[2] as CompareView) : 'd' }
      : null;
  return { slide: clampSlide(parseInt(parts[0], 10), slideCount), y, p, c: compare };
}

export function formatHash(r: Route): string {
  let h = '#' + r.slide;
  if (r.slide === 0) {
    if (r.y != null) h += '&y=' + r.y;
    if (r.p) h += '&p=' + encodeURIComponent(r.p);
    if (r.c) h += '&c=' + r.c.a + '-' + r.c.b + '-' + r.c.view;
  }
  return h;
}

/**
 * Route state synced with location.hash (replaceState, no history spam) plus chapter keys:
 * ArrowLeft = previous, ArrowRight = next. Space, PageUp/PageDown and the vertical arrows are left to the
 * browser so they scroll the reading column (as in legacy).
 */
export function useHashRoute(slideCount: number, provinces?: string[]) {
  const [route, setRoute] = useState<Route>(EMPTY_ROUTE);
  const ref = useRef<Route>(EMPTY_ROUTE);

  const apply = useCallback((next: Route, write: boolean) => {
    ref.current = next;
    setRoute(next);
    if (write) {
      try { history.replaceState(null, '', formatHash(next)); } catch { /* sandboxed */ }
    }
  }, []);

  const update = useCallback((patch: Partial<Route>) => {
    const next = { ...ref.current, ...patch };
    next.slide = clampSlide(next.slide, slideCount);
    apply(next, true);
  }, [apply, slideCount]);

  const go = useCallback((delta: number) => update({ slide: ref.current.slide + delta }), [update]);
  const setSlide = useCallback((slide: number) => update({ slide }), [update]);

  useEffect(() => {
    const read = () => apply(parseHash(window.location.hash, slideCount, provinces), false);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [apply, slideCount, provinces]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go]);

  return { route, setSlide, go, update };
}
