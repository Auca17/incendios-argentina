'use client';
/*
 * Which "Más información" is open: the index of a story (0..5), 'more' for the interlude, or null.
 * A tiny store shared by the buttons in the reading pods and the one dialog of the page.
 */
export type DialogTarget = number | 'more' | null;

let current: DialogTarget = null;
let opener: HTMLElement | null = null;
const subs = new Set<(t: DialogTarget) => void>();

export function openDialog(t: DialogTarget, from: HTMLElement | null) {
  current = t;
  opener = from;
  subs.forEach((fn) => fn(current));
}

export function closeDialog() {
  current = null;
  subs.forEach((fn) => fn(current));
}

/** The button that opened the dialog: focus goes back to it when it closes. */
export const dialogOpener = () => opener;

export function subscribeDialog(fn: (t: DialogTarget) => void): () => void {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
