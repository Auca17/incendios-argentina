import { seg } from './fire';

/*
 * The cinematic opening of Chubut: an illustrated Andean forest on fire, drawn live by a shader
 * (components/CineFire.tsx), before the map takes over. It is a pure function of the story's
 * progress u, like the rest of the tour, and it is labelled on the page as an illustration: it is
 * not an image of Epuyén and it carries no data.
 *   0.00-0.03  the scene comes in from the dark of the previous transition
 *   0.03-0.15  the camera pushes into the forest; the fire builds up
 *   0.13-0.17  the peak: the fire at its most intense, smoke filling the frame
 *   0.15-0.22  the camera climbs above the smoke, which opens in holes (like the clouds of the
 *              opening) and reveals the map of Epuyén with the satellite detections
 * The rest of the story (the chronology, the air drop) runs over the remaining part of u.
 */
export const CINE_END = 0.22;

export type Cine = {
  /** The scene is drawn at all. */
  on: boolean;
  /** Fade in from the dark (0..1). */
  enter: number;
  /** Camera push into the forest (0..1). */
  push: number;
  /** Fire intensity (0..1). */
  heat: number;
  /** Camera rising above the smoke (0..1). */
  rise: number;
  /** The smoke opening onto the map (0 = closed, 1 = gone). */
  reveal: number;
};

const smooth = (x: number) => x * x * (3 - 2 * x);

export function cineState(u: number, reduced = false): Cine {
  const enter = smooth(seg(u, 0, 0.03));
  const push = reduced ? 0.5 : smooth(seg(u, 0.03, 0.17));
  const heat = 0.35 + 0.65 * smooth(seg(u, 0.03, 0.15));
  const rise = reduced ? 0 : smooth(seg(u, 0.15, 0.22));
  const reveal = smooth(seg(u, 0.16, 0.22));
  return { on: u < CINE_END && enter > 0, enter, push, heat, rise, reveal };
}

/** Story progress after the cinematic opening, 0..1 over the rest of the section. */
export const afterCine = (u: number) => seg(u, CINE_END, 1);
