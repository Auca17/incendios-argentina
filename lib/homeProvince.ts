'use client';
import { useSyncExternalStore } from 'react';

/*
 * The reader's own province, asked (optionally) on the cover and again in the epilogue: one value
 * shared by both, kept in localStorage so a later visit still remembers it. Empty when not chosen.
 */
const KEY = 'home-province';
const subs = new Set<() => void>();
let value: string | null = null;

function read(): string {
  if (value === null) {
    try { value = window.localStorage.getItem(KEY) || ''; } catch { value = ''; }
  }
  return value;
}

export function setHomeProvince(p: string) {
  value = p;
  try {
    if (p) window.localStorage.setItem(KEY, p);
    else window.localStorage.removeItem(KEY);
  } catch { /* private mode: kept for this visit only */ }
  subs.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

/** The chosen province ('' when none), updating wherever it is changed. */
export function useHomeProvince(): string {
  return useSyncExternalStore(subscribe, read, () => '');
}
