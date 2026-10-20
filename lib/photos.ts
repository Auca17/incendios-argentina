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
      src: '/fotos/delta-iss.webp',
      alt: 'Vista desde la Estación Espacial Internacional con columnas de humo sobre la llanura de inundación del río Paraná en junio de 2020.',
      credit: 'NASA / International Space Station (ISS063-E-40142)',
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
      src: '/fotos/chubut.webp',
      alt: 'Imagen satelital de Sentinel-2 sobre los incendios forestales en la cordillera de Chubut en enero de 2026.',
      credit: 'Contains modified Copernicus Sentinel data 2026, processed by the European Union',
      width: 1200,
      height: 848,
    },
  ],
};
