/*
 * Where the boxes over the map may sit without covering its data. The map (components/TourMap.tsx)
 * publishes the marks of the active story as it draws them (centre and radius, in viewport px); a box
 * asks how many marks a candidate place would cover and takes the clearest one. A box that is already
 * placed moves only when its place gets clearly worse than another (it never hops for one mark).
 */
export type Box = { left: number; top: number; width: number; height: number };
type Mark = { x: number; y: number; r: number };

let marks: Mark[] = [];
let version = 0;

/** The map's marks of the active story, in viewport px (the map's own frame is offset by `dx`, `dy`). */
export function publishMarks(list: Mark[], dx = 0, dy = 0) {
  marks = dx || dy ? list.map((m) => ({ x: m.x + dx, y: m.y + dy, r: m.r })) : list;
  version++;
}

/** Bumps whenever the marks change (to recompute a placement only then). */
export const marksVersion = () => version;

/** How many marks a box would cover (with a margin around it). */
export function covered(b: Box, margin = 8): number {
  let n = 0;
  const l = b.left - margin, t = b.top - margin, r = b.left + b.width + margin, btm = b.top + b.height + margin;
  for (const m of marks) if (m.x + m.r > l && m.x - m.r < r && m.y + m.r > t && m.y - m.r < btm) n++;
  return n;
}

/**
 * The clearest of `options` (earlier ones win ties). With `current`, it stays unless another place
 * covers less than half as many marks and at least 3 fewer.
 */
export function clearest<K extends string>(options: [K, Box][], current?: K, self?: string): K {
  const scored = options.map(([k, b]) => [k, coveredOrBlocked(b, self)] as const);
  let best = scored[0];
  for (const s of scored) if (s[1] < best[1]) best = s;
  const now = current !== undefined ? scored.find((s) => s[0] === current) : undefined;
  if (now && !(best[1] < now[1] / 2 && now[1] - best[1] >= 3)) return now[0];
  return best[0];
}

/* boxes already placed (the figures panel): the captions keep clear of them as of a crowd of marks */
const blockers = new Map<string, Box>();
export function block(id: string, b: Box | null) {
  const o = blockers.get(id);
  if (b ? o && o.left === b.left && o.top === b.top && o.width === b.width && o.height === b.height : !o) return;
  if (b) blockers.set(id, b); else blockers.delete(id);
  version++;
}
const overlaps = (a: Box, b: Box) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
/** Like covered(), counting a placed box under it as 1000 marks. */
export function coveredOrBlocked(b: Box, self?: string): number {
  let n = covered(b);
  blockers.forEach((o, id) => { if (id !== self && overlaps(b, o)) n += 1000; });
  return n;
}
