export type StoryPhoto = {
  src: string;
  alt: string;
  credit: string;
  licenseText?: string;
  licenseUrl?: string;
  width: number;
  height: number;
};

/**
 * Verified documentary photos for the guided tour stories.
 * Only events with verified open licenses (public domain, CC BY, CC BY-SA) have entries.
 * Stories without verified photos (misiones, cordoba, mendoza) are left out and render no photo slot.
 */
export const STORY_PHOTOS: Record<string, StoryPhoto[]> = {
  corrientes: [
    {
      src: '/fotos/corrientes.webp',
      alt: 'Imagen satelital de Landsat 9 sobre Corrientes en febrero de 2022, con columnas de humo y áreas quemadas en los Esteros del Iberá.',
      credit: 'NASA Earth Observatory / Lauren Dauphin / USGS Landsat',
      width: 1200,
      height: 1166,
    },
  ],
  delta: [
    {
      src: '/fotos/delta-brigada.webp',
      alt: 'Brigadista de Parques Nacionales de espaldas, con hacha, frente a las llamas que avanzan sobre el pajonal del Delta del Paraná en 2020.',
      credit: 'Foto: Ministerio de Ambiente de la Nación, bajo licencia ',
      licenseText: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      width: 1200,
      height: 800,
    },
    {
      src: '/fotos/delta-rosario.webp',
      alt: 'Densa cortina de humo sobre el río Paraná y las islas del humedal vista desde la costa de Rosario en julio de 2020.',
      credit: 'Foto: Yilku1, bajo licencia ',
      licenseText: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      width: 1200,
      height: 900,
    },
  ],
  chubut: [
    {
      src: '/fotos/chubut-patriada.webp',
      alt: 'Columna de humo del incendio desatado el 5 de enero de 2026 en Puerto Patriada, sobre la cordillera, vista desde la playa de un lago con bañistas, el 9 de enero de 2026.',
      credit: 'Foto: Gioia Claro, bajo licencia ',
      licenseText: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      width: 1200,
      height: 900,
    },
    {
      src: '/fotos/chubut-epuyen.webp',
      alt: 'Atardecer anaranjado por el humo del incendio de interfase en la zona de Puerto Patriada, sobre el lago y el bosque, en enero de 2026.',
      credit: 'Foto: CatrielGB, bajo licencia ',
      licenseText: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      width: 1200,
      height: 800,
    },
  ],
};
