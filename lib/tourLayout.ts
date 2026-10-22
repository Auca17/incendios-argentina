/*
 * Desktop layout of the tour (>= 1024 px), shared by the canvases and mirrored in
 * ScrollyExperience.module.css: reading pod on the left, map in the middle, scene box on the right,
 * HUD on the right edge. Below 1024 px the map and the scene share a fixed stage at the top.
 */
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export const DESKTOP = 1024;
export const GUTTER = 32;
export const HUD_W = 72;
/** Room the cloud bank takes past the reading column (its puffy edge). */
export const BANK_EDGE = 136;

export const podWidth = (w: number) => clamp(w * 0.3, 340, 460);
export const podRight = (w: number) => GUTTER + podWidth(w);
export const sceneWidth = (w: number) => clamp(w * 0.26, 280, 400);

/** Horizontal band [left, right] the map fits into, in CSS px of the map canvas. */
export function mapRect(w: number, chapter: number): [number, number] {
  if (w < DESKTOP) return [8, w - 8];
  // the regions and the interlude have no cloud bank: the reading text sits on a dark scrim and the
  // territory takes the rest of the screen
  const left = podRight(w) + ((chapter >= 0 && chapter <= 5) || chapter === 7 || chapter === 8 ? 24 : BANK_EDGE);
  const right = chapter >= 0 && chapter <= 5 ? w - HUD_W - sceneWidth(w) - 24 : w - HUD_W;
  return [left, right];
}

/**
 * Cover title placement for a dock progress d (0 = middle of the cover, 1 = reading column):
 * top-left corner, unscaled width and scale. Shared by the title and by the clouds, which keep a
 * sunlit patch behind it so the text always sits on bright cloud.
 */
export function titleBox(vw: number, vh: number, d: number) {
  const mobile = vw < DESKTOP;
  const width = mobile ? vw - 32 : podWidth(vw);
  const s0 = mobile ? 1.05 : 1.45;
  const cx = (vw - width * s0) / 2, cy = vh * (mobile ? 0.3 : 0.34);
  const dx = mobile ? 16 : GUTTER, dy = mobile ? vh * 0.44 + 24 : 72;
  const scale = s0 + (1 - s0) * d;
  const height = (mobile ? 150 : 190) * scale;
  return { x: cx + (dx - cx) * d, y: cy + (dy - cy) * d, width, scale, height };
}
