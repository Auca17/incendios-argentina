'use client';
import { FOCAL, SECTIONS, tourProgress, tourState, type TourState } from './tour';

/*
 * One requestAnimationFrame loop for the whole tour. Every frame it reads scrollY and the viewport
 * size, derives the state with the pure tourState() and hands it to the subscribers. Section offsets
 * are measured once and cached (re-measured on resize and when the document height changes), so a
 * frame does no layout reads beyond scrollY. A subscriber returns true while it still needs frames
 * (the map camera settling); the loop stops as soon as nothing moves.
 */
export type Frame = { st: TourState; scrollY: number; vw: number; vh: number; progress: number; reduced: boolean };
type Sub = (f: Frame) => boolean | void;

const subs = new Set<Sub>();
let tops: number[] = [];
let heights: number[] = [];
let raf = 0;
let started = false;
let docH = 0;
let reduced = false;
let last: Frame | null = null;

function measure() {
  const y = window.scrollY;
  tops = [];
  heights = [];
  for (const s of SECTIONS) {
    const el = document.getElementById(s.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    tops.push(r.top + y);
    heights.push(r.height);
  }
  docH = document.documentElement.scrollHeight;
}

function frame() {
  raf = 0;
  if (document.documentElement.scrollHeight !== docH) measure();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const scrollY = window.scrollY;
  const st = tourState(scrollY + vh * FOCAL, tops, heights, reduced);
  const f: Frame = { st, scrollY, vw, vh, progress: tourProgress(scrollY, tops, heights, vh), reduced };
  last = f;
  let again = false;
  subs.forEach((fn) => { if (fn(f)) again = true; });
  if (again) request();
}

export function request() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  started = true;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduced = mq.matches;
  mq.addEventListener('change', () => { reduced = mq.matches; request(); });
  measure();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { measure(); request(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request(); });
  if (document.fonts) document.fonts.ready.then(() => { measure(); request(); });
}

/** Subscribes to frames; the callback is called right away with the latest frame. */
export function subscribe(fn: Sub): () => void {
  start();
  subs.add(fn);
  if (last) { if (fn(last)) request(); } else request();
  return () => { subs.delete(fn); };
}

/** Re-measures the sections (after a pod expands, for instance) and redraws. */
export function remeasure() {
  if (!started) return;
  measure();
  request();
}

export const sectionTop = (i: number) => tops[i] ?? 0;
