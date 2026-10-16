import meta from '../lib/meta';
import { fmt } from '../lib/fire';
import { totalYear } from '../lib/explore';
import { YearBars } from './Charts';
import styles from './Prose.module.css';

const SOURCES = [
  { t: 'NASA FIRMS (VIIRS S-NPP)', u: 'https://firms.modaps.eosdis.nasa.gov/' },
  { t: 'National Geographic: incendios en Argentina', u: 'https://www.nationalgeographicla.com/medio-ambiente/2022/02/incendios-en-argentina-las-perdidas-sus-causas-y-la-destruccion-masiva-de-biodiversidad' },
];

type Props = {
  year: number | null;
  onPickYear: (y: number) => void;
  onStart?: () => void;
  /** Explore controls, rendered between the intro and the year bars on small screens. */
  children?: React.ReactNode;
};

/** Intro screen text (legacy 'intro' slide). The controls and the ranking live in ExplorePanel. */
export default function HomeSidebar({ year, onPickYear, onStart, children }: Props) {
  return (
    <div className={styles.text}>
      <p className={styles.kicker}>Argentina · 2012–2026</p>
      <h2 className={styles.title}>Lo que el fuego se llevó</h2>
      <p className={styles.lead}>
        Seis historias. Entre 2012 y 2026, un satélite de la NASA detectó <b>{fmt(meta.total_focos)} focos de calor</b> dentro
        del territorio argentino. Cada punto del mapa es uno de ellos.
      </p>
      {onStart && (
        <div className={styles.tourPromptBox}>
          <button type="button" className={styles.tourPromptBtn} onClick={onStart}>
            <span className={styles.tourPromptLabel}>Recorrido guiado</span>
            <span className={styles.tourPromptTarget}>
              <b>Capítulo 1: Chubut 2015</b>
              <span className={styles.tourPromptArrow} aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      )}
      <p>Elegí un año con el reproductor, o avanzá con <b>→</b> para ver seis incendios con sus cifras, sus causas y lo que dicen las fuentes.</p>
      {children && <div className={styles.slot}>{children}</div>}
      <h3 className={styles.h}>Focos de calor por año</h3>
      <YearBars meta={meta} year={year} onPick={onPickYear} />
      <p className={styles.note}>
        2020 fue el año con más focos: {fmt(totalYear(meta, 2020))}. Le sigue 2022, con {fmt(totalYear(meta, 2022))}.
      </p>
      <ul className={styles.facts}>
        <li><b>1,15 M ha</b><span>quemadas en el país en 2020 (0,29 % del territorio), según National Geographic. El 57 % fue monte nativo de Córdoba y el Delta del Paraná.</span></li>
        <li><b>258.794 ha</b><span>entre el 1 de enero y el 15 de febrero de 2022, según el Servicio Nacional de Manejo del Fuego: más que en todo 2021.</span></li>
      </ul>
      <details className={styles.sources}>
        <summary>Fuentes de esta pantalla</summary>
        <ul>
          {SOURCES.map((s) => (
            <li key={s.u}><a href={s.u} target="_blank" rel="noopener noreferrer">{s.t}</a></li>
          ))}
        </ul>
      </details>
    </div>
  );
}
