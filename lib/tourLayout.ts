/*
 * Desktop layout of the tour (>= 1024 px), shared by the canvases and mirrored in
 * ScrollyExperience.module.css: reading pod on the left, map in the middle, scene box on the right,
 * HUD on the right edge. Below 1024 px the map and the scene share a fixed stage at the top.
 */
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const DESKTOP = 1024;
export const GUTTER = 32;
export const HUD_W = 72;

export const podWidth = (w: number) => clamp(w * 0.3, 340, 460);
export const podRight = (w: number) => GUTTER + podWidth(w);
export const sceneWidth = (w: number) => clamp(w * 0.26, 280, 400);

/** Horizontal band [left, right] the map fits into, in CSS px of the map canvas. */
export function mapRect(w: number, chapter: number): [number, number] {
  if (w < DESKTOP) return [8, w - 8];
  const left = podRight(w) + GUTTER;
  const right = chapter >= 0 && chapter <= 5 ? w - HUD_W - sceneWidth(w) - 24 : w - HUD_W;
  return [left, right];
}
