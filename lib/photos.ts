export interface StoryPhoto {
  id: string;
  step: number; // 0: Cómo empezó, 1: El fuego, 2: Cómo se combatió
  src: string;
  caption: string;
  credit: string;
  license: string;
  sourceUrl?: string;
}

export const STORY_PHOTOS: Record<string, StoryPhoto[]> = {
  cordoba: [
    {
      id: 'cordoba-0',
      step: 0,
      src: '/img/stories/cordoba-0.jpg',
      caption: 'Ruta Provincial 17 hacia Ongamira y Los Terrones cercada por las llamas en el monte seco.',
      credit: 'Registro de prensa / Archivo documental',
      license: 'Cobertura periodística',
    },
    {
      id: 'cordoba-1',
      step: 1,
      src: '/img/stories/cordoba-1.jpg',
      caption: 'Frente de fuego de gran magnitud avanzando sobre las laderas de las Sierras de Córdoba.',
      credit: 'Registro de prensa / Archivo documental',
      license: 'Cobertura periodística',
    },
    {
      id: 'cordoba-2',
      step: 2,
      src: '/img/stories/cordoba-2.jpg',
      caption: 'Brigadistas forestales con mochilas y batefuegos operando sobre el pajonal serrano bajo denso humo.',
      credit: 'Brigadas Forestales de Córdoba / Archivo',
      license: 'Registro operativo',
    },
  ],
  delta: [
    {
      id: 'delta-0',
      step: 0,
      src: '/img/stories/delta-0.jpg',
      caption: 'Columnas de humo sobre los humedales del Delta del Río Paraná registradas desde el aire.',
      credit: 'Relevamiento aéreo / Archivo documental',
      license: 'Cobertura periodística',
    },
    {
      id: 'delta-1',
      step: 1,
      src: '/img/verified/delta-fuego.jpg',
      caption: 'Frente de fuego sobre los pastizales y humedales del Delta del Paraná durante el operativo de combate.',
      credit: 'Parques Nacionales / Min. de Ambiente y Desarrollo Sostenible',
      license: 'CC BY 4.0 (Wikimedia Commons)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Incendio_en_delta_del_paran%C3%A1_2020_-_Parques_Nacionales.jpg',
    },
    {
      id: 'delta-2',
      step: 2,
      src: '/img/stories/delta-2.jpg',
      caption: 'Relevamiento con dron de las islas calcinadas y el frente de humo avanzando hacia las ciudades.',
      credit: 'Registro documental de combate / Archivo',
      license: 'Cobertura periodística',
    },
  ],
  misiones: [
    {
      id: 'misiones-0',
      step: 0,
      src: '/img/stories/misiones-0.jpg',
      caption: 'Quemas perimetrales y desmonte en el límite rural de la Reserva de Biósfera Yabotí.',
      credit: 'Registro de prensa / Archivo documental',
      license: 'Cobertura periodística',
    },
    {
      id: 'misiones-1',
      step: 1,
      src: '/img/stories/misiones-1.jpg',
      caption: 'Fuego de copa en la selva: árboles de gran diámetro ardiendo por dentro en los lotes 8 y 9.',
      credit: 'Registro forestal / Archivo documental',
      license: 'Cobertura periodística',
    },
    {
      id: 'misiones-2',
      step: 2,
      src: '/img/stories/misiones-2.jpg',
      caption: 'Bomberos forestales en caminos de tierra colorada realizando guardia de cenizas tras el control del frente.',
      credit: 'Bomberos Forestales L. N. Alem / Misiones',
      license: 'Registro operativo',
    },
  ],
  corrientes: [
    {
      id: 'corrientes-0',
      step: 0,
      src: '/img/stories/corrientes-0.jpg',
      caption: 'Ejemplar de ciervo de los pantanos huyendo ante el avance de las llamas en los pastizales del Iberá.',
      credit: 'Registro documental / @Chaputoba',
      license: 'Registro testimonial',
    },
    {
      id: 'corrientes-1',
      step: 1,
      src: '/img/verified/corrientes-fuego.jpg',
      caption: 'Vista satelital de alta resolución (Landsat 9) de los focos de calor y cicatrices de fuego en torno a los Esteros del Iberá.',
      credit: 'Lauren Dauphin / NASA Earth Observatory & USGS',
      license: 'Dominio público (NASA/USGS)',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wildfires_Ravage_Corrientes_as_seen_by_Landsat_9.jpg',
    },
    {
      id: 'corrientes-2',
      step: 2,
      src: '/img/stories/corrientes-2.jpg',
      caption: 'Bombero con línea de manguera combatiendo el fuego que avanza sobre pastizales y esteros.',
      credit: 'Bomberos Voluntarios / Corrientes',
      license: 'Registro operativo',
    },
  ],
  mendoza: [
    {
      id: 'mendoza-0',
      step: 0,
      src: '/img/stories/mendoza-0.jpg',
      caption: 'Relevamiento aéreo de las quebradas de la precordillera mendocina cubiertas de humo.',
      credit: 'Gobierno de Mendoza / PPMF',
      license: 'Registro oficial',
    },
    {
      id: 'mendoza-1',
      step: 1,
      src: '/img/stories/mendoza-1.jpg',
      caption: 'El frente de fuego iluminando la noche en las laderas del piedemonte de El Challao.',
      credit: 'Prensa Mendoza / Archivo',
      license: 'Cobertura periodística',
    },
    {
      id: 'mendoza-2',
      step: 2,
      src: '/img/stories/mendoza-2.jpg',
      caption: 'Cardones y vegetación xerófila calcinados tras el paso del fuego en el piedemonte.',
      credit: 'Registro ambiental / Archivo',
      license: 'Cobertura periodística',
    },
  ],
  chubut: [
    {
      id: 'chubut-0',
      step: 0,
      src: '/img/stories/chubut-0.jpg',
      caption: 'El avance del fuego sobre el bosque nativo en las laderas cordilleranas, visto desde las chacras de Epuyén.',
      credit: 'Pobladores de Epuyén / Archivo documental',
      license: 'Registro testimonial',
    },
    {
      id: 'chubut-1',
      step: 1,
      src: '/img/stories/chubut-1.jpg',
      caption: 'Incendio forestal de copa de extrema violencia consumiendo bosque andino patagónico.',
      credit: 'Registro de brigada / Archivo',
      license: 'Cobertura periodística',
    },
    {
      id: 'chubut-2',
      step: 2,
      src: '/img/stories/chubut-2.jpg',
      caption: 'Autobomba y brigadistas del Servicio Provincial de Manejo del Fuego enfrentando el frente en la ruta.',
      credit: 'SPMF Chubut / Archivo',
      license: 'Registro operativo',
    },
  ],
};

export function getStoryPhoto(eventId: string, step: number): StoryPhoto | null {
  const list = STORY_PHOTOS[eventId];
  if (!list) return null;
  return list.find((p) => p.step === step) || list[0] || null;
}
