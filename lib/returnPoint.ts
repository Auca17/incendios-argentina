/** Scroll position the reader left from when jumping to #fuentes (null = came straight in). */
let point: number | null = null;

export const setReturnPoint = (y: number) => { point = y; };
export const takeReturnPoint = (): number | null => { const p = point; point = null; return p; };

/** Session key: the scroll position the reader left the story from for /explorar, to come back to it. */
export const RETURN_KEY = 'tour-return';
