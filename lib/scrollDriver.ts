'use client';
import { FOCAL, SECTIONS, tourProgress, tourState, type TourState } from './tour';

/*
 * One requestAnimationFrame loop for the whole tour. Every frame it reads scrollY and the viewport
 * size, derives the state with the pure tourState() and hands it to the subscribers. Section offsets
 * are measured once and cached (re-measured on resize and when the document height changes), so a
 * frame does no layout reads beyond scrollY. A subscriber returns true while it still needs frames
 * (the map camera settling); the loop stops as soon as nothing moves.
 *
 * Fast scrolling: the state handed out follows the scroll's state with a short ease (about 120 ms),
 * field by field, so a big jump in the page becomes a brief transition instead of a cut (clouds,
 * title, scenes). Slow scrolling barely notices it. It always lands exactly on the scroll's state, so
 * a position still has one frame; the scroll itself is never held. Not under reduced motion.
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

/** Continuous fields that ease; discrete ones (section, chapter, province) switch at once. */
const EASED = ['open', 'close', 'borders', 'hud', 'title', 'titleDock', 'bank', 'smoke', 'ash', 'epi', 'chapterT', 'moreT', 'land', 'landT', 'veil', 'card', 'pod'] as const;
const TAU = 0.12; // seconds
let shown: TourState | null = null;
let lastT = 0;

function ease(target: TourState): [TourState, boolean] {
  const now = performance.now();
  const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000));
  lastT = now;
  if (reduced || !shown || dt === 0) { shown = target; return [target, false]; }
  const k = 1 - Math.exp(-dt / TAU);
  const out = { ...target };
  let moving = false;
  for (const f of EASED) {
    // a new chapter starts from its own progress, not from the previous chapter's
    if ((f === 'chapterT' || f === 'moreT' || f === 'landT') && target.chapter !== shown.chapter) continue;
    const d = target[f] - shown[f];
    if (Math.abs(d) < 0.002) continue;
    out[f] = shown[f] + d * k;
    moving = true;
  }
  shown = out;
  return [out, moving];
}

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
  // a dialog over the story holds it: the same state, whatever the page does underneath
  if (held && last && last.vw === vw && last.vh === vh) {
    let settling = false;
    subs.forEach((fn) => { if (fn(last!)) settling = true; });
    if (settling) request();
    return;
  }
  const scrollY = held && last ? last.scrollY : window.scrollY;
  const [st, easing] = pinned
    ? [pinned, false]
    : ease(tourState(scrollY + vh * FOCAL, tops, heights, reduced, scrollY));
  const f: Frame = { st, scrollY, vw, vh, progress: pinned ? 0 : tourProgress(scrollY, tops, heights, vh), reduced };
  last = f;
  let again = easing;
  subs.forEach((fn) => { if (fn(f)) again = true; });
  // the visual tests wait for this: '1' once nothing eases or settles any more
  const settled = again ? '0' : '1';
  if (document.documentElement.dataset.tourSettled !== settled) document.documentElement.dataset.tourSettled = settled;
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

let pinned: TourState | null = null;
let held = false;

/**
 * A page without the tour (/explorar) pins the map to one state: the scroll no longer drives it.
 * Called before the first subscriber, so the map never draws a frame of the tour.
 */
export function pin(st: TourState | null) {
  pinned = st;
  shown = st;
  if (typeof window !== 'undefined') request();
}

/**
 * Holds the story while a dialog is open over it: the subscribers keep the last frame, so nothing
 * advances, rewinds or restarts, whatever happens to the page under the dialog.
 */
export function hold(on: boolean) {
  held = on;
  request();
}
