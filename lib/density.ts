/*
 * The detections of a story as cells (lib/data semanas-<id>.json: 0.05-degree cells, about 5 km). Each
 * cell with detections is drawn as one dot at its centre, coloured from yellow to red and sized by the
 * sum of its detections up to the shown week, on one absolute scale for every region: a cell with 30
 * detections looks the same in Misiones and in the Delta. Colour and size say how many detections;
 * never an area, a temperature or a front. The largest dot covers 58 % of its cell's width: land
 * always shows between them.
 */

/** The classes of the sum of detections of a cell: [from, to, label]. */
export const CELL_CLASSES: [number, number, string][] = [[1, 1, '1'], [2, 5, '2–5'], [6, 20, '6–20'], [21, 80, '21–80'], [81, Infinity, '81 o más']];
export const cellClass = (n: number) => (n <= 1 ? 0 : n <= 5 ? 1 : n <= 20 ? 2 : n <= 80 ? 3 : 4);
/** The dot's diameter, as a share of the cell's side on screen, per class (its area about doubles a class). */
export const DOT_D = [0.2, 0.3, 0.44, 0.6, 0.78];
/** Never smaller than this when the camera is far (px): a lone detection stays a visible grain. */
export const dotMin = (c: number) => 1.5 + 0.6 * c;
/** The dot's colour per class: yellow (few detections), orange, red (many). */
export const DOT_FILL = ['#ffe28f', '#ffc53d', '#ff8f2a', '#f0522b', '#d8222b'];
export const DOT_ALPHA = [0.9, 0.95, 1, 1, 1];
/** Words for each class, for the tooltip and the legend. */
export const CLASS_WORD = ['muy baja', 'baja', 'media', 'alta', 'muy alta'];
/**
 * A soft warm halo around the upper classes (radius as a multiple of the dot's, and its opacity), so
 * the strongest cells read at a glance even when the camera is far. It marks density, not an area.
 */
export const DOT_HALO: [number, number][] = [[0, 0], [0, 0], [0, 0], [2.2, 0.16], [2.6, 0.24]];
/**
 * The most of its cell each class's dot may light: a dot covering more of it (far away, when the cells
 * are a few pixels) dims in proportion, so crowded cells read as a grain and never as a lit surface.
 * It grows with the class, so far away the classes keep their order. Close up every dot is under it.
 */
export const DOT_COVER = [0.4, 0.5, 0.6, 0.7, 0.8];
/**
 * A soft dark ground under the dots from class 2 up (two discs, wider and fainter): it sets them off
 * sunlit slopes. Class 1 has none, so the lone detections stay a fine point.
 */
export const DOT_SHADE: [number, number][] = [[1.6, 0.22], [0.8, 0.32]];
export const DOT_SHADE_FROM = 1;
/*
 * Far away (a 5-km cell under a few pixels on screen) each dot would be a speck and together they
 * would read as a halftone: the cells are summed into zones of 0.25 degrees (about 27 km, 5 x 5 cells)
 * and each zone carries one dot. The zone keeps the same five classes, applied to its mean per cell:
 * the real sum of its cells divided by the 25 cells it holds (cells with no detection count as 0). It
 * says how dense the detections were around there, never how much burned; nothing is lost or counted
 * twice (the zones add up exactly to their cells).
 */
export const ZONE_DEG = 0.25;
export const ZONE_CELLS = 25;
export const zoneClass = (sum: number) => cellClass(sum / ZONE_CELLS);
/** The zone dot's diameter as a share of the zone's side on screen, per class: sober, land shows between. */
export const ZONE_D = [0.14, 0.2, 0.3, 0.42, 0.56];
export const zoneMin = (c: number) => 1.6 + 0.7 * c;
export const ZONE_ALPHA = [0.38, 0.5, 0.76, 0.9, 1];
export const ZONE_SHADE_FROM = 2;
/**
 * The hand-over between cells and zones, by the cell's size on screen (px): each zone switches at its
 * own scale within this range, the zones nearest the centre of the map first, with a short local
 * fade; so each place shows one representation, never the two superimposed.
 */
export const HANDOVER: [number, number] = [4.5, 6.5];
export const HANDOVER_FADE = 0.35;
/** The stories drawn as cells: all six, on the same scale and the same hand-over. */
export const CELL_STORIES = new Set(['misiones', 'corrientes', 'cordoba', 'delta', 'mendoza', 'chubut']);
