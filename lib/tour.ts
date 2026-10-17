import { EVENTS } from './events';
import { clamp, seg } from './fire';

/** The guided tour visits the six fires in geographic order, north to south (not chronological). */
const NORTH_TO_SOUTH = ['misiones', 'corrientes', 'cordoba', 'delta', 'mendoza', 'chubut'];

export const TOUR_EVENTS: any[] = NORTH_TO_SOUTH.map((id) => EVENTS.find((e) => e.id === id));

/*
 * Sections of the page, top to bottom. Heights are in viewport heights; the whole tour is a pure
 * function of the scroll position: the section that crosses the focal line and the local progress t.
 *   opening  0-8 %   clouds only, no text
 *   title    8-14 %  title pod on the left, centre and right clouds start to part
 *   reveal   14-22 % Argentina appears, then the provincial borders and the HUD
 *   stories  22-88 % six fires, north to south
 *   wide     88-93 % camera opens on the whole country
 *   epilogue 93-100 % clouds close completely, epilogue on top
 */
export type Kind = 'opening' | 'title' | 'reveal' | 'story' | 'wide' | 'epilogue';
export type Section = { id: string; kind: Kind; vh: number; story?: number };

export const SECTIONS: Section[] = [
  { id: 'sec-opening', kind: 'opening', vh: 130 },
  { id: 'sec-title', kind: 'title', vh: 95 },
  { id: 'sec-reveal', kind: 'reveal', vh: 125 },
  ...TOUR_EVENTS.map((ev, i): Section => ({ id: 'sec-' + ev.id, kind: 'story', vh: 180, story: i })),
  { id: 'sec-wide', kind: 'wide', vh: 85 },
  { id: 'sec-epilogue', kind: 'epilogue', vh: 160 },
];

/** Focal line, as a fraction of the viewport height. */
export const FOCAL = 0.45;

export type TourState = {
  /** Section index in SECTIONS and local progress inside it (0..1). */
  idx: number;
  t: number;
  /** 0 = clouds cover everything, 1 = clouds parted (only the left bank remains). */
  open: number;
  /** 0 = no closing, 1 = clouds closed over the whole viewport. */
  close: number;
  /** Opacity of the provincial borders and of the HUD. */
  borders: number;
  hud: number;
  /** Title pod visibility. */
  title: number;
  /** -1 = whole country before the tour, 0..5 = fire, 6 = wide shot (all fires visited). */
  chapter: number;
  /** Progress inside the fire (0..1); 1 outside the stories. */
  chapterT: number;
};

/**
 * Pure state for a focal position. `tops` and `heights` are the cached document offsets of SECTIONS.
 * With `reduced` (prefers-reduced-motion) the clouds and the title jump to still frames per stage.
 */
export function tourState(focal: number, tops: number[], heights: number[], reduced = false): TourState {
  let idx = 0;
  let t = 0;
  if (tops.length && focal >= tops[0]) {
    idx = tops.length - 1;
    t = 1;
    for (let i = 0; i < tops.length; i++) {
      if (focal < tops[i] + heights[i]) {
        idx = i;
        t = clamp((focal - tops[i]) / Math.max(1, heights[i]), 0, 1);
        break;
      }
    }
  }
  const sec = SECTIONS[idx];
  const st: TourState = { idx, t, open: 0, close: 0, borders: 0, hud: 0, title: 0, chapter: -1, chapterT: 1 };
  switch (sec.kind) {
    case 'opening':
      break;
    case 'title':
      st.title = seg(t, 0.05, 0.35);
      st.open = 0.45 * seg(t, 0.35, 1);
      break;
    case 'reveal':
      st.title = 1 - seg(t, 0.55, 0.85);
      st.open = 0.45 + 0.55 * seg(t, 0, 0.45);
      st.borders = seg(t, 0.45, 0.8);
      st.hud = seg(t, 0.7, 1);
      break;
    case 'story':
      st.open = 1; st.borders = 1; st.hud = 1;
      st.chapter = sec.story!;
      st.chapterT = t;
      break;
    case 'wide':
      st.open = 1; st.borders = 1; st.hud = 1;
      st.chapter = 6;
      break;
    case 'epilogue':
      st.open = 1; st.borders = 1; st.chapter = 6;
      st.close = seg(t, 0, 0.3);
      st.hud = 1 - st.close;
      break;
  }
  if (reduced) {
    st.title = st.title > 0 ? 1 : 0;
    st.open = st.open > 0.5 ? 1 : 0;
    st.close = st.close > 0 ? 1 : 0;
    st.borders = st.borders > 0 ? 1 : 0;
    st.hud = st.hud > 0 ? 1 : 0;
  }
  return st;
}

/** Overall progress through the tour (for the HUD bar). */
export function tourProgress(scrollY: number, tops: number[], heights: number[], vh: number): number {
  if (!tops.length) return 0;
  const end = tops[tops.length - 1] + heights[heights.length - 1] - vh;
  return clamp(scrollY / Math.max(1, end), 0, 1);
}

/** Who the cause text is attributed to (the source of each fire in EVENTS; EVENTS itself stays untouched). */
export const CAUSE_BY: Record<string, string> = {
  misiones: 'según Misiones Online',
  corrientes: 'según National Geographic',
  cordoba: 'según el informe oficial de la Provincia de Córdoba',
  delta: 'según La Capital',
  mendoza: 'según Los Andes y El Sol',
  chubut: 'según Infobae y Diario de Cuyo',
};

/*
 * Per-fire evidence for the technical sources section, copied from VERIFICACION.md (review of
 * 14/10/2026). `status` is the status that file records; nothing here was re-verified.
 */
export type Evidence = { what: string; quote: string; source: string; url: string; status: string };

const U = {
  cba: 'https://ambiente.cba.gov.ar/wp-content/uploads/2024/11/INFORME-INCENDIOS-2020-Provincia-de-Cordoba.pdf',
  lc: 'https://www.lacapital.com.ar/la-ciudad/con-el-2020-se-van-mas-300-mil-hectareas-incendiadas-el-delta-del-rio-parana-n2631286.html',
  mo: 'https://misionesonline.net/2020/11/27/yaboti-habria-340-hectareas-de-bosques-nativos-afectadas-por-el-incendio-en-el-lote-8-y-9-de-la-empresa-forestal-juan-alberto-sa/',
  ng: 'https://www.nationalgeographicla.com/medio-ambiente/2022/02/incendios-en-argentina-las-perdidas-sus-causas-y-la-destruccion-masiva-de-biodiversidad',
  la: 'https://www.losandes.com.ar/sociedad/luego-de-que-incendios-arrasaran-85000-hectareas-en-mendoza-aumentan-el-numero-de-brigadistas',
  es: 'https://www.elsol.com.ar/mendoza/confirman-que-el-incendio-en-el-pedemonte-fue-intencional-el-dano-ambiental-es-muy-grave/',
  ib: 'https://www.infobae.com/sociedad/2026/02/05/un-mes-de-los-incendios-en-chubut-la-cronologia-de-la-catastrofe-ambiental-que-ya-arraso-con-mas-de-50-mil-hectareas/',
  dc: 'https://www.diariodecuyo.com.ar/argentina/incendios-en-chubut-confirmaron-que-el-fuego-fue-intencional-y-hay-cientos-de-evacuados-1817717.html',
};

export const EVIDENCE: Record<string, Evidence[]> = {
  misiones: [
    { what: '340 ha (estimación de la empresa)', quote: 'Desde la empresa estiman que alrededor de 340 hectáreas …', source: 'Misiones Online (prensa)', url: U.mo, status: 'Verificado' },
    { what: 'Causa: quema ilegal, sin responsables identificados', quote: 'Ver la tabla de revisión de VERIFICACION.md', source: 'Misiones Online (prensa)', url: U.mo, status: 'Parcial' },
  ],
  corrientes: [
    { what: '934.238 ha al 21/2/2022 (INTA)', quote: 'alcanza ya las 934.238 hectáreas, lo que equivale al 11 por ciento', source: 'National Geographic (prensa)', url: U.ng, status: 'Verificado' },
    { what: 'Unas 632 mil ha (SNMF), cifra distinta', quote: 'unas 632 mil hectáreas quemadas aproximadamente', source: 'National Geographic (prensa)', url: U.ng, status: 'Verificado' },
    { what: 'Causa: La Niña; quemas para pastura', quote: 'Esta Niña ya lleva casi 24 meses; quemar para obtener pastura fresca', source: 'National Geographic (prensa)', url: U.ng, status: 'Verificado' },
  ],
  cordoba: [
    { what: '316.150 ha (16/5 al 22/11/2020)', quote: '316.150 has aproximadamente (del 16 de mayo al 22 de noviembre de 2020)', source: 'Secretaría de Ambiente de Córdoba (informe oficial, PDF)', url: U.cba, status: 'Verificado' },
    { what: '321.688 ha, registro acumulado, cifra distinta', quote: 'La superficie afectada a la fecha es de 321.688 hectáreas', source: 'Secretaría de Ambiente de Córdoba (informe oficial, PDF)', url: U.cba, status: 'Parcial' },
    { what: 'Causa: clima, combustible y factor antrópico', quote: 'el factor antrópico, como la imprudencia y la negligencia', source: 'Secretaría de Ambiente de Córdoba (informe oficial, PDF)', url: U.cba, status: 'Verificado' },
  ],
  delta: [
    { what: '328.000 ha (Ministerio de Ambiente de Santa Fe)', quote: 'fueron 328.000 las hectáreas destruidas por el fuego durante el año', source: 'La Capital (prensa)', url: U.lc, status: 'Verificado' },
    { what: '350.000 a 400.000 ha (Taller Ecologista, no oficial), cifra distinta', quote: 'el acumulado oscila entre 350.000 y 400.000', source: 'La Capital (prensa)', url: U.lc, status: 'Verificado' },
    { what: 'Causa: quemas, según organizaciones', quote: 'Es un verdadero desastre ambiental producido por las quemas', source: 'La Capital (prensa)', url: U.lc, status: 'Verificado' },
  ],
  mendoza: [
    { what: '6.000 ha en El Challao (28 y 29/10/2023)', quote: 'El 28 y 29 de ese mes se quemaron cerca de 6.000 hectáreas', source: 'Los Andes (prensa), datos del Plan Provincial de Manejo del Fuego', url: U.la, status: 'Verificado' },
    { what: 'Causa: provocado', quote: 'el foco inicial fue intencional', source: 'El Sol (prensa)', url: U.es, status: 'Verificado' },
  ],
  chubut: [
    { what: '45.000 ha (informe provincial del 3/2/2026)', quote: 'los incendios habían alcanzado las 45.000 hectáreas', source: 'Infobae (prensa)', url: U.ib, status: 'Verificado' },
    { what: 'Causa: intencional', quote: 'Ver la tabla de revisión de VERIFICACION.md', source: 'Diario de Cuyo (prensa)', url: U.dc, status: 'Parcial' },
  ],
};
