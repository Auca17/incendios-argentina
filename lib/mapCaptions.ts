/*
 * Captions over the map of some stories, as film subtitles synced to the scroll (chapterT): what
 * advances on the map and what the camera does. Every figure comes from the weekly series
 * (public/data/semanas-<id>.json), checked when written:
 *  - Corrientes: the week of 12-18 February 2022 has the most foci (8,261); from the week of 26
 *    February on, under a thousand a week (748, 309, ...).
 *  - Córdoba: the 0.25-degree zone with the most detections each week lies in the north of the sierras
 *    in mid August 2020 (30.6 S); in the week of 25 September to 1 October, the one with the most
 *    (4,093), two zones burn almost even, at 31.1 S and 32.9 S (760 and 761 detections).
 */
export type MapCaption = { from: number; to: number; text: string };

export const MAP_CAPTIONS: Record<string, MapCaption[]> = {
  corrientes: [
    { from: 0.18, to: 0.56, text: 'Cada semana suma sus focos al mapa: donde se acumulan, las marcas crecen y pasan del amarillo al rojo.' },
    { from: 0.6, to: 0.86, text: 'La peor semana terminó el 18 de febrero, con 8.261 focos. Desde fines de febrero, los focos semanales bajan de mil.' },
  ],
  cordoba: [
    { from: 0.22, to: 0.52, text: 'Cada semana suma sus focos. A mediados de agosto se concentraban al norte de las sierras, en Cruz del Eje.' },
    { from: 0.56, to: 0.86, text: 'En la peor semana, que terminó el 1 de octubre con 4.093 focos, ardían a la vez el centro y el sur de las sierras.' },
  ],
};

export function mapCaption(id: string, u: number): string {
  return MAP_CAPTIONS[id]?.find((c) => u >= c.from && u < c.to)?.text ?? '';
}
