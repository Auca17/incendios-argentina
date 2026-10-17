'use client';
import SourcesLink from './SourcesLink';
import styles from './Epilogue.module.css';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Epilogue, read over the closed clouds on an opaque panel. Figures come from the project's own
 * processing of NASA FIRMS data (public/data/meta.json and semanas-<id>.json).
 */
export default function Epilogue() {
  return (
    <article className={styles.epi} aria-labelledby="epi-h">
      <h2 id="epi-h" className={styles.title}>Lo que queda en el mapa</h2>
      <p className={styles.summary}>
        La recorrida bajó de Misiones a Chubut por seis incendios ocurridos entre 2020 y 2026. En cada uno, el
        mapa mostró semana a semana los focos de calor que detectó el satélite, y el texto, la superficie y la
        causa según las fuentes citadas. Esas cifras vienen de organismos públicos, de una empresa y de la
        prensa; en tres casos las fuentes no coinciden y se muestran las dos.
      </p>

      <ul className={styles.figures}>
        <li>
          <b>2.620.568</b>
          <span>focos de calor en Argentina entre el 20/01/2012 y el 14/10/2026</span>
        </li>
        <li>
          <b>400.892</b>
          <span>focos en 2020, el año con más focos de la serie</span>
        </li>
        <li>
          <b>200.741</b>
          <span>focos en las ventanas de los seis incendios del recorrido</span>
        </li>
      </ul>
      <p className={styles.source}>Fuente: NASA FIRMS, VIIRS S-NPP. Procesamiento propio.</p>

      <p className={styles.limits}>
        Un foco de calor no es una hectárea quemada ni un incendio forestal: incluye quemas agrícolas y puede
        ser un falso positivo.
      </p>

      <div className={styles.actions}>
        <SourcesLink className={styles.primary} label="Fuentes técnicas" />
        <a className={styles.secondary} href={BASE + '/explorar/#0'}>Explorar los datos</a>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          }}
        >
          Volver al inicio
        </button>
      </div>
    </article>
  );
}
