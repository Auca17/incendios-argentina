'use client';
import { useEffect, useRef } from 'react';
import { subscribe } from '../lib/scrollDriver';
import SourcesLink from './SourcesLink';
import styles from './Epilogue.module.css';

/**
 * Epilogue, read on the closed clouds (the shader keeps a flat bright column behind it). It fades out
 * before the clouds turn to smoke. Figures come from the project's own processing of NASA FIRMS data
 * (public/data/meta.json and semanas-<id>.json).
 */
export default function Epilogue() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => subscribe(({ st }) => {
    if (ref.current) ref.current.style.opacity = st.epi.toFixed(3);
  }), []);

  return (
    <article ref={ref} className={styles.epi} aria-labelledby="epi-h">
      <h2 id="epi-h" className={styles.title}>Lo que queda en el mapa</h2>
      <p className={styles.summary}>
        De la selva misionera al bosque de Chubut, seis incendios entre 2020 y 2026. El satélite marcó dónde y cuándo
        hubo fuego; cuánto se perdió y por qué lo cuentan las fuentes, que no siempre coinciden.
      </p>

      <ul className={styles.figures}>
        <li>
          <b>400.892</b>
          <span>focos en 2020, el año con más focos</span>
        </li>
        <li>
          <b>200.741</b>
          <span>focos durante los seis incendios del recorrido</span>
        </li>
      </ul>
      <p className={styles.source}>NASA FIRMS, satélite VIIRS S-NPP.</p>

      <p className={styles.limits}>
        Un foco es un punto caliente visto desde el espacio: a veces un incendio, a veces una quema en el campo, a veces
        un error del satélite.
      </p>

      <div className={styles.actions}>
        <SourcesLink className={styles.primary} label="Ver las fuentes" />
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
