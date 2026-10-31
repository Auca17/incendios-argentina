'use client';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/*
 * Smooth wheel scrolling for the tour (Lenis). The page keeps its native scroll: window.scrollY is real,
 * so the scroll driver, sticky layers, the scrollbar and the keyboard work as before; only the mouse
 * wheel's steps are turned into a glide. Off with prefers-reduced-motion, on touch screens (their
 * scroll is already smooth) and with ?lenis=0 in the address (to compare with the native scroll).
 */
let lenis: Lenis | null = null;
let started = false;
let paused = false;

function wanted() {
  if (new URLSearchParams(window.location.search).get('lenis') === '0') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return window.matchMedia('(pointer: fine)').matches;
}

function sync() {
  if (wanted() && !lenis) {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      anchors: false,
      // its own animation loop: off by default, and without it the wheel is held and never applied
      autoRaf: true,
      // a dialog scrolls on its own
      prevent: (node) => !!node.closest('dialog, [role="dialog"]'),
    });
    if (paused) lenis.stop();
  } else if (!wanted() && lenis) {
    lenis.destroy();
    lenis = null;
  }
}

/** Starts smooth scrolling once (idempotent); follows changes of the reduced-motion preference. */
export function startSmoothScroll() {
  if (started || typeof window === 'undefined') return;
  started = true;
  sync();
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', sync);
}

/** Whether the wheel is already smoothed (the scroll driver then eases less on top of it). */
export const smoothActive = () => !!lenis;

/** Scrolls the page to `top`: gliding when asked and allowed, at once otherwise. */
export function scrollToY(top: number, smooth: boolean) {
  if (lenis) lenis.scrollTo(top, { immediate: !smooth, force: true });
  else window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

/** Holds the page while a dialog is open (its own content still scrolls). */
export function pauseSmoothScroll(on: boolean) {
  paused = on;
  if (!lenis) return;
  if (on) lenis.stop();
  else lenis.start();
}
